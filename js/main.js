// Starts the money screens once app.js has signed you in and picked a space.
import { $, toast } from "./util.js";
import { ctx, state, connect, onChange, lastSeenMark } from "./store.js";
import { registerPage, initShell, renderShell, route, go } from "./shell.js";
import { page as home } from "./pages/home.js";
import { page as entries, focusAdd } from "./pages/entries.js";
import { page as loans } from "./pages/loans.js";
import { page as bills } from "./pages/bills.js";
import { page as goals } from "./pages/goals.js";
import { page as settings, checkRequests } from "./pages/settings.js";
import { page as admin } from "./pages/admin.js";
import { initScan, openScanPicker, handleFiles, initStatements } from "./scan.js";
import { initChat, openChat, startRec } from "./chat.js";
import { initLock } from "./lock.js";
import { refreshPush } from "./notify.js";
import { initNag, renderNag } from "./backup.js";
import { aiReady } from "./gemini.js";
import { initTransfers, checkTransfers } from "./transfers.js";

// a screenshot shared into the app from another app (Android share sheet)
async function takeSharedFiles() {
  if (!/[?&]shared=1/.test(location.search)) { try { if (window.caches) caches.delete("pl-share"); } catch {} return; }
  history.replaceState(null, "", location.pathname + location.hash);
  try {
    const c = await caches.open("pl-share"), files = [];
    for (const k of await c.keys()) { const r = await c.match(k), b = await r.blob(); files.push(new File([b], decodeURIComponent(k.url.split("/").pop()) || "shared.jpg", { type: b.type || "image/jpeg" })); await c.delete(k); }
    if (!files.length) return;
    if (!aiReady() && !files.some(f => /csv/i.test(f.type || "") || /\.csv$/i.test(f.name || ""))) { toast("Set up Gemini in Settings to read shared files."); return; }
    handleFiles(files);
  } catch { toast("Couldn't open the shared image."); }
}
// long-press shortcuts on the app icon
function handleShortcut() {
  const act = new URLSearchParams(location.search).get("action");
  if (!act) return;
  history.replaceState(null, "", location.pathname + location.hash);
  const show = (title, sub, btn, fn) => {
    $("quickTitle").textContent = title; $("quickSub").textContent = sub; $("quickGo").textContent = btn; $("quick").hidden = false;
    $("quickGo").onclick = () => { $("quick").hidden = true; fn(); };
  };
  if (act === "scan") show("Scan a receipt", "Take a photo or pick a screenshot.", "Open camera or gallery", openScanPicker);
  else if (act === "voice") show("Talk to Pocket Ledger", "Say what happened, like \"Spent 85 on coffee\".", "Start talking", () => { openChat(); startRec(); });
  else if (act === "chat") openChat();
  else if (act === "add") focusAdd("expense");
}

export function boot(fb) {
  [["home", home], ["entries", entries], ["loans", loans], ["bills", bills], ["goals", goals], ["settings", settings], ["admin", admin]].forEach(([id, p]) => { registerPage(id, p); p.init(); });
  initShell(); initScan(); initStatements(); initTransfers(); initChat(); initLock(); initNag();
  $("quickX").addEventListener("click", () => { $("quick").hidden = true; });
  document.addEventListener("click", ev => { const b = ev.target.closest("[data-go-add]"); if (b) focusAdd("expense"); });
  connect(fb);
  $("app").hidden = false;
  onChange(() => { renderShell(); renderNag(); });
  route();
  try { const m = sessionStorage.getItem("pl-join-msg"); if (m) { sessionStorage.removeItem("pl-join-msg"); setTimeout(() => toast(m), 800); } } catch {}
  (function waitReady() {
    if (state.ready) { takeSharedFiles(); handleShortcut(); refreshPush(); checkRequests(); checkTransfers(); lastSeenMark(); }
    else setTimeout(waitReady, 300);
  })();
  window.PL = { go, ctx, state };
}
