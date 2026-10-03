// Push notifications (Firebase Cloud Messaging) for bills, budgets and loans.
import { $, lsGet, lsSet, toast } from "./util.js";
import { ctx, uRef } from "./store.js";

const VAPID = "BKlq7-ZZbLXO79EqXjx4uhSmrCefE6Aewl4Xy_yiwQFQ3-f1fUCOvsiUZNPU51i5WRtwpvwDiIWrTWwmISsRL48";
const sdkUrl = name => "https://www.gstatic.com/firebasejs/" + ctx.sdk + "/firebase-" + name + ".js";
let msgMod = null, fnMod = null;
const loadMsg = async () => msgMod || (msgMod = await import(sdkUrl("messaging")));
const loadFns = async () => fnMod || (fnMod = await import(sdkUrl("functions")));
export async function callFn(name, data) {
  const m = await loadFns();
  return (await m.httpsCallable(m.getFunctions(ctx.app, "asia-south1"), name, { timeout: 120000 })(data || {})).data;
}
export const serverMissing = e => /not-found|internal|unavailable/.test(String(e && e.code));

async function registerPush(ask) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) throw { msg: "This browser can't show notifications." };
  const m = await loadMsg();
  if (!(await m.isSupported())) throw { msg: "Notifications aren't supported here. On an iPhone, add Pocket Ledger to your home screen first, then turn them on from there." };
  const perm = ask ? await Notification.requestPermission() : Notification.permission;
  if (perm !== "granted") throw { msg: perm === "denied" ? "Notifications are blocked for Pocket Ledger. Allow them in your phone's settings for this app, then try again." : "Notifications weren't allowed." };
  const reg = await navigator.serviceWorker.ready;
  const token = await m.getToken(m.getMessaging(ctx.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  if (!token) throw { msg: "Couldn't register this device." };
  const old = lsGet("pl-push-token");
  if (old !== token) {
    await ctx.F.setDoc(uRef(), { tokens: ctx.F.arrayUnion(token) }, { merge: true });
    if (old) { try { await ctx.F.updateDoc(uRef(), { tokens: ctx.F.arrayRemove(old) }); } catch {} }
    lsSet("pl-push-token", token);
  }
  m.onMessage(m.getMessaging(ctx.app), p => { const n = p.notification || {}; toast((n.title ? n.title + ": " : "") + (n.body || "")); });
  return token;
}
// keep this device's token fresh (they change from time to time)
export function refreshPush() { if ("Notification" in window && Notification.permission === "granted" && lsGet("pl-push-token")) registerPush(false).catch(() => {}); }

export async function renderSettings() {
  const on = "Notification" in window && Notification.permission === "granted" && !!lsGet("pl-push-token");
  $("ntState").textContent = on ? "On for this device. You'll get the ones ticked below, even when the app is closed." : ("Notification" in window && Notification.permission === "denied") ? "Blocked for this app in your phone's settings." : "Off on this device.";
  $("ntOn").hidden = on; $("ntTest").hidden = !on; $("ntOff").hidden = !on;
  try {
    const s = await ctx.F.getDoc(uRef()); const p = Object.assign({ bills: true, budgets: true, loans: true, transfers: true }, (s.exists() && s.data().notify) || {});
    $("ntBills").checked = p.bills; $("ntBudgets").checked = p.budgets; $("ntLoans").checked = p.loans; $("ntXfer").checked = p.transfers;
  } catch {}
}
export function initSettings() {
  $("ntOn").addEventListener("click", async () => {
    $("ntOn").disabled = true;
    try { await registerPush(true); toast("Notifications are on"); }
    catch (e) { toast((e && e.msg) || "Couldn't turn notifications on. Try again."); }
    $("ntOn").disabled = false; renderSettings();
  });
  $("ntOff").addEventListener("click", async () => {
    const t = lsGet("pl-push-token");
    if (t) { try { await ctx.F.updateDoc(uRef(), { tokens: ctx.F.arrayRemove(t) }); } catch {} }
    lsSet("pl-push-token", ""); toast("Notifications are off on this device"); renderSettings();
  });
  $("ntTest").addEventListener("click", async () => {
    $("ntTest").disabled = true;
    try { await callFn("testPush"); toast("Test sent. It should arrive in a few seconds."); }
    catch (e) { toast(serverMissing(e) ? "The notification server isn't set up yet." : (e && e.message) || "Couldn't send a test."); }
    $("ntTest").disabled = false;
  });
  ["ntBills", "ntBudgets", "ntLoans", "ntXfer"].forEach(id => $(id).addEventListener("change", () => {
    ctx.F.setDoc(uRef(), { notify: { bills: $("ntBills").checked, budgets: $("ntBudgets").checked, loans: $("ntLoans").checked, transfers: $("ntXfer").checked } }, { merge: true }).catch(() => toast("Couldn't save that. Check your connection."));
  }));
}
