// Pocket Ledger: sign-in, household set-up and connection to Firebase.
// The money screens live in index.html (window.PL); this file gets the
// signed-in person and their household, then hands over to PL.boot().
import { firebaseConfig } from "./config.js";

const SDK = "12.19.0";
const $ = id => document.getElementById(id);
const VIEWS = ["gLoading", "gSignin", "gSetup", "gConfig"];
function showGate(view) {
  $("gate").hidden = false;
  VIEWS.forEach(v => $(v).hidden = v !== view);
}
function gateMsg(id, text) { const el = $(id); el.textContent = text || ""; el.hidden = !text; }
function busy(btn, on, label) { btn.disabled = on; if (label) { if (on) { btn.dataset.l = btn.textContent; btn.textContent = label; } else if (btn.dataset.l) btn.textContent = btn.dataset.l; } }

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

const AUTH_MSG = {
  "auth/invalid-credential": "That email and password don't match. Check them, or create an account if you're new.",
  "auth/wrong-password": "That password isn't right for this email.",
  "auth/user-not-found": "There's no account with that email yet. Use Create account.",
  "auth/email-already-in-use": "There's already an account with that email. Use Sign in instead.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/missing-password": "Enter your password.",
  "auth/network-request-failed": "You seem to be offline. Connect to the internet to sign in.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again."
};
const authErr = e => AUTH_MSG[e && e.code] || "Something went wrong. Check your connection and try again.";

async function main() {
  if (!firebaseConfig || !firebaseConfig.apiKey) { showGate("gConfig"); return; }
  showGate("gLoading");
  let A, F, initializeApp;
  try {
    const mods = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`)
    ]);
    initializeApp = mods[0].initializeApp; A = mods[1]; F = mods[2];
  } catch {
    $("gLoadingMsg").textContent = "Pocket Ledger needs the internet the very first time it opens. Connect and reopen it.";
    return;
  }
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch { db = F.getFirestore(app); }

  // ---- sign in / create account ----
  const email = () => $("gEmail").value.trim(), pass = () => $("gPass").value;
  $("gSigninForm").addEventListener("submit", async ev => {
    ev.preventDefault(); gateMsg("gErr", ""); gateMsg("gOk", "");
    const b = $("gSigninBtn"); busy(b, true, "Signing in…");
    try { await A.signInWithEmailAndPassword(auth, email(), pass()); }
    catch (e) { gateMsg("gErr", authErr(e)); }
    busy(b, false);
  });
  $("gCreateBtn").addEventListener("click", async () => {
    gateMsg("gErr", ""); gateMsg("gOk", "");
    if (!email()) return gateMsg("gErr", "Enter your email first.");
    const b = $("gCreateBtn"); busy(b, true, "Creating…");
    try { await A.createUserWithEmailAndPassword(auth, email(), pass()); }
    catch (e) { gateMsg("gErr", authErr(e)); }
    busy(b, false);
  });
  $("gForgot").addEventListener("click", async () => {
    gateMsg("gErr", ""); gateMsg("gOk", "");
    if (!email()) return gateMsg("gErr", "Type your email above, then tap Forgot password again.");
    try { await A.sendPasswordResetEmail(auth, email()); gateMsg("gOk", "Check your inbox for a link to set a new password."); }
    catch (e) { gateMsg("gErr", authErr(e)); }
  });

  // ---- household set-up ----
  const joinCode = new URLSearchParams(location.search).get("join") || "";
  if (joinCode) $("gJoinCode").value = joinCode;

  async function findHousehold(user) {
    const key = "pl-hh-" + user.uid;
    const ref = F.doc(db, "users", user.uid);
    let snap = null;
    try { snap = await F.getDoc(ref); } catch { try { snap = await F.getDocFromCache(ref); } catch {} }
    let hid = snap && snap.exists() ? snap.data().household : null;
    if (!hid) { try { hid = localStorage.getItem(key); } catch {} }
    if (hid) { try { localStorage.setItem(key, hid); } catch {} }
    return hid || null;
  }
  async function linkUser(user, hid) {
    await F.setDoc(F.doc(db, "users", user.uid), { household: hid, email: user.email || "" });
    try { localStorage.setItem("pl-hh-" + user.uid, hid); } catch {}
  }

  $("gCreateHH").addEventListener("click", async () => {
    gateMsg("gSetupErr", "");
    const user = auth.currentUser; if (!user) return;
    const n1 = $("gName1").value.trim() || "Me", n2 = $("gName2").value.trim() || "My wife";
    const b = $("gCreateHH"); busy(b, true, "Setting up…");
    try {
      const ref = F.doc(F.collection(db, "households"));
      await F.setDoc(ref, {
        members: [user.uid],
        personOf: { [user.uid]: "p1" },
        created: Date.now(),
        joinUntil: Date.now() + 7 * 864e5,
        settings: { currency: "MVR", opening: 0, openingBy: { p1: 0, p2: 0 }, people: [{ id: "p1", name: n1 }, { id: "p2", name: n2 }] }
      });
      await linkUser(user, ref.id);
      start(user, ref.id);
    } catch { gateMsg("gSetupErr", "Couldn't create the household. Check your connection and try again."); busy(b, false); }
  });
  $("gJoinHH").addEventListener("click", async () => {
    gateMsg("gSetupErr", "");
    const user = auth.currentUser; if (!user) return;
    let code = $("gJoinCode").value.trim();
    const m = code.match(/join=([A-Za-z0-9]+)/); if (m) code = m[1];
    if (!/^[A-Za-z0-9]{10,40}$/.test(code)) return gateMsg("gSetupErr", "That code doesn't look right. Copy the whole code or link from your partner's Settings.");
    const b = $("gJoinHH"); busy(b, true, "Joining…");
    try {
      const ref = F.doc(db, "households", code);
      await F.updateDoc(ref, { members: F.arrayUnion(user.uid), ["personOf." + user.uid]: "p2" });
      await linkUser(user, code);
      if (joinCode) history.replaceState(null, "", location.pathname);
      start(user, code);
    } catch (e) {
      gateMsg("gSetupErr", e && e.code === "not-found" ? "No household has that code. Check it with your partner." :
        e && e.code === "permission-denied" ? "This invite link has expired or the household is full. Ask your partner to tap Open invitations in Settings, then try again." :
        "Couldn't join. Check your connection and try again.");
      busy(b, false);
    }
  });
  $("gSignout").addEventListener("click", () => A.signOut(auth));

  // ---- start the money screens ----
  let started = false;
  function start(user, hid) {
    if (started) return; started = true;
    $("gate").hidden = true;
    window.PL.boot({
      F, db, hid, user,
      signOut: async () => { await A.signOut(auth); location.reload(); }
    });
  }

  A.onAuthStateChanged(auth, async user => {
    if (started) { if (!user) location.reload(); return; }
    if (!user) { showGate("gSignin"); return; }
    showGate("gLoading");
    const hid = await findHousehold(user);
    if (hid) start(user, hid);
    else { $("gWho").textContent = user.email || ""; showGate("gSetup"); if (joinCode) $("gJoinCode").focus(); }
  });
}

main();
