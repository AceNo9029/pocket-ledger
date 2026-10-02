
  // ======================================================================
  // Backups: "Recently deleted" (30 days) and a full backup file you can
  // save to Google Drive / Files from the share sheet, with a reminder.
  // ======================================================================
  const TRASH_DAYS = 30;
  const describe = (col, x) => {
    x = x || {};
    if (col === "entries") return (x.type === "income" ? "Income" : x.type === "save" ? "Saved" : x.type === "withdraw" ? "Took out" : "Spent") + " " + money(+x.amount || 0) + (x.category ? " · " + x.category : "") + (x.note ? " · " + x.note : "") + (x.date ? " · " + x.date : "");
    if (col === "goals") return "Goal: " + (x.name || "untitled");
    if (col === "loans") return "Loan: " + (x.counterparty || "someone") + " · " + money(+x.amount || 0);
    if (col === "recurring") return "Reminder: " + (x.note || x.category || "bill") + " · " + money(+x.amount || 0);
    if (col === "settlements") return "Settle-up · " + money(+x.amount || 0);
    return col;
  };
  async function renderTrash() {
    const box = $("trashList"); if (!box || !fbctx) return;
    if (isViewer()) { $("trashSec").hidden = true; return; }
    $("trashSec").hidden = false;
    const F = FS();
    try {
      const q = await F.getDocs(F.collection(hRef(fbctx.hid), "trash"));
      const all = q.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(t => t.author === meId());
      const old = all.filter(t => Date.now() - (t.deletedAt || 0) > TRASH_DAYS * 864e5);
      old.forEach(t => F.deleteDoc(F.doc(F.collection(hRef(fbctx.hid), "trash"), t.id)).catch(() => {}));
      const list = all.filter(t => !old.includes(t)).sort((a, b) => b.deletedAt - a.deletedAt);
      box.innerHTML = !list.length ? `<p class="hint" style="margin:0">Nothing deleted in the last ${TRASH_DAYS} days${isGroup() ? " by you in this group" : ""}.</p>`
        : list.slice(0, 50).map(t => `<div class="priv-row"><span>${esc(describe(t.col, t.data))}<small class="hint"> · deleted ${esc(ago(t.deletedAt))}</small></span><button class="ghost" type="button" data-untrash="${esc(t.id)}">Restore</button></div>`).join("");
      box._list = list;
    } catch { box.innerHTML = `<p class="hint" style="margin:0">Connect to the internet to see deleted items.</p>`; }
  }
  $("trashList").addEventListener("click", async ev => {
    const b = ev.target.closest("button[data-untrash]"); if (!b) return;
    const t = ($("trashList")._list || []).find(x => x.id === b.dataset.untrash); if (!t) return;
    const F = FS(), bt = F.writeBatch(fbctx.db);
    bt.set(F.doc(F.collection(hRef(fbctx.hid), t.col), t.docId), Object.assign({}, t.data, { author: meId() }));
    bt.delete(F.doc(F.collection(hRef(fbctx.hid), "trash"), t.id));
    b.disabled = true;
    try { await bt.commit(); toast("Restored"); renderTrash(); } catch { b.disabled = false; toast("Couldn't restore that. Check your connection."); }
  });
  $("settingsBtn").addEventListener("click", () => { if (fbctx && !$("settingsPanel").hidden) setTimeout(renderTrash, 0); });

  // ---------- full backup file ----------
  async function buildBackup() {
    const F = FS(), out = { app: "pocket-ledger", version: 2, made: new Date().toISOString(), by: (fbctx.user && fbctx.user.email) || "", groups: [] };
    const cols = ["entries", "goals", "loans", "recurring", "settlements"];
    const mine = (SP.spaces || []).filter(s => s.role === "member");
    for (const sp of mine) {
      const part = { id: sp.id, name: sp.name, type: sp.type };
      const hs = await F.getDoc(hRef(sp.id)); const hd = hs.exists() ? hs.data() : {};
      part.settings = Object.assign({}, hd.settings || {}); if (sp.type === "group") { part.members = hd.names || {}; }
      for (const c of cols) { const q = await F.getDocs(F.collection(hRef(sp.id), c)); part[c] = q.docs.map(d => Object.assign({ id: d.id }, d.data())); }
      if (sp.type === "personal") { cols.forEach(c => { out[c] = part[c]; }); out.settings = part.settings; }
      else out.groups.push(part);
    }
    if (!out.entries) { out.entries = []; out.goals = []; out.settings = {}; }
    return out;
  }
  async function doBackup() {
    if (!fbctx) return;
    toast("Making your backup…");
    let d; try { d = await buildBackup(); } catch { return toast("Couldn't make the backup. Check your connection."); }
    const name = "pocket-ledger-backup-" + todayISO() + ".json", json = JSON.stringify(d, null, 1);
    const file = new File([json], name, { type: "application/json" });
    const done = () => { lsSet("pl-lastbackup", String(Date.now())); renderBackupNag(); };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Pocket Ledger backup" }); done(); toast("Backup ready. Pick Drive (or Files) to keep it safe."); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    saveFile(name, json, "Backed up"); done();
  }
  { const old = $("backupBtn"), nb = old.cloneNode(true); old.replaceWith(nb); nb.addEventListener("click", doBackup); }

  // ---------- reminder to back up ----------
  function renderBackupNag() {
    const bar = $("backupNag"); if (!bar) return;
    const last = +lsGet("pl-lastbackup") || 0, snooze = +lsGet("pl-backup-snooze") || 0;
    const due = !isViewer() && Date.now() - last > 14 * 864e5 && Date.now() > snooze && state.entries.length >= 5;
    bar.hidden = !due; if (!due) return;
    bar.innerHTML = `<span>${last ? "It's been " + Math.floor((Date.now() - last) / 864e5) + " days since your last backup." : "You haven't made a backup on this device yet."} Save one to Google Drive in two taps.</span><span class="row-btns"><button class="primary" type="button" data-bk="now">Back up now</button><button class="ghost" type="button" data-bk="later">Later</button></span>`;
  }
  $("backupNag").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-bk]"); if (!b) return;
    if (b.dataset.bk === "now") doBackup(); else { lsSet("pl-backup-snooze", String(Date.now() + 3 * 864e5)); renderBackupNag(); }
  });
  render = (o => function () { o(); try { renderBackupNag(); } catch {} })(render);
