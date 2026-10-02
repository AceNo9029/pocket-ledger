
  // ======================================================================
  // Polish: category memory, home-screen shortcuts, row actions,
  // trend month details, follow-up suggestions in chat.
  // ======================================================================

  // ---------- 1. category memory (learned from your shared entries) ----------
  const merchantKey = note => String(note || "").toLowerCase().split(/\s[–—-]\s|,|\(|:/)[0].replace(/^(transfer to|from|paid back|loan to|loan from)\s+/, "").replace(/[^a-z0-9 .&']/g, " ").replace(/\s+/g, " ").trim();
  function guessCategory(note, type) {
    const k = merchantKey(note); if (k.length < 2) return "";
    const hits = state.entries.filter(e => e.type === type && e.category && e.category !== "Other" && !e.loanId && merchantKey(e.note) === k)
      .sort((a, b) => (b.created || 0) - (a.created || 0));
    if (hits.length) return hits[0].category;
    const loose = state.entries.filter(e => e.type === type && e.category && e.category !== "Other" && !e.loanId && k.length >= 3 && merchantKey(e.note).startsWith(k))
      .sort((a, b) => (b.created || 0) - (a.created || 0));
    return loose.length ? loose[0].category : "";
  }
  $("fNote").addEventListener("input", () => {
    if (ui.type === "save" || ui.type === "withdraw") return;
    const c = guessCategory($("fNote").value, ui.type), cat = $("fCat");
    if (c && (!cat.value || cat.dataset.auto === "1")) { cat.value = c; cat.dataset.auto = "1"; $("catHint").textContent = "Category from your past entries"; $("catHint").hidden = false; }
    else if (!c && cat.dataset.auto === "1") { cat.value = ""; cat.dataset.auto = ""; $("catHint").hidden = true; }
  });
  $("fCat").addEventListener("input", () => { $("fCat").dataset.auto = ""; $("catHint").hidden = true; });
  resetForm = (orig => function () { orig(); $("fCat").dataset.auto = ""; $("catHint").hidden = true; })(resetForm);
  // scans: if Gemini said "Other" but we've seen this shop before, use what you used last time
  const learnScan = () => scanItems.forEach(it => { if ((!it.category || it.category === "Other") && it.note) { const c = guessCategory(it.note, it.type); if (c) it.category = c; } });
  renderScan = (orig => function () { learnScan(); orig(); })(renderScan);

  // ---------- 2. home-screen shortcuts (long-press the app icon) ----------
  function handleShortcut() {
    const act = new URLSearchParams(location.search).get("action");
    if (!act) return;
    history.replaceState(null, "", location.pathname);
    const show = (title, sub, btn, fn) => {
      $("quickTitle").textContent = title; $("quickSub").textContent = sub; $("quickGo").textContent = btn;
      $("quick").hidden = false;
      $("quickGo").onclick = () => { $("quick").hidden = true; fn(); };
    };
    if (act === "scan") show("Scan a receipt", "Take a photo or pick a screenshot.", "Open camera or gallery", openScanPicker);
    else if (act === "voice") show("Talk to Pocket Ledger", "Say what happened, like \"Spent 85 on coffee\".", "Start talking", () => { openChat(); startRec(); });
    else if (act === "chat") openChat();
    else if (act === "add") { setType("expense"); $("formPanel").scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => $("fAmount").focus(), 300); }
  }
  $("quickX").addEventListener("click", () => { $("quick").hidden = true; });

  // ---------- 3. bigger touch actions on entries: tap or swipe a row ----------
  ui.openRow = null;
  $("ledger").addEventListener("click", ev => {
    if (ev.target.closest("button")) return;
    const li = ev.target.closest("li.tx"); if (!li) return;
    ui.openRow = ui.openRow === li.dataset.id ? null : li.dataset.id; ui.confirm = null; renderLedger();
  });
  let sw = null;
  $("ledger").addEventListener("touchstart", ev => { const li = ev.target.closest("li.tx"); if (li) sw = { id: li.dataset.id, x: ev.touches[0].clientX, y: ev.touches[0].clientY, li }; }, { passive: true });
  $("ledger").addEventListener("touchmove", ev => {
    if (!sw) return; const dx = ev.touches[0].clientX - sw.x, dy = ev.touches[0].clientY - sw.y;
    if (Math.abs(dy) > 30) { sw.li.style.transform = ""; sw = null; return; }
    if (dx < 0 && Math.abs(dx) > Math.abs(dy)) sw.li.style.transform = "translateX(" + Math.max(dx, -60) + "px)";
  }, { passive: true });
  $("ledger").addEventListener("touchend", ev => {
    if (!sw) return; const dx = (ev.changedTouches[0] || {}).clientX - sw.x; sw.li.style.transform = "";
    if (dx < -45) { ui.openRow = sw.id; ui.confirm = null; renderLedger(); }
    else if (dx > 45 && ui.openRow === sw.id) { ui.openRow = null; renderLedger(); }
    sw = null;
  });

  // ---------- 4. trend chart: tap a month for its details ----------
  ui.trendSel = null;
  function trendDetail(k) {
    const who = ui.view;
    const es = state.entries.filter(e => effMonth(e) === k && countsMoney(e) && (who === "all" || e.person === who));
    const inc = sum(es.filter(e => e.type === "income"), e => +e.amount), out = sum(es.filter(e => e.type === "expense"), e => +e.amount);
    const sav = sum(es, e => e.type === "save" ? +e.amount : e.type === "withdraw" ? -e.amount : 0);
    const cats = {}; es.filter(e => e.type === "expense").forEach(e => cats[e.category || "Other"] = (cats[e.category || "Other"] || 0) + +e.amount);
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    const rate = inc > 0 ? Math.round((inc - out) / inc * 100) : null;
    $("trendDetail").hidden = false;
    $("trendDetail").innerHTML = `<div class="td-head"><b>${esc(monthName(k))}</b>${k !== ui.month ? `<button class="ghost" type="button" id="trendGo">Open this month</button>` : `<span class="muted">Showing now</span>`}</div>
      <div class="td-grid num"><span>In <b>${esc(money(inc, { whole: true }))}</b></span><span>Out <b>${esc(money(out, { whole: true }))}</b></span><span>Saved <b>${esc(money(sav, { whole: true }))}</b></span><span>Kept <b>${rate === null ? "–" : rate + "%"}</b></span></div>
      ${top ? `<small>Biggest spend: ${esc(top[0])}, ${esc(money(top[1], { whole: true }))}</small>` : `<small>No spending recorded.</small>`}`;
    const go = $("trendGo"); if (go) go.onclick = () => { ui.month = k; ui.trendSel = null; render(); };
    document.querySelectorAll("#trendChart g.mon").forEach(g => g.classList.toggle("sel", g.dataset.k === k));
  }
  // replace the old "tap = jump" behaviour with "tap = details"
  const trendBox = $("trendChart"), trendClone = trendBox.cloneNode(false);
  trendBox.parentNode.replaceChild(trendClone, trendBox);
  trendClone.addEventListener("click", ev => { const g = ev.target.closest("g.mon"); if (!g) return; ui.trendSel = g.dataset.k; trendDetail(g.dataset.k); });
  renderTrend = (orig => function () { orig(); if (ui.trendSel) trendDetail(ui.trendSel); else $("trendDetail").hidden = true; })(renderTrend);
