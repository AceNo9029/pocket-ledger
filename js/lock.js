// App lock on this device: a PIN (and optionally fingerprint) when the app opens
// and after a minute away.
import { $, toast } from "./util.js";

const LOCK_LS = "pl-lock";
const cfg = () => { try { return JSON.parse(localStorage.getItem(LOCK_LS) || "null"); } catch { return null; } };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPin(pin, salt) { return b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pin))); }
let lockedAt = 0, pinBuf = "";

function showLock() {
  const c = cfg(); if (!c) return;
  pinBuf = ""; $("lockDots").textContent = ""; $("lockErr").hidden = true; $("lockErr").textContent = "That PIN isn't right.";
  $("lockBio").hidden = !c.cred; $("lock").hidden = false;
  if (c.cred) setTimeout(tryBio, 250);
}
async function tryBio() {
  const c = cfg(); if (!c || !c.cred) return;
  try {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: unb64(c.cred) }], userVerification: "required", timeout: 60000 } });
    $("lock").hidden = true;
  } catch { $("lockErr").textContent = "Fingerprint didn't work. Enter your PIN instead."; $("lockErr").hidden = false; }
}

export function initLock() {
  $("lockPad").addEventListener("click", async ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.k === "del") pinBuf = pinBuf.slice(0, -1);
    else if (b.dataset.k === "bio") { tryBio(); return; }
    else if (pinBuf.length < 8) pinBuf += b.dataset.k;
    $("lockDots").textContent = "•".repeat(pinBuf.length);
    const c = cfg();
    if (c && pinBuf.length >= 4 && await hashPin(pinBuf, c.salt) === c.hash) { $("lock").hidden = true; pinBuf = ""; }
    else if (c && pinBuf.length >= 8) { $("lockErr").textContent = "That PIN isn't right."; $("lockErr").hidden = false; pinBuf = ""; $("lockDots").textContent = ""; }
  });
  document.addEventListener("visibilitychange", () => {
    if (!cfg()) return;
    if (document.hidden) lockedAt = Date.now();
    else if (lockedAt && Date.now() - lockedAt > 60000) showLock();
  });
  if (cfg()) showLock();
}

export function renderSettings() {
  const c = cfg(), on = !!c;
  $("lockState").textContent = on ? "On: Pocket Ledger asks for your PIN" + (c.cred ? " or fingerprint" : "") + " when opened, and after a minute away." : "Off.";
  $("lockOn").hidden = on; $("lockOff").hidden = !on; $("lockBioAdd").hidden = !on || !!c.cred || !window.PublicKeyCredential;
  $("lockSetup").hidden = true;
}
export function initSettings() {
  $("lockOn").addEventListener("click", () => { $("lockSetup").hidden = false; $("lockPin1").value = ""; $("lockPin2").value = ""; $("lockPin1").focus(); });
  $("lockSave").addEventListener("click", async () => {
    const a = $("lockPin1").value.trim(), b = $("lockPin2").value.trim();
    if (!/^\d{4,8}$/.test(a)) return toast("Use 4 to 8 digits.");
    if (a !== b) return toast("The two PINs don't match.");
    const salt = b64(crypto.getRandomValues(new Uint8Array(12)));
    localStorage.setItem(LOCK_LS, JSON.stringify({ salt, hash: await hashPin(a, salt) }));
    renderSettings(); toast("App lock is on");
  });
  $("lockOff").addEventListener("click", () => { try { localStorage.removeItem(LOCK_LS); } catch {} renderSettings(); toast("App lock is off"); });
  $("lockBioAdd").addEventListener("click", async () => {
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Pocket Ledger" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "pocket-ledger", displayName: "Pocket Ledger" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }, timeout: 60000 } });
      const c = cfg(); c.cred = b64(cred.rawId); localStorage.setItem(LOCK_LS, JSON.stringify(c));
      renderSettings(); toast("Fingerprint added");
    } catch { toast("Fingerprint wasn't set up. You can still use your PIN."); }
  });
}
