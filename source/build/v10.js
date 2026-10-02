
  // ======================================================================
  // v10: counts-for-month, loans kept separate, bills & reminders,
  // dashboard tiles, dropdowns, font size, button labels, tidy entries.
  // ======================================================================
  // is this person the one signed in on this phone?
  function isMine(id) { return !!id && id === meId(); }
  function effMonth(e) { return e.countMonth || (e.date || "").slice(0, 7); }
  function countsMoney(e) {
    if (!e.loanId) return true;
    const l = (state.loans || []).find(x => x.id === e.loanId);
    return !!(l && l.inMonth);
  }
  const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);

  // ---------- appearance: font size + button labels (this device) ----------
  function applyLook() {
    const d = document.documentElement;
    d.setAttribute("data-fs", lsGet("pl-fs") || "m");
    d.setAttribute("data-tools", lsGet("pl-tools") || "icons");
    document.querySelectorAll(".tool").forEach(b => { if (!b.querySelector(".tl")) { const s = document.createElement("span"); s.className = "tl"; s.textContent = b.getAttribute("title") || b.getAttribute("aria-label") || ""; b.appendChild(s); } });
    document.querySelectorAll("#fsSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.fs === (lsGet("pl-fs") || "m"))));
    document.querySelectorAll("#toolSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tools === (lsGet("pl-tools") || "icons"))));
  }
  document.querySelectorAll("#fsSeg button").forEach(b => b.addEventListener("click", () => { lsSet("pl-fs", b.dataset.fs === "m" ? "" : b.dataset.fs); applyLook(); try { renderTrend(); } catch {} }));
  document.querySelectorAll("#toolSeg button").forEach(b => b.addEventListener("click", () => { lsSet("pl-tools", b.dataset.tools === "icons" ? "" : b.dataset.tools); applyLook(); }));
  applyLook();

  // ---------- add-entry form: dropdown categories, "counts for", save/withdraw wording ----------
  function catOptions() {
    const t = ui.type, base = t === "income" ? INC_CATS : EXP_CATS;
    const used = state.entries.filter(e => e.type === t && e.category && e.type !== "save" && e.type !== "withdraw").map(e => e.category);
    return [...new Set(base.concat(used))];
  }
  function syncCatSel() {
    const sel = $("fCatSel"), inp = $("fCat"), v = inp.value.trim(), opts = catOptions();
    sel.innerHTML = `<option value="">Choose a category</option>` + opts.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("") + `<option value="__other">Other (type your own)…</option>`;
    if (v && opts.includes(v)) { sel.value = v; inp.hidden = true; }
    else if (v || ui.catOther) { sel.value = "__other"; inp.hidden = false; }
    else { sel.value = ""; inp.hidden = true; }
  }
  $("fCatSel").addEventListener("change", () => {
    const sel = $("fCatSel"), inp = $("fCat");
    if (sel.value === "__other") { ui.catOther = true; inp.value = ""; inp.hidden = false; inp.focus(); }
    else { ui.catOther = false; inp.value = sel.value; inp.hidden = true; }
    inp.dispatchEvent(new Event("input"));
  });
  $("fNote").addEventListener("input", () => setTimeout(syncCatSel, 0));
  $("fGoal").addEventListener("change", () => { ui.goalSel = $("fGoal").value; $("purposeRow").hidden = $("fGoal").value !== "__other"; if ($("fGoal").value === "__other") $("fPurpose").focus(); });
  renderFormBits = (orig => function () {
    orig();
    const t = ui.type;
    // save / withdraw goal picker with "something else"
    const sel = $("fGoal");
    if (t === "save") { sel.insertAdjacentHTML("beforeend", `<option value="__other">Other</option>`); }
    if (ui.goalSel && [...sel.options].some(o => o.value === ui.goalSel)) sel.value = ui.goalSel;
    $("purposeRow").hidden = !(t === "save" && sel.value === "__other");
    $("goalLabel").textContent = t === "withdraw" ? "Take it from" : "Put it into";
    $("noteLabel").innerHTML = t === "withdraw" ? 'Reason <span class="muted">(optional)</span>' : 'Note <span class="muted">(optional)</span>';
    $("fNote").placeholder = t === "withdraw" ? "e.g. Car repair, will put back" : t === "income" ? "e.g. October salary" : "e.g. Groceries at Agora";
    if (t === "withdraw") $("typeHint").textContent = "Money taken out of your savings. It's deducted from your savings (and the goal, if you pick one) and added to this month's money. Put it back later with Save.";
    if (t === "income") $("typeHint").textContent = "Money coming in. If you're paid before the month ends, choose which month it's for.";
    $("forRow").hidden = t !== "income";
    if (!$("forRow").hidden) {
      const k = ($("fDate").value || todayISO()).slice(0, 7);
      $("fFor").options[0].textContent = "This month (" + monthName(k, true) + ")";
      $("fFor").options[1].textContent = "Next month (" + monthName(shiftMonth(k, 1), true) + ")";
    }
    syncCatSel();
  })(renderFormBits);
  $("fDate").addEventListener("change", () => renderFormBits());
  // editing an entry: restore "counts for" and category picker
  $("ledger").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-edit]"); if (!b) return;
    const e = state.entries.find(x => x.id === b.dataset.edit); if (!e) return;
    $("fFor").value = e.countMonth && e.countMonth !== (e.date || "").slice(0, 7) ? "next" : "this";
    ui.goalSel = e.goalId || ""; ui.catOther = false;
    renderFormBits();
  });
  resetForm = (orig => function () { ui.goalSel = ""; ui.catOther = false; $("fFor").value = "this"; $("fPurpose").value = ""; orig(); })(resetForm);

  // ---------- entries: show the latest 5, then "Show all" ----------
  ui.allEntries = false;
  renderLedger = (orig => function () {
    orig();
    if (ui.search) return;
    const list = $("ledger"), rows = [...list.querySelectorAll("li.tx")];
    if (rows.length <= 5) return;
    if (!ui.allEntries) {
      rows.slice(5).forEach(r => r.hidden = true);
      list.querySelectorAll("li.day").forEach(d => { let n = d.nextElementSibling, any = false; while (n && !n.classList.contains("day")) { if (!n.hidden) any = true; n = n.nextElementSibling; } if (!any) d.hidden = true; });
    }
    list.insertAdjacentHTML("beforeend", `<li class="more"><button class="ghost" type="button" id="moreEntries">${ui.allEntries ? "Show fewer" : "Show all " + rows.length + " entries"}</button></li>`);
    $("moreEntries").onclick = () => { ui.allEntries = !ui.allEntries; renderLedger(); };
  })(renderLedger);

  // ---------- loans: progress, history, kept separate ----------
  $("lnDir").addEventListener("change", () => { $("lnNameL").textContent = $("lnDir").value === "borrowed" ? "Who did you borrow from?" : "Who did you lend to?"; });
  renderLoans = function () {
    const who = ui.view, box = $("loanList");
    const mine = state.loans.filter(l => who === "all" || l.person === who);
    const open = mine.filter(l => loanOutstanding(l) > 0.004).sort((x, y) => (x.due || "9999").localeCompare(y.due || "9999"));
    const done = mine.filter(l => loanOutstanding(l) <= 0.004);
    const card = l => {
      const out = loanOutstanding(l), paid = r2(+l.amount - out), pct = +l.amount ? Math.min(100, Math.round(paid / +l.amount * 100)) : 0;
      const late = out > 0.004 && l.due && l.due < todayISO();
      const hist = state.entries.filter(e => e.loanId === l.id && e.loanRole === "repay").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const asking = ui.repayFor === l.id, lent = l.direction === "lent";
      return `<div class="loan${late ? " late" : ""}${out <= 0.004 ? " paid" : ""}">
        <div class="loan-top"><b>${lent ? "Lent to " : "Borrowed from "}${esc(l.counterparty)}</b><span class="num">${out <= 0.004 ? "Paid off ✓" : esc(money(out)) + " left"}</span></div>
        <div class="meter loan-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Paid back"><div style="width:${pct}%"></div></div>
        <div class="loan-meta">${isHouse() ? `<i class="pdot" style="background:${pcolor(l.person)}"></i>${esc(pname(l.person))} · ` : ""}${esc(money(paid, { whole: true }))} of ${esc(money(+l.amount, { whole: true }))} paid back (${pct}%) · since ${esc(fmtDate(l.date))}${l.due ? ` · ${late ? "was due" : "due"} ${esc(fmtDate(l.due))}` : ""}</div>
        ${hist.length ? `<details class="loan-hist"><summary>${hist.length} repayment${hist.length === 1 ? "" : "s"}</summary><ul>${hist.map(h => `<li><span>${esc(fmtDate(h.date))}</span><b class="num">${esc(money(+h.amount))}</b></li>`).join("")}</ul></details>` : ""}
        ${out > 0.004 ? (asking ? `<div class="loan-pay"><input id="repayAmt" type="number" inputmode="decimal" min="0" step="0.01" value="${out}" aria-label="Amount paid back"><input id="repayDate" type="date" value="${todayISO()}" aria-label="Date"><button class="primary" type="button" data-repay-ok="${l.id}">Save</button><button class="icon-btn" type="button" data-repay-x="1">Cancel</button></div>`
          : `<div class="goal-acts"><button class="ghost" type="button" data-repay="${l.id}">${lent ? "They paid some back" : "I paid some back"}</button><button class="icon-btn" type="button" data-inmonth="${l.id}" title="Whether this loan counts in left to spend">${l.inMonth ? "Counted in monthly money" : "Kept separate"}</button></div>`) : ""}
      </div>`;
    };
    box.innerHTML = open.length ? open.map(card).join("") : `<div class="empty" style="padding:8px"><span>No open loans.</span><span class="hint">Loans are kept separate from "left to spend" unless you choose otherwise. Tell the chat "I lent Ali 10k" or use New loan.</span></div>`;
    $("loanClosed").innerHTML = done.length ? `<details class="loan-done"><summary>${done.length} paid-off loan${done.length === 1 ? "" : "s"}</summary><div class="loans">${done.map(card).join("")}</div></details>` : "";
    $("lnWhoF").hidden = !isHouse();
    if (isHouse()) $("lnWho").innerHTML = people().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  };
  $("loanList").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-inmonth]"); if (!b) return;
    const l = state.loans.find(x => x.id === b.dataset.inmonth); if (!l) return;
    backend.saveDoc("loans", l.id, Object.assign({}, l, { inMonth: !l.inMonth }));
    toast(l.inMonth ? "Loan kept separate from monthly money" : "Loan now counts in monthly money");
  }, true);
  // repayments can be dated (installments)
  $("loanList").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-repay-ok]"); if (!b) return;
    ev.stopImmediatePropagation();
    const l = state.loans.find(x => x.id === b.dataset.repayOk); const amt = num($("repayAmt").value), d = $("repayDate").value || todayISO();
    if (l && recordRepayment(l, amt, d)) { ui.repayFor = null; toast(loanOutstanding(l) - amt <= 0.004 ? "Loan fully paid back" : "Repayment saved"); }
    else toast("Enter an amount up to what's still owed.");
  }, true);

  // ---------- bills & reminders (nothing is added automatically) ----------
  processRecurring = function () {};
  const remindDays = r => Math.max(1, Math.min(31, +r.remindDays || 7));
  function billStatus(r, k) {
    const due = dateIn(k, r.day), left = daysBetween(todayISO(), due), win = remindDays(r);
    const level = left < 0 || left <= 1 ? "red" : left <= Math.ceil(win / 2) ? "amber" : "green";
    return { k, due, left, level, show: left <= win };
  }
  function openBills(who) {
    const now = monthKey(new Date()), out = [];
    state.recurring.filter(r => !r.paused && (who === "all" || !who || r.person === who)).forEach(r => {
      let k = r.startMonth || now; if (k > now) k = now;
      for (let i = 0; i < 13 && k <= now; i++, k = shiftMonth(k, 1)) {
        if ((r.skips || []).includes(k) || state.entries.some(e => e.id === "rec-" + r.id + "-" + k)) continue;
        if (k < (r.startMonth || now)) continue;
        const st = billStatus(r, k);
        if (st.show) out.push({ r, ...st });
      }
      // next month's bill if its reminder window already started (e.g. due on the 2nd)
      const nk = shiftMonth(now, 1), st = billStatus(r, nk);
      if (st.show && !(r.skips || []).includes(nk) && !state.entries.some(e => e.id === "rec-" + r.id + "-" + nk)) out.push({ r, ...st });
    });
    return out.sort((a, b) => a.left - b.left);
  }
  function payBill(r, k, amount) {
    const e = { type: r.type, amount: r2(amount > 0 ? amount : r.amount), date: todayISO(), person: r.person, category: r.category || "Other", note: r.note || "", created: Date.now(), recurringId: r.id };
    if (k !== todayISO().slice(0, 7)) e.countMonth = k;
    if (r.goalId) e.goalId = r.goalId;
    if (r.split) e.split = r.split;
    backend.addWithId("rec-" + r.id + "-" + k, e);
    budgetCheck(e);
  }
  const lvlText = b => b.left < 0 ? "overdue by " + (-b.left) + " day" + (b.left === -1 ? "" : "s") : b.left === 0 ? "due today" : b.left === 1 ? "due tomorrow" : "due in " + b.left + " days";
  renderRecurring = function () {
    const who = ui.view, bills = openBills(who), bar = $("dueBar");
    if (bills.length) {
      bar.hidden = false; bar.className = "bills-bar";
      bar.innerHTML = bills.slice(0, 4).map(b => {
        const paying = ui.payFor === b.r.id + b.k;
        return `<div class="bill ${b.level}"><div class="bill-main"><b>${esc(b.r.note || b.r.category)}</b><span>${esc(money(+b.r.amount, { whole: true }))} · ${lvlText(b)}${isHouse() ? " · " + esc(pname(b.r.person)) : ""}</span></div>
          ${paying ? `<span class="row-btns"><input class="bill-amt" id="billAmt" type="number" inputmode="decimal" value="${+b.r.amount}" aria-label="Amount paid"><button class="primary" type="button" data-billok="${b.r.id}|${b.k}">Save</button><button class="icon-btn" type="button" data-billx="1">Cancel</button></span>`
            : `<span class="row-btns"><button class="ghost" type="button" data-bill="${b.r.id}|${b.k}">${b.r.type === "income" ? "Received" : "Paid"}</button><button class="icon-btn" type="button" data-billskip="${b.r.id}|${b.k}">Skip</button></span>`}</div>`;
      }).join("") + (bills.length > 4 ? `<div class="bill-more">+${bills.length - 4} more in Bills &amp; reminders</div>` : "");
    } else bar.hidden = true;
    const list = state.recurring.filter(r => who === "all" || r.person === who).sort((a, b) => (+a.day || 0) - (+b.day || 0));
    const now = monthKey(new Date());
    $("recList").innerHTML = list.length ? list.map(r => {
      const kk = r.startMonth && r.startMonth > now ? r.startMonth : now;
      const paidNow = state.entries.some(e => e.id === "rec-" + r.id + "-" + kk) || (r.skips || []).includes(kk);
      const st = billStatus(r, kk), asking = ui.confirm === "r:" + r.id;
      const dot = r.paused ? "off" : paidNow ? "done" : st.left < 0 ? "red" : st.show ? st.level : "green";
      return `<div class="rec"><span class="rec-dot ${dot}" title="${paidNow ? "Done this month" : lvlText(st)}"></span><div class="rec-main"><b>${esc(r.note || r.category)}</b><small>${esc(money(+r.amount))} · day ${r.day} · reminds ${remindDays(r)} day${remindDays(r) === 1 ? "" : "s"} before${isHouse() ? " · " + esc(pname(r.person)) : ""} · ${r.paused ? "paused" : paidNow ? "done for " + monthName(kk, true) : lvlText(st)}</small></div>
        <span class="row-btns">${asking ? `<button class="icon-btn danger" type="button" data-rdel="${r.id}">Delete</button><button class="icon-btn" type="button" data-rno="1">Keep</button>` : `<button class="icon-btn" type="button" data-ics="${r.id}" title="Add to your phone's calendar">Calendar</button><button class="icon-btn" type="button" data-rpause="${r.id}">${r.paused ? "Resume" : "Pause"}</button><button class="icon-btn" type="button" data-rask="${r.id}">Delete</button>`}</span></div>`;
    }).join("") : `<div class="empty" style="padding:8px"><span>No bills or reminders yet.</span><span class="hint">Add rent, phone, electricity or water below. They turn green, then amber, then red as the due date gets close. Nothing is added until you tap Paid.</span></div>`;
    $("brWhoF").hidden = !isHouse();
    if (isHouse()) $("brWho").innerHTML = people().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    const cats = [...new Set(EXP_CATS.concat(INC_CATS))];
    if (!$("brCat").options.length) $("brCat").innerHTML = cats.map(c => `<option value="${esc(c)}"${c === "Rent & bills" ? " selected" : ""}>${esc(c)}</option>`).join("");
  };
  $("dueBar").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    const parse = v => { const [id, k] = v.split("|"); return { r: state.recurring.find(x => x.id === id), k }; };
    if (b.dataset.bill) { ui.payFor = b.dataset.bill.replace("|", ""); renderRecurring(); setTimeout(() => $("billAmt") && $("billAmt").focus(), 30); }
    else if (b.dataset.billx) { ui.payFor = null; renderRecurring(); }
    else if (b.dataset.billok) { const { r, k } = parse(b.dataset.billok); if (r) { payBill(r, k, num($("billAmt").value)); ui.payFor = null; toast("Saved"); } }
    else if (b.dataset.billskip) { const { r, k } = parse(b.dataset.billskip); if (r) { backend.saveDoc("recurring", r.id, Object.assign({}, r, { skips: [...new Set((r.skips || []).concat(k))].slice(-24) })); toast("Skipped for " + monthName(k, true)); } }
  });
  // calendar file so your phone reminds you even when the app is closed
  function icsFor(r) {
    const now = new Date(), k = monthKey(now), first = dateIn(k, r.day).replace(/-/g, "");
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const title = (r.note || r.category || "Bill") + " (" + money(+r.amount, { whole: true }) + ")";
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pocket Ledger//EN", "BEGIN:VEVENT", "UID:pl-" + r.id + "@pocket-ledger", "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + first, "RRULE:FREQ=MONTHLY;BYMONTHDAY=" + Math.min(28, +r.day || 1), "SUMMARY:" + title.replace(/[,;]/g, " "),
      "DESCRIPTION:Mark it paid in Pocket Ledger", "BEGIN:VALARM", "TRIGGER:-P" + remindDays(r) + "D", "ACTION:DISPLAY", "DESCRIPTION:" + title.replace(/[,;]/g, " ") + " is due soon", "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:PT9H", "ACTION:DISPLAY", "DESCRIPTION:" + title.replace(/[,;]/g, " ") + " is due today", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }
  $("recList").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-ics]"); if (!b) return;
    const r = state.recurring.find(x => x.id === b.dataset.ics); if (!r) return;
    const blob = new Blob([icsFor(r)], { type: "text/calendar" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = (r.note || r.category || "bill").replace(/[^\w -]/g, "") + ".ics"; document.body.appendChild(a); a.click(); a.remove();
    toast("Open the file to add it to your calendar");
  });
  $("saveBill").addEventListener("click", () => {
    const name = $("brName").value.trim(), amount = num($("brAmt").value), day = parseInt($("brDay").value, 10);
    const err = m => { $("brErr").textContent = m; $("brErr").hidden = false; };
    if (!name) return err("Give it a name, like Electricity.");
    if (!(amount > 0)) return err("Enter the usual amount.");
    if (!(day >= 1 && day <= 31)) return err("Enter the day of the month it's due (1-31).");
    $("brErr").hidden = true;
    const k = monthKey(new Date());
    backend.saveDoc("recurring", null, { type: $("brType").value, amount: r2(amount), category: $("brCat").value, note: name, person: spaceMode() ? meId() : isHouse() ? $("brWho").value : ui.view,
      day, remindDays: Math.max(1, Math.min(31, parseInt($("brRemind").value, 10) || 7)), auto: false, startMonth: k, created: Date.now() });
    ["brName", "brAmt", "brDay"].forEach(id => $(id).value = ""); $("billBox").open = false; toast("Reminder saved");
  });
  // the add-entry "Remind me every month" box
  afterEntryAdded = function (e) {
    if ($("fRepeat").checked && !e.recurringId) {
      createRecurring({ type: e.type, amount: e.amount, category: e.category, note: e.note || e.category, person: e.person, day: +e.date.slice(8, 10), auto: false, startMonth: shiftMonth(e.date.slice(0, 7), 1), goalId: e.goalId, split: e.split });
      toast("Added. You'll be reminded on day " + (+e.date.slice(8, 10)) + " each month.");
    }
    $("fRepeat").checked = false; $("fSplit").checked = false;
    budgetCheck(e);
  };

  // ---------- dashboard: tiles you choose ----------
  const TILES = [["income", "Income"], ["spent", "Spent"], ["saved", "Saved this month"], ["total", "Total savings"], ["split", "Income split bar"], ["bills", "Bills due"], ["budgets", "Budget alerts"], ["loans", "Loans"], ["goals", "Goals"]];
  const hiddenTiles = () => { try { return JSON.parse(lsGet("pl-tiles") || "[]"); } catch { return []; } };
  function renderTiles() {
    const hide = new Set(hiddenTiles()), who = ui.view;
    document.querySelectorAll("[data-tile]").forEach(el => el.hidden = hide.has(el.dataset.tile));
    const tiles = [];
    if (!hide.has("bills")) {
      const bills = openBills(who), red = bills.filter(b => b.level === "red").length;
      tiles.push(`<div class="tile ${red ? "t-red" : bills.length ? "t-amber" : "t-ok"}"><div class="label">Bills due</div><div class="v">${bills.length ? bills.length + " due" : "All clear"}</div><div class="h">${bills.length ? esc((bills[0].r.note || bills[0].r.category) + " " + lvlText(bills[0])) : "Nothing due soon"}</div></div>`);
    }
    if (!hide.has("budgets")) {
      const b = budgetsFor(who), over = [], near = [];
      Object.keys(b).forEach(c => { const lim = +b[c]; if (!(lim > 0)) return; const sp = spentIn(ui.month, who, c); if (sp >= lim) over.push(c + " +" + money(sp - lim, { whole: true })); else if (sp >= lim * 0.8) near.push(c); });
      const n = Object.keys(b).filter(c => +b[c] > 0).length;
      tiles.push(`<div class="tile ${over.length ? "t-red" : near.length ? "t-amber" : "t-ok"}"><div class="label">Budgets</div><div class="v">${!n ? "None set" : over.length ? over.length + " over" : near.length ? near.length + " close" : "On track"}</div><div class="h">${esc(over.length ? over.join(", ") : near.length ? near.join(", ") + " at 80%+" : n ? "All under limit" : "Set them under Where the money went")}</div></div>`);
    }
    if (!hide.has("loans")) {
      const ls = openLoans(who), owedToMe = sum(ls.filter(l => l.direction === "lent"), loanOutstanding), iOwe = sum(ls.filter(l => l.direction === "borrowed"), loanOutstanding);
      tiles.push(`<div class="tile"><div class="label">Loans</div><div class="v num">${ls.length ? esc(money(iOwe, { whole: true })) : "None"}</div><div class="h">${ls.length ? "owed by you · " + esc(money(owedToMe, { whole: true })) + " owed to you" : "No open loans"}</div></div>`);
    }
    if (!hide.has("goals")) {
      const gs = visibleGoals(who).filter(g => +g.target > 0);
      const g = gs.map(g => ({ g, p: Math.min(100, Math.round(goalBalance(g.id) / +g.target * 100)) })).sort((a, b) => b.p - a.p)[0];
      tiles.push(`<div class="tile"><div class="label">Goals</div><div class="v">${g ? g.p + "%" : "None"}</div><div class="h">${g ? esc(g.g.name) + (gs.length > 1 ? " · +" + (gs.length - 1) + " more" : "") : "Create one in Savings goals"}</div></div>`);
    }
    $("tiles").innerHTML = tiles.join("");
    $("tiles").hidden = !tiles.length;
    $("tileCfg").innerHTML = ui.tileCfg ? `<p class="hint" style="margin:0">Choose what shows here on this device:</p><div class="tile-opts">${TILES.map(([k, l]) => `<label class="check"><input type="checkbox" data-tk="${k}" ${hide.has(k) ? "" : "checked"}><span>${l}</span></label>`).join("")}</div>` : "";
    $("tileCfg").hidden = !ui.tileCfg;
    $("tileBtn").textContent = ui.tileCfg ? "Done" : "Customize";
  }
  $("tileBtn").addEventListener("click", () => { ui.tileCfg = !ui.tileCfg; renderTiles(); });
  $("tileCfg").addEventListener("change", ev => {
    const c = ev.target.closest("input[data-tk]"); if (!c) return;
    const h = new Set(hiddenTiles()); c.checked ? h.delete(c.dataset.tk) : h.add(c.dataset.tk);
    lsSet("pl-tiles", JSON.stringify([...h])); renderTiles();
  });

  render = (orig => function () { orig(); try { renderTiles(); } catch (err) { console.error(err); } })(render);
