
  // ======================================================================
  // Extras: loans, repeating entries, splitting, budgets, trends, search,
  // share-to-app, app lock. Data lives in household subcollections.
  // ======================================================================
  state.recurring = state.recurring || []; state.loans = state.loans || []; state.settlements = state.settlements || [];
  ui.search = "";
  const LOAN_OUT = "Loans given", LOAN_IN = "Loan received", LOAN_BACK_IN = "Loan repaid", LOAN_BACK_OUT = "Loan repayment";
  const otherOf = id => (people().find(p => p.id !== id) || {}).id || "p2";
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const daysIn = k => { const [y, m] = k.split("-").map(Number); return new Date(y, m, 0).getDate(); };
  const dateIn = (k, day) => k + "-" + String(Math.min(Math.max(1, +day || 1), daysIn(k))).padStart(2, "0");
  const fmtDate = d => { try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

  // ---------- loans ----------
  function loanOutstanding(l) {
    const paid = sum(state.entries.filter(e => e.loanId === l.id && e.loanRole === "repay"), e => +e.amount);
    return r2((+l.amount || 0) - paid);
  }
  const openLoans = who => state.loans.filter(l => (who === "all" || !who || l.person === who) && loanOutstanding(l) > 0.004);
  function createLoan(a) {
    const person = a.person || askerPersonSafe();
    const direction = a.direction === "borrowed" ? "borrowed" : "lent";
    const amount = r2(a.amount), date = /^\d{4}-\d{2}-\d{2}$/.test(a.date || "") ? a.date : todayISO();
    const counterparty = String(a.counterparty || "Friend").trim().slice(0, 40) || "Friend";
    const loan = { person, direction, counterparty, amount, date, due: /^\d{4}-\d{2}-\d{2}$/.test(a.due || "") ? a.due : "", note: String(a.note || "").slice(0, 80), inMonth: !!a.inMonth, created: Date.now() };
    const id = backend.saveDoc("loans", null, loan);
    backend.add({ type: direction === "lent" ? "expense" : "income", amount, date, person, category: direction === "lent" ? LOAN_OUT : LOAN_IN,
      note: (direction === "lent" ? "Loan to " : "Loan from ") + counterparty, created: Date.now(), loanId: id, loanRole: "start" });
    return id;
  }
  function findLoan(counterparty, person, direction) {
    const q = String(counterparty || "").trim().toLowerCase();
    let ls = openLoans(person && person !== "all" ? person : "all");
    if (direction) ls = ls.filter(l => l.direction === direction);
    if (q) ls = ls.filter(l => l.counterparty.toLowerCase().includes(q) || q.includes(l.counterparty.toLowerCase()));
    return ls.sort((x, y) => (y.date || "").localeCompare(x.date || ""))[0] || null;
  }
  function recordRepayment(loan, amount, date) {
    amount = r2(Math.min(+amount || 0, loanOutstanding(loan)));
    if (!(amount > 0)) return false;
    backend.add({ type: loan.direction === "lent" ? "income" : "expense", amount, date: /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : todayISO(), person: loan.person,
      category: loan.direction === "lent" ? LOAN_BACK_IN : LOAN_BACK_OUT, note: loan.direction === "lent" ? loan.counterparty + " paid back" : "Paid back " + loan.counterparty,
      created: Date.now(), loanId: loan.id, loanRole: "repay" });
    return true;
  }
  function renderLoans() {
    const who = ui.view, box = $("loanList");
    const ls = openLoans(who).sort((x, y) => (x.due || "9999").localeCompare(y.due || "9999"));
    const closed = state.loans.filter(l => (who === "all" || l.person === who) && loanOutstanding(l) <= 0.004).length;
    if (!ls.length) box.innerHTML = `<div class="empty" style="padding:8px"><span>No open loans.</span><span class="hint">Money you lend or borrow shows here until it's paid back. You can also just tell the chat: "I lent Ali 10k".</span></div>`;
    else box.innerHTML = ls.map(l => {
      const out = loanOutstanding(l), late = l.due && l.due < todayISO();
      const asking = ui.repayFor === l.id;
      return `<div class="loan${late ? " late" : ""}">
        <div class="loan-top"><b>${l.direction === "lent" ? "Lent to " : "Borrowed from "}${esc(l.counterparty)}</b><span class="num">${esc(money(out))}</span></div>
        <div class="loan-meta">${isHouse() ? `<i class="pdot" style="background:${pcolor(l.person)}"></i>${esc(pname(l.person))} · ` : ""}${esc(money(+l.amount, { whole: true }))} on ${esc(fmtDate(l.date))}${l.due ? ` · ${late ? "was due" : "due"} ${esc(fmtDate(l.due))}` : ""}</div>
        ${asking ? `<div class="loan-pay"><input id="repayAmt" type="number" inputmode="decimal" min="0" step="0.01" value="${out}" aria-label="Amount paid back"><button class="primary" type="button" data-repay-ok="${l.id}">Save</button><button class="icon-btn" type="button" data-repay-x="1">Cancel</button></div>`
          : `<div class="goal-acts"><button class="ghost" type="button" data-repay="${l.id}">${l.direction === "lent" ? "They paid back" : "I paid back"}</button></div>`}
      </div>`;
    }).join("");
    $("loanClosed").textContent = closed ? closed + " paid-off loan" + (closed === 1 ? "" : "s") + " kept in your history." : "";
    $("lnWhoF").hidden = !isHouse();
    if (isHouse()) $("lnWho").innerHTML = people().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  }
  $("loanList").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.repay) { ui.repayFor = b.dataset.repay; renderLoans(); setTimeout(() => $("repayAmt") && $("repayAmt").focus(), 30); }
    else if (b.dataset.repayX) { ui.repayFor = null; renderLoans(); }
    else if (b.dataset.repayOk) {
      const l = state.loans.find(x => x.id === b.dataset.repayOk); const amt = num($("repayAmt").value);
      if (l && recordRepayment(l, amt, todayISO())) { ui.repayFor = null; toast(loanOutstanding(l) - amt <= 0.004 ? "Loan fully paid back" : "Repayment saved"); }
      else toast("Enter an amount up to what's still owed.");
    }
  });
  $("saveLoan").addEventListener("click", () => {
    const amount = num($("lnAmt").value), cp = $("lnName").value.trim();
    if (!(amount > 0)) { $("loanErr").textContent = "Enter the amount."; $("loanErr").hidden = false; return; }
    if (!cp) { $("loanErr").textContent = "Who is it with?"; $("loanErr").hidden = false; return; }
    $("loanErr").hidden = true;
    createLoan({ direction: $("lnDir").value, counterparty: cp, amount, date: $("lnDate").value || todayISO(), due: $("lnDue").value, person: spaceMode() ? meId() : isHouse() ? $("lnWho").value : ui.view, inMonth: $("lnInMonth").checked });
    $("lnInMonth").checked = false;
    ["lnAmt", "lnName", "lnDue"].forEach(id => $(id).value = ""); $("loanBox").open = false; toast("Loan saved");
  });

  // ---------- splitting shared costs ----------
  function owesPairs() {
    // net amounts between each pair of people: who owes whom for shared costs
    const net = {};
    const add = (debtor, creditor, amt) => { if (!debtor || !creditor || debtor === creditor) return; const k = [debtor, creditor].sort().join("|"); net[k] = (net[k] || 0) + (debtor < creditor ? amt : -amt); };
    state.entries.forEach(e => {
      if (e.type !== "expense" || !e.split || !e.split.with || e.split.with === e.person) return;
      add(e.split.with, e.person, r2((+e.amount || 0) * (+e.split.share || 0.5)));
    });
    state.settlements.forEach(s => add(s.to, s.from, +s.amount || 0));
    return Object.keys(net).map(k => { const [a, b] = k.split("|"), v = r2(net[k]); return v > 0 ? { debtor: a, creditor: b, amt: v } : { debtor: b, creditor: a, amt: -v }; })
      .filter(p => p.amt >= 0.01 && (!meId() || p.debtor === meId() || p.creditor === meId() || isHouse()));
  }
  // positive => someone owes you (kept for the chat tools)
  function owesBalance() { const p = owesPairs()[0]; return p ? (p.creditor === meId() ? p.amt : -p.amt) : 0; }
  function renderOwes() {
    const pairs = owesPairs(), box = $("owesBar");
    if (!pairs.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = pairs.map((p, i) => ui.settling === i
      ? `<div class="owe-row"><span>Mark <b>${esc(money(p.amt))}</b> as paid by ${esc(pname(p.debtor))} to ${esc(pname(p.creditor))}?</span><span class="row-btns"><button class="primary" type="button" data-settle-ok="${i}">Yes, settled</button><button class="icon-btn" type="button" data-settle-no="1">Cancel</button></span></div>`
      : `<div class="owe-row"><span><i class="pdot" style="background:${pcolor(p.debtor)}"></i><b>${esc(p.debtor === meId() ? "You" : pname(p.debtor))}</b> ${p.debtor === meId() ? "owe" : "owes"} <b>${esc(p.creditor === meId() ? "you" : pname(p.creditor))}</b> <b class="num">${esc(money(p.amt))}</b> for shared costs</span>${readOnly ? "" : `<button class="ghost" type="button" data-settle="${i}">Settle up</button>`}</div>`).join("");
  }
  function settlePair(p) { backend.saveDoc("settlements", null, { from: p.debtor, to: p.creditor, amount: p.amt, date: todayISO(), created: Date.now() }); }
  $("owesBar").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.settle != null) { ui.settling = +b.dataset.settle; renderOwes(); }
    else if (b.dataset.settleNo) { ui.settling = null; renderOwes(); }
    else if (b.dataset.settleOk != null) { const p = owesPairs()[+b.dataset.settleOk]; if (p) settlePair(p); ui.settling = null; toast("Settled up"); }
  });

  // ---------- repeating entries ----------
  const recMonthsDue = r => {
    const now = monthKey(new Date()), today = new Date().getDate(), out = [];
    let k = r.startMonth || now;
    for (let i = 0; i < 13 && k <= now; i++, k = shiftMonth(k, 1)) {
      if (k === now && today < Math.min(+r.day || 1, daysIn(k))) break;
      if (!state.entries.some(e => e.id === "rec-" + r.id + "-" + k)) out.push(k);
    }
    return out;
  };
  function addRecurringFor(r, k) {
    const e = { type: r.type, amount: r2(r.amount), date: dateIn(k, r.day), person: r.person, category: r.category || "Other", note: r.note || "", created: Date.now(), recurringId: r.id };
    if (r.goalId) e.goalId = r.goalId;
    if (r.split) e.split = r.split;
    backend.addWithId("rec-" + r.id + "-" + k, e);
  }
  const autoDone = new Set();
  function processRecurring() {
    if (!state.ready || readOnly || !backend) return;
    state.recurring.filter(r => r.auto && !r.paused).forEach(r => recMonthsDue(r).forEach(k => {
      const key = r.id + k; if (autoDone.has(key)) return; autoDone.add(key); addRecurringFor(r, k);
    }));
  }
  function renderRecurring() {
    const who = ui.view;
    const list = state.recurring.filter(r => who === "all" || r.person === who);
    const due = list.filter(r => !r.auto && !r.paused).flatMap(r => recMonthsDue(r).map(k => ({ r, k })));
    const bar = $("dueBar");
    if (due.length) {
      bar.hidden = false;
      bar.innerHTML = `<span><b>Due:</b> ${due.slice(0, 3).map(({ r, k }) => esc((r.note || r.category) + " " + money(+r.amount, { whole: true }) + " (" + monthName(k, true) + ")")).join(" · ")}${due.length > 3 ? " and " + (due.length - 3) + " more" : ""}</span><button class="ghost" type="button" id="addDue">Add ${due.length === 1 ? "it" : "all " + due.length}</button>`;
      $("addDue").onclick = () => { due.forEach(({ r, k }) => addRecurringFor(r, k)); toast("Added"); };
    } else bar.hidden = true;
    $("recList").innerHTML = list.length ? list.map(r => {
      const tag = { expense: "Spent", income: "Income", save: "Save", withdraw: "Withdraw" }[r.type] || r.type;
      const asking = ui.confirm === "r:" + r.id;
      return `<div class="rec"><div><b>${esc(r.note || r.category)}</b><small>${tag} · ${esc(money(+r.amount))} · day ${r.day} each month${isHouse() ? " · " + esc(pname(r.person)) : ""} · ${r.paused ? "paused" : r.auto ? "added automatically" : "asks first"}</small></div>
        <span class="row-btns">${asking ? `<button class="icon-btn danger" type="button" data-rdel="${r.id}">Delete</button><button class="icon-btn" type="button" data-rno="1">Keep</button>` : `<button class="icon-btn" type="button" data-rpause="${r.id}">${r.paused ? "Resume" : "Pause"}</button><button class="icon-btn" type="button" data-rask="${r.id}" aria-label="Delete">✕</button>`}</span></div>`;
    }).join("") : `<div class="empty" style="padding:8px"><span>Nothing repeating yet.</span><span class="hint">Tick "Repeat every month" when adding salary, rent or a bill, or tell the chat "rent is 5,500 on the 1st every month".</span></div>`;
  }
  $("recList").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.rask) { ui.confirm = "r:" + b.dataset.rask; renderRecurring(); }
    else if (b.dataset.rno) { ui.confirm = null; renderRecurring(); }
    else if (b.dataset.rdel) { backend.removeDoc("recurring", b.dataset.rdel); ui.confirm = null; toast("Deleted. Entries already added stay."); }
    else if (b.dataset.rpause) { const r = state.recurring.find(x => x.id === b.dataset.rpause); if (r) backend.saveDoc("recurring", r.id, Object.assign({}, r, { paused: !r.paused })); }
  });
  function createRecurring(a) {
    const r = { type: ["expense", "income", "save", "withdraw"].includes(a.type) ? a.type : "expense", amount: r2(a.amount), category: a.category || (a.type === "income" ? "Salary" : "Other"),
      note: String(a.note || "").slice(0, 80), person: a.person || askerPersonSafe(), day: Math.min(31, Math.max(1, parseInt(a.day, 10) || new Date().getDate())),
      auto: a.auto !== false, startMonth: a.startMonth || monthKey(new Date()), created: Date.now() };
    if (a.goalId) r.goalId = a.goalId;
    if (a.split) r.split = a.split;
    return backend.saveDoc("recurring", null, r);
  }

  // ---------- budgets ----------
  const budgetsFor = who => ((state.settings.budgets || {})[who || ui.view]) || {};
  function spentIn(k, who, cat) {
    return sum(state.entries.filter(e => e.type === "expense" && effMonth(e) === k && countsMoney(e) && (who === "all" || e.person === who) && (!cat || (e.category || "Other") === cat)), e => +e.amount);
  }
  function renderBudgets() {
    const b = budgetsFor(ui.view), cats = Object.keys(b).filter(c => +b[c] > 0);
    const box = $("budgetList");
    if (ui.editBudgets) {
      const all = [...new Set(EXP_CATS.filter(c => c !== LOAN_OUT).concat(state.entries.filter(e => e.type === "expense").map(e => e.category).filter(c => c && c !== LOAN_OUT && c !== LOAN_BACK_OUT)))];
      box.innerHTML = `<p class="hint" style="margin:0">Monthly limits for ${esc(isHouse() ? "the " + houseName().toLowerCase() : isMine(ui.view) ? "you" : pname(ui.view))}. Leave empty for no limit.</p>` +
        all.map((c, i) => `<div class="bud-edit"><label for="bud${i}">${esc(c)}</label><input id="bud${i}" data-cat="${esc(c)}" type="number" inputmode="decimal" min="0" step="1" value="${b[c] || ""}" placeholder="No limit"></div>`).join("") +
        `<div class="formfoot"><button class="primary" type="button" id="budSave">Save budgets</button><button class="icon-btn" type="button" id="budCancel">Cancel</button></div>`;
      $("budSave").onclick = () => {
        const nb = {}; box.querySelectorAll("input[data-cat]").forEach(i => { const v = num(i.value); if (v > 0) nb[i.dataset.cat] = v; });
        const all2 = Object.assign({}, state.settings.budgets || {}); all2[ui.view] = nb;
        backend.saveSettings({ budgets: all2 }); ui.editBudgets = false; toast("Budgets saved");
      };
      $("budCancel").onclick = () => { ui.editBudgets = false; renderBudgets(); };
      $("budgetBtn").hidden = true; return;
    }
    $("budgetBtn").hidden = false;
    $("budgetBtn").textContent = cats.length ? "Edit budgets" : "Set budgets";
    box.innerHTML = cats.map(c => {
      const lim = +b[c], sp = spentIn(ui.month, ui.view, c), pct = Math.round(sp / lim * 100);
      const cls = pct >= 100 ? "over" : pct >= 80 ? "near" : "";
      return `<div class="bud ${cls}"><div class="bud-top"><span>${esc(c)}</span><span class="num">${esc(money(sp, { whole: true }))} of ${esc(money(lim, { whole: true }))}</span></div><div class="meter"><div style="width:${Math.min(100, pct)}%"></div></div><small>${pct >= 100 ? "Over by " + esc(money(sp - lim, { whole: true })) : esc(money(lim - sp, { whole: true })) + " left · " + pct + "% used"}</small></div>`;
    }).join("");
  }
  $("budgetBtn").addEventListener("click", () => { ui.editBudgets = true; renderBudgets(); });
  function budgetCheck(e) {
    if (e.type !== "expense") return;
    const k = (e.date || "").slice(0, 7), cat = e.category || "Other";
    [e.person, "all"].forEach(who => {
      const lim = +budgetsFor(who)[cat]; if (!(lim > 0)) return;
      const sp = spentIn(k, who, cat) + (state.entries.some(x => x.created === e.created) ? 0 : +e.amount);
      const before = sp - (+e.amount);
      const label = who === "all" ? houseName() : pname(who);
      if (sp >= lim && before < lim) setTimeout(() => toast(label + " is now over the " + cat + " budget (" + money(lim, { whole: true }) + ")"), 900);
      else if (sp >= lim * 0.8 && before < lim * 0.8) setTimeout(() => toast(label + " has used " + Math.round(sp / lim * 100) + "% of the " + cat + " budget"), 900);
    });
  }

  // ---------- trends (last 12 months) ----------
  function renderTrend() {
    const who = ui.view, months = [];
    for (let i = 11; i >= 0; i--) months.push(shiftMonth(ui.month, -i));
    const data = months.map(k => {
      const es = state.entries.filter(e => effMonth(e) === k && countsMoney(e) && (who === "all" || e.person === who));
      return { k, inc: sum(es.filter(e => e.type === "income"), e => +e.amount), out: sum(es.filter(e => e.type === "expense"), e => +e.amount) };
    });
    const max = Math.max(1, ...data.map(d => Math.max(d.inc, d.out)));
    const step = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / step) * step;
    const W = Math.max(300, Math.round($("trendChart").clientWidth || 640)), H = 200, L = 40, B = 24, T = 10, cw = (W - L - 6) / 12, bw = Math.max(3, Math.min(14, cw * 0.32));
    const y = v => T + (H - T - B) * (1 - v / top);
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Income and spending for the last 12 months">`;
    [0, 0.5, 1].forEach(f => { const v = top * f, yy = y(v); svg += `<line x1="${L}" x2="${W - 4}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end" class="ax">${v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v)}</text>`; });
    data.forEach((d, i) => {
      const cx = L + cw * i + cw / 2, cur = d.k === ui.month;
      const bar = (v, x, cls, lab) => v > 0 ? `<path class="${cls}" d="M${x},${y(0)} V${y(v) + 3} q0,-3 3,-3 h${bw - 6} q3,0 3,3 V${y(0)} Z"><title>${monthName(d.k, true)} ${lab}: ${money(v, { whole: true })}</title></path>` : "";
      svg += `<g class="mon${cur ? " cur" : ""}" data-k="${d.k}"><rect x="${cx - cw / 2}" y="${T}" width="${cw}" height="${H - T}" class="hit"/>` + bar(d.inc, cx - bw - 1, "inc", "income") + bar(d.out, cx + 1, "out", "spent") +
        `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="ax${cur ? " curt" : ""}">${new Date(d.k + "-01T00:00:00").toLocaleDateString(undefined, { month: "short" }).slice(0, cw < 30 ? 1 : 3)}</text></g>`;
    });
    svg += "</svg>";
    $("trendChart").innerHTML = svg;
    const tot = data.reduce((a, d) => ({ inc: a.inc + d.inc, out: a.out + d.out }), { inc: 0, out: 0 });
    $("trendNote").textContent = (who === "all" ? houseName() : isMine(who) ? "You" : pname(who)) + " · 12 months: in " + money(tot.inc, { whole: true }) + ", out " + money(tot.out, { whole: true });
  }
  $("trendChart").addEventListener("click", ev => { const g = ev.target.closest("g.mon"); if (g) { ui.month = g.dataset.k; render(); } });

  // ---------- search across all months ----------
  function searchEntries() {
    const q = ui.search.toLowerCase();
    return state.entries.filter(e => (isHouse() || e.person === ui.view) &&
      ((e.note || "") + " " + (e.category || "") + " " + String(e.amount) + " " + (e.ref || "")).toLowerCase().includes(q));
  }
  let searchT = null;
  $("searchQ").addEventListener("input", () => { clearTimeout(searchT); searchT = setTimeout(() => { ui.search = $("searchQ").value.trim(); renderLedger(); }, 200); });

  // ---------- add-entry form: split + repeat ----------
  function afterEntryAdded(e) {
    if ($("fRepeat").checked && !e.recurringId) {
      createRecurring({ type: e.type, amount: e.amount, category: e.category, note: e.note, person: e.person, day: +e.date.slice(8, 10), auto: true, startMonth: shiftMonth(e.date.slice(0, 7), 1), goalId: e.goalId, split: e.split });
      toast("Added. It will repeat every month on day " + (+e.date.slice(8, 10)) + ".");
    }
    $("fRepeat").checked = false; $("fSplit").checked = false;
    budgetCheck(e);
  }
  $("ledger").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-edit]"); if (!b) return;
    const e = state.entries.find(x => x.id === b.dataset.edit); if (!e) return;
    $("fSplit").checked = !!e.split; $("fRepeat").checked = false; renderExtrasForm();
  });
  function renderExtrasForm() {
    $("splitRow").hidden = ui.type !== "expense" || people().length < 2;
    $("splitLabel").textContent = "Split half with " + pname(otherOf(entryWhoSafe()));
    $("repeatRow").hidden = !!ui.editId;
  }
  const entryWhoSafe = () => { try { return entryWho(); } catch { return meId(); } };
  const askerPersonSafe = () => meId() || ui.view;

  // ---------- share a screenshot into the app ----------
  async function takeSharedFiles() {
    if (!/[?&]shared=1/.test(location.search)) { try { if (window.caches) caches.delete("pl-share"); } catch {} return; }
    history.replaceState(null, "", location.pathname);
    try {
      const c = await caches.open("pl-share"); const keys = await c.keys(); const files = [];
      for (const k of keys) { const r = await c.match(k); const b = await r.blob(); files.push(new File([b], decodeURIComponent(k.url.split("/").pop()) || "shared.jpg", { type: b.type || "image/jpeg" })); await c.delete(k); }
      if (!files.length) return;
      if (!aiReady()) { toast("Add the Gemini key in Settings to read shared screenshots."); return; }
      startScan(files.slice(0, 4));
    } catch { toast("Couldn't open the shared image."); }
  }

  // ---------- app lock (this device) ----------
  const LOCK_LS = "pl-lock";
  const lockCfg = () => { try { return JSON.parse(localStorage.getItem(LOCK_LS) || "null"); } catch { return null; } };
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function hashPin(pin, salt) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pin)); return b64(d); }
  let lockedAt = 0, pinBuf = "";
  function showLock() {
    const cfg = lockCfg(); if (!cfg) return;
    pinBuf = ""; $("lockDots").textContent = ""; $("lockErr").hidden = true; $("lockErr").textContent = "That PIN isn't right.";
    $("lockBio").hidden = !cfg.cred; $("lock").hidden = false;
    if (cfg.cred) setTimeout(tryBio, 250);
  }
  async function tryBio() {
    const cfg = lockCfg(); if (!cfg || !cfg.cred) return;
    try {
      await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: unb64(cfg.cred) }], userVerification: "required", timeout: 60000 } });
      $("lock").hidden = true;
    } catch { $("lockErr").textContent = "Fingerprint didn't work. Enter your PIN instead."; $("lockErr").hidden = false; }
  }
  $("lockPad").addEventListener("click", async ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.k === "del") pinBuf = pinBuf.slice(0, -1);
    else if (b.dataset.k === "bio") { tryBio(); return; }
    else if (pinBuf.length < 8) pinBuf += b.dataset.k;
    $("lockDots").textContent = "•".repeat(pinBuf.length);
    const cfg = lockCfg();
    if (cfg && pinBuf.length >= 4 && await hashPin(pinBuf, cfg.salt) === cfg.hash) { $("lock").hidden = true; pinBuf = ""; }
    else if (cfg && pinBuf.length >= 8) { $("lockErr").textContent = "That PIN isn't right."; $("lockErr").hidden = false; pinBuf = ""; $("lockDots").textContent = ""; }
  });
  $("lockBio").addEventListener("click", tryBio);
  document.addEventListener("visibilitychange", () => {
    if (!lockCfg()) return;
    if (document.hidden) lockedAt = Date.now();
    else if (lockedAt && Date.now() - lockedAt > 60000) showLock();
  });
  function renderLockSettings() {
    const on = !!lockCfg();
    $("lockState").textContent = on ? "On: Pocket Ledger asks for your PIN" + (lockCfg().cred ? " or fingerprint" : "") + " when opened, and after a minute away." : "Off.";
    $("lockOn").hidden = on; $("lockOff").hidden = !on; $("lockBioAdd").hidden = !on || !!lockCfg().cred || !window.PublicKeyCredential;
    $("lockSetup").hidden = true;
  }
  $("lockOn").addEventListener("click", () => { $("lockSetup").hidden = false; $("lockPin1").value = ""; $("lockPin2").value = ""; $("lockPin1").focus(); });
  $("lockSave").addEventListener("click", async () => {
    const a = $("lockPin1").value.trim(), b = $("lockPin2").value.trim();
    if (!/^\d{4,8}$/.test(a)) return toast("Use 4 to 8 digits.");
    if (a !== b) return toast("The two PINs don't match.");
    const salt = b64(crypto.getRandomValues(new Uint8Array(12)));
    localStorage.setItem(LOCK_LS, JSON.stringify({ salt, hash: await hashPin(a, salt) }));
    renderLockSettings(); toast("App lock is on");
  });
  $("lockOff").addEventListener("click", () => { try { localStorage.removeItem(LOCK_LS); } catch {} renderLockSettings(); toast("App lock is off"); });
  $("lockBioAdd").addEventListener("click", async () => {
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Pocket Ledger" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "pocket-ledger", displayName: "Pocket Ledger" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }, timeout: 60000 } });
      const cfg = lockCfg(); cfg.cred = b64(cred.rawId); localStorage.setItem(LOCK_LS, JSON.stringify(cfg));
      renderLockSettings(); toast("Fingerprint added");
    } catch { toast("Fingerprint wasn't set up. You can still use your PIN."); }
  });
  $("settingsBtn").addEventListener("click", renderLockSettings);
  if (lockCfg()) showLock();

  // ---------- hook everything into the main render ----------
  function renderExtras() {
    try { renderLoans(); renderRecurring(); renderOwes(); renderBudgets(); renderTrend(); renderExtrasForm(); processRecurring(); } catch (err) { console.error(err); }
  }
  render = (orig => function () { orig(); renderExtras(); })(render);
  renderFormBits = (orig => function () { orig(); try { renderExtrasForm(); } catch {} })(renderFormBits);
  let trendT = null;
  window.addEventListener("resize", () => { clearTimeout(trendT); trendT = setTimeout(() => { try { renderTrend(); } catch {} }, 200); });
