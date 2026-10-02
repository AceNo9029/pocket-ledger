// Pocket Ledger server functions (Firebase, pay-as-you-go plan).
//  - dailyAlerts: every morning, sends bill / budget / loan notifications.
//  - gemini:      runs Gemini for signed-in household members, so the key never reaches phones.
//  - testPush:    sends a test notification to the caller's devices.
"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { computeAlerts, recipientsFor, localToday, shiftMonth } = require("./alerts");

initializeApp();
setGlobalOptions({ region: "asia-south1", maxInstances: 5 });
const db = getFirestore();
const GEMINI_KEY = defineSecret("GEMINI_KEY");

const APP_URL = "https://smilin-assassin.github.io/pocket-ledger/";
const ICON = APP_URL + "icons/icon-192.png";
const MODEL_CHAIN = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
const DAILY_AI_LIMIT = 300; // Gemini calls per person per day

// ---------- notifications ----------
async function sendTo(uids, title, body, kind) {
  let sent = 0;
  for (const uid of [...new Set(uids)]) {
    const ref = db.doc("users/" + uid);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const u = snap.data();
    const prefs = Object.assign({ bills: true, budgets: true, loans: true }, u.notify || {});
    if (kind && prefs[kind] === false) continue;
    const tokens = (u.tokens || []).filter(Boolean);
    if (!tokens.length) continue;
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { notification: { icon: ICON, badge: ICON, tag: kind || "pocket-ledger" }, fcmOptions: { link: APP_URL } },
      data: { kind: kind || "", url: APP_URL }
    });
    const dead = [];
    res.responses.forEach((r, i) => {
      if (r.success) sent++;
      else if (r.error && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(r.error.code || "")) dead.push(tokens[i]);
    });
    if (dead.length) await ref.update({ tokens: FieldValue.arrayRemove(...dead) });
  }
  return sent;
}

exports.dailyAlerts = onSchedule({ schedule: "every day 08:30", timeZone: "Indian/Maldives" }, async () => {
  const today = localToday(new Date(), 5);
  const since = shiftMonth(today.slice(0, 7), -2) + "-01";
  const hhs = await db.collection("households").get();
  for (const doc of hhs.docs) {
    try {
      const hh = doc.data();
      const [entries, recurring, loans] = await Promise.all([
        doc.ref.collection("entries").where("date", ">=", since).get(),
        doc.ref.collection("recurring").get(),
        doc.ref.collection("loans").get()
      ]);
      const toArr = q => q.docs.map(d => Object.assign({ id: d.id }, d.data()));
      const { alerts, state } = computeAlerts(hh, { entries: toArr(entries), recurring: toArr(recurring), loans: toArr(loans) }, today);
      for (const a of alerts) await sendTo(recipientsFor(a, hh), a.title, a.body, a.kind);
      await doc.ref.update({ alertState: state });
      if (alerts.length) logger.info("household " + doc.id + ": " + alerts.length + " alert(s)");
    } catch (err) {
      logger.error("alerts failed for " + doc.id, err);
    }
  }
});

exports.testPush = onCall(async req => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const n = await sendTo([req.auth.uid], "Pocket Ledger", "Notifications are working on this device.", null);
  if (!n) throw new HttpsError("failed-precondition", "No device is registered for notifications yet.");
  return { sent: n };
});

// ---------- Gemini, with the key kept on the server ----------
exports.gemini = onCall({ secrets: [GEMINI_KEY], timeoutSeconds: 120, memory: "512MiB" }, async req => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const uid = req.auth.uid;
  const user = await db.doc("users/" + uid).get();
  const u = user.exists ? user.data() : {};
  const hid = u.personal || u.household;
  if (!hid) throw new HttpsError("permission-denied", "Finish setting up Pocket Ledger first.");
  const hh = await db.doc("households/" + hid).get();
  if (!hh.exists || !(hh.data().members || []).includes(uid)) throw new HttpsError("permission-denied", "Not set up for Pocket Ledger.");
  if (req.data && req.data.ping) return { ok: true };

  // simple daily limit per person
  const day = localToday(new Date(), 5);
  const usage = db.doc("aiUsage/" + uid + "_" + day);
  const used = await db.runTransaction(async t => {
    const s = await t.get(usage); const n = (s.exists ? s.data().n : 0) + 1;
    t.set(usage, { n, uid, day, hid }, { merge: true }); return n;
  });
  if (used > DAILY_AI_LIMIT) throw new HttpsError("resource-exhausted", "Daily Gemini limit reached. It resets tomorrow.");

  const { contents, generationConfig, model } = req.data || {};
  if (!Array.isArray(contents) || !contents.length) throw new HttpsError("invalid-argument", "Nothing to send.");
  const body = JSON.stringify({ contents, generationConfig: generationConfig || {} });
  const chain = model ? [String(model)] : MODEL_CHAIN;
  let status = 0, msg = "";
  for (const m of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(m) + ":generateContent", {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY.value() }, body });
      if (r.ok) {
        const j = await r.json(); const cand = (j.candidates || [])[0];
        const text = cand && cand.content ? (cand.content.parts || []).filter(p => !p.thought).map(p => p.text || "").join("") : "";
        if (!text) throw new HttpsError("internal", j.promptFeedback && j.promptFeedback.blockReason ? "refused" : "Empty answer");
        return { text, model: m };
      }
      status = r.status; msg = ""; try { msg = ((await r.json()).error || {}).message || ""; } catch (e) {}
      if ((status === 503 || status === 500) && attempt === 0) { await new Promise(res => setTimeout(res, 1500)); continue; }
      break;
    }
    const noQuota = status === 429 && /limit:\s*0\b|free_tier/i.test(msg);
    if (!(status === 404 || status >= 500 || noQuota || (status === 400 && /not found|not supported|unsupported|model/i.test(msg) && !/api.?key/i.test(msg)))) break;
  }
  logger.warn("gemini failed", { status, msg });
  if (status === 429) throw new HttpsError("resource-exhausted", msg || "Gemini is busy. Try again in a minute.");
  if (status === 400 && /api.?key/i.test(msg)) throw new HttpsError("failed-precondition", "The server's Gemini key isn't valid.");
  throw new HttpsError("unavailable", "HTTP " + status + ": " + msg);
});
