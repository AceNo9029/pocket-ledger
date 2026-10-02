
  // ======================================================================
  // Server features (pay-as-you-go): push notifications + secure Gemini.
  // ======================================================================
  const VAPID = "BKlq7-ZZbLXO79EqXjx4uhSmrCefE6Aewl4Xy_yiwQFQ3-f1fUCOvsiUZNPU51i5WRtwpvwDiIWrTWwmISsRL48";
  const sdkUrl = name => "https://www.gstatic.com/firebasejs/" + fbctx.sdk + "/firebase-" + name + ".js";
  let msgMod = null, fnMod = null;
  const loadMsg = async () => msgMod || (msgMod = await import(sdkUrl("messaging")));
  const loadFns = async () => fnMod || (fnMod = await import(sdkUrl("functions")));
  const callFn = async (name, data) => { const m = await loadFns(); return (await m.httpsCallable(m.getFunctions(fbctx.app, "asia-south1"), name, { timeout: 120000 })(data || {})).data; };
  const userRef = () => fbctx.F.doc(fbctx.db, "users", fbctx.user.uid);

  // ---------- notifications ----------
  async function registerPush(ask) {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) throw { msg: "This browser can't show notifications." };
    const m = await loadMsg();
    if (!(await m.isSupported())) throw { msg: "Notifications aren't supported here. On an iPhone, add Pocket Ledger to your home screen first, then turn them on from there." };
    const perm = ask ? await Notification.requestPermission() : Notification.permission;
    if (perm !== "granted") throw { msg: perm === "denied" ? "Notifications are blocked for Pocket Ledger. Allow them in your phone's settings for this app, then try again." : "Notifications weren't allowed." };
    const reg = await navigator.serviceWorker.ready;
    const token = await m.getToken(m.getMessaging(fbctx.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
    if (!token) throw { msg: "Couldn't register this device." };
    const old = lsGet("pl-push-token");
    if (old !== token) {
      const upd = { tokens: fbctx.F.arrayUnion(token) };
      await fbctx.F.setDoc(userRef(), upd, { merge: true });
      if (old) { try { await fbctx.F.updateDoc(userRef(), { tokens: fbctx.F.arrayRemove(old) }); } catch {} }
      lsSet("pl-push-token", token);
    }
    m.onMessage(m.getMessaging(fbctx.app), p => { const n = p.notification || {}; toast((n.title ? n.title + ": " : "") + (n.body || "")); });
    return token;
  }
  async function renderNotify() {
    const on = "Notification" in window && Notification.permission === "granted" && !!lsGet("pl-push-token");
    $("ntState").textContent = on ? "On for this device. You'll get the ones ticked below, even when the app is closed." : ("Notification" in window && Notification.permission === "denied") ? "Blocked for this app in your phone's settings." : "Off on this device.";
    $("ntOn").hidden = on; $("ntTest").hidden = !on; $("ntOff").hidden = !on;
    try {
      const s = await fbctx.F.getDoc(userRef()); const p = Object.assign({ bills: true, budgets: true, loans: true }, (s.exists() && s.data().notify) || {});
      $("ntBills").checked = p.bills; $("ntBudgets").checked = p.budgets; $("ntLoans").checked = p.loans;
    } catch {}
  }
  $("ntOn").addEventListener("click", async () => {
    $("ntOn").disabled = true;
    try { await registerPush(true); toast("Notifications are on"); }
    catch (e) { toast((e && e.msg) || "Couldn't turn notifications on. Try again."); }
    $("ntOn").disabled = false; renderNotify();
  });
  $("ntOff").addEventListener("click", async () => {
    const t = lsGet("pl-push-token");
    if (t) { try { await fbctx.F.updateDoc(userRef(), { tokens: fbctx.F.arrayRemove(t) }); } catch {} }
    lsSet("pl-push-token", ""); toast("Notifications are off on this device"); renderNotify();
  });
  $("ntTest").addEventListener("click", async () => {
    $("ntTest").disabled = true;
    try { await callFn("testPush"); toast("Test sent. It should arrive in a few seconds."); }
    catch (e) { toast(/not-found|internal|unavailable/.test(String(e && e.code)) ? "The notification server isn't set up yet." : (e && e.message) || "Couldn't send a test."); }
    $("ntTest").disabled = false;
  });
  ["ntBills", "ntBudgets", "ntLoans"].forEach(id => $(id).addEventListener("change", () => {
    fbctx.F.setDoc(userRef(), { notify: { bills: $("ntBills").checked, budgets: $("ntBudgets").checked, loans: $("ntLoans").checked } }, { merge: true }).catch(() => toast("Couldn't save that. Check your connection."));
  }));

  // ---------- secure Gemini on the server ----------
  function renderServerAI() {
    const on = serverAI();
    $("srvState").textContent = on ? "Gemini runs on your secure server for everyone in the household. No key is stored in the app." : "Optional: run Gemini on your secure server, so no key is stored in the app or on phones.";
    $("srvOn").hidden = on; $("srvOff").hidden = !on;
    $("hkeyField").hidden = on; $("hkeyHint").hidden = on;
  }
  $("srvOn").addEventListener("click", async () => {
    $("srvOn").disabled = true;
    try {
      await callFn("gemini", { ping: true });
      await fbctx.F.updateDoc(fbctx.F.doc(fbctx.db, "households", fbctx.hid), { ai: { server: true }, gemini: { key: "" } });
      household.ai = { server: true }; household.gemini = { key: "" }; lsSet(KEY_LS, "");
      toast("Gemini now runs on your server"); renderServerAI();
    } catch (e) { toast(/not-found|internal|unavailable/.test(String(e && e.code)) ? "The Gemini server isn't set up yet. Run the setup steps first." : (e && e.message) || "Couldn't reach the server."); }
    $("srvOn").disabled = false;
  });
  $("srvOff").addEventListener("click", async () => {
    try { await fbctx.F.updateDoc(fbctx.F.doc(fbctx.db, "households", fbctx.hid), { ai: { server: false } }); household.ai = { server: false }; renderServerAI(); toast("Stopped using the server. Add a key below to keep using Gemini."); }
    catch { toast("Couldn't change that. Check your connection."); }
  });

  $("settingsBtn").addEventListener("click", () => { if (fbctx) { renderNotify(); renderServerAI(); } });
  // keep this device's notification token fresh (they change from time to time)
  function refreshPush() { if (fbctx && "Notification" in window && Notification.permission === "granted" && lsGet("pl-push-token")) registerPush(false).catch(() => {}); }
