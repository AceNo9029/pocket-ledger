
  // ---------- Ask Gemini (chat about your money) ----------
  const chat = { msgs: [], busy: false, abort: null };
  const round2 = n => Math.round((+n || 0) * 100) / 100;
  const askerPerson = () => meId();

  function resolvePerson(p) {
    if (!p) return "all";
    const s = String(p).trim().toLowerCase();
    if (["all", "household", "everyone", "both", "us", "we"].includes(s)) return "all";
    if (["me", "i", "asker", "my", "mine"].includes(s)) return askerPerson();
    if (people().some(x => x.id === p)) return p;
    const hit = people().find(x => x.name.trim().toLowerCase() === s) || people().find(x => s.includes(x.name.trim().toLowerCase()));
    return hit ? hit.id : "all";
  }
  const whoLabel = who => who === "all" ? houseName() : pname(who);
  const goalNameOf = id => (state.goals.find(g => g.id === id) || {}).name || "";
  const isoOk = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));

  function filterEntries(a) {
    a = a || {};
    const who = resolvePerson(a.person);
    const from = isoOk(a.from) ? a.from : "0000-01-01", to = isoOk(a.to) ? a.to : "9999-12-31";
    const wantsLoans = /loan/i.test(String([].concat(a.category || []).join(" ") + " " + (a.search || "")));
    let es = state.entries.filter(e => (who === "all" || e.person === who) && (e.date || "") >= from && (e.date || "") <= to && (wantsLoans || countsMoney(e)));
    const type = a.type && a.type !== "all" ? String(a.type) : null;
    if (type) es = es.filter(e => e.type === type);
    const cats = [].concat(a.category || []).filter(Boolean).map(c => String(c).toLowerCase());
    if (cats.length) es = es.filter(e => { const c = (e.category || "").toLowerCase(); return cats.some(x => c === x || c.includes(x) || x.includes(c) && c.length > 3); });
    if (a.search) { const q = String(a.search).toLowerCase(); es = es.filter(e => ((e.note || "") + " " + (e.category || "") + " " + goalNameOf(e.goalId)).toLowerCase().includes(q)); }
    return { es, who, from: isoOk(a.from) ? a.from : "first entry", to: isoOk(a.to) ? a.to : "latest entry" };
  }

  const TOOLS = {
    totals(a) {
      const { es, who, from, to } = filterEntries(a);
      const res = { person: whoLabel(who), from, to, type: a.type || "all", category: a.category || null, search: a.search || null, total: round2(sum(es, e => +e.amount)), count: es.length };
      const by = a.groupBy;
      if (by && by !== "none") {
        const g = {};
        es.forEach(e => {
          const k = by === "category" ? (e.category || "Other") : by === "month" ? (e.date || "").slice(0, 7) : by === "person" ? pname(e.person) : by === "type" ? e.type : by === "day" ? e.date : "all";
          (g[k] = g[k] || { key: k, total: 0, count: 0 }); g[k].total += +e.amount; g[k].count++;
        });
        res.groups = Object.values(g).map(x => Object.assign(x, { total: round2(x.total) })).sort((x, y) => by === "month" || by === "day" ? x.key.localeCompare(y.key) : y.total - x.total).slice(0, 40);
      }
      return res;
    },
    list(a) {
      const { es, who, from, to } = filterEntries(a);
      const lim = Math.max(1, Math.min(+a.limit || 15, 40));
      const sorted = es.slice().sort(a.sort === "largest" ? (x, y) => y.amount - x.amount : a.sort === "oldest" ? (x, y) => x.date.localeCompare(y.date) : (x, y) => y.date.localeCompare(x.date));
      return { person: whoLabel(who), from, to, count: es.length, shown: sorted.slice(0, lim).map(e => ({ date: e.date, type: e.type, amount: +e.amount, category: e.category || "", note: e.note || "", person: pname(e.person), goal: goalNameOf(e.goalId) || undefined })) };
    },
    month_summary(a) {
      const k = /^\d{4}-\d{2}$/.test(String(a.month || "")) ? a.month : monthKey(new Date());
      const who = resolvePerson(a.person);
      const es = state.entries.filter(e => effMonth(e) === k && countsMoney(e) && (who === "all" || e.person === who));
      const t = { income: 0, spent: 0, save: 0, withdraw: 0 }; const cats = {};
      es.forEach(e => { const v = +e.amount || 0; if (e.type === "income") t.income += v; else if (e.type === "expense") { t.spent += v; cats[e.category || "Other"] = (cats[e.category || "Other"] || 0) + v; } else if (e.type === "save") t.save += v; else if (e.type === "withdraw") t.withdraw += v; });
      return { month: k, person: whoLabel(who), income: round2(t.income), spent: round2(t.spent), moved_to_savings: round2(t.save - t.withdraw), left_to_spend: round2(t.income - t.spent - (t.save - t.withdraw)),
        top_spending: Object.entries(cats).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([c, v]) => ({ category: c, total: round2(v) })) };
    },
    goals(a) {
      const who = resolvePerson(a.person); const nowK = monthKey(new Date());
      return visibleGoals(who).map(g => {
        const bal = goalBalance(g.id), tgt = +g.target || 0, m = g.by ? monthsBetween(nowK, g.by) : null;
        return { name: g.name, owner: g.owner === "shared" ? "Shared" : pname(g.owner), target: tgt, saved: round2(bal), percent: tgt ? Math.round(bal / tgt * 100) : 0, remaining: round2(Math.max(tgt - bal, 0)),
          target_month: g.by || null, months_left: m, needed_per_month: m && m > 0 && tgt > bal ? round2((tgt - bal) / m) : null,
          contributions: people().map(p => ({ person: p.name, saved: round2(goalBalance(g.id, p.id)) })) };
      });
    },
    savings(a) {
      const who = resolvePerson(a.person);
      const total = totalSavings(null, who), inGoals = sum(visibleGoals(who), g => goalBalance(g.id, who));
      return { person: whoLabel(who), total_savings: round2(total), in_goals: round2(inGoals), not_in_a_goal: round2(total - inGoals) };
    }
  };
  // more lookups
  TOOLS.loans = a => {
    const who = resolvePerson(a && a.person);
    return state.loans.filter(l => who === "all" || l.person === who).map(l => ({ with: l.counterparty, direction: l.direction === "lent" ? "lent to them" : "borrowed from them", whose: pname(l.person),
      amount: +l.amount, still_owed: loanOutstanding(l), date: l.date, due: l.due || null, paid_off: loanOutstanding(l) <= 0.004 }));
  };
  TOOLS.budgets = a => {
    const who = resolvePerson(a && a.person), k = /^\d{4}-\d{2}$/.test(String((a && a.month) || "")) ? a.month : monthKey(new Date()), b = budgetsFor(who);
    return { person: whoLabel(who), month: k, budgets: Object.keys(b).map(c => ({ category: c, limit: +b[c], spent: round2(spentIn(k, who, c)), left: round2(+b[c] - spentIn(k, who, c)) })) };
  };
  TOOLS.owed = () => { const ps = owesPairs(); return !ps.length ? { status: "nobody owes anything for shared costs" } : { owing: ps.map(p => ({ owes: pname(p.debtor), to: pname(p.creditor), amount: p.amt })) }; };
  TOOLS.repeating = a => { const who = resolvePerson(a && a.person); return state.recurring.filter(r => who === "all" || r.person === who).map(r => ({ what: r.note || r.category, type: r.type, amount: +r.amount, day: r.day, whose: pname(r.person), automatic: !!r.auto, paused: !!r.paused })); };
  const TOOL_LABEL = { totals: "totals", list: "entries", month_summary: "month summary", goals: "goals", savings: "savings", loans: "loans", budgets: "budgets", owed: "shared costs", repeating: "repeating entries" };
  const ACTIONS = ["propose_entries", "add_loan", "loan_repayment", "create_goal", "set_budget", "add_recurring", "settle_up"];

  function chatContext() {
    const cats = [...new Set(EXP_CATS.concat(INC_CATS, state.entries.map(e => e.category).filter(Boolean)))];
    const dates = state.entries.map(e => e.date).filter(Boolean).sort();
    const loans = openLoans("all");
    return [
      "- Today is " + todayISO() + " (" + new Date().toLocaleDateString("en-GB", { weekday: "long" }) + "). Currency: " + (state.settings.currency || "MVR") + ". \"10k\" means 10,000.",
      "- People: " + people().map(p => p.name).join(", ") + ". The person talking to you is " + pname(askerPerson()) + ". The app screen is showing " + whoLabel(ui.view) + " for " + monthName(ui.month) + ".",
      "- Categories in use: " + cats.join(", ") + ".",
      "- Savings goals: " + (state.goals.length ? state.goals.map(g => g.name + " (" + (g.owner === "shared" ? "shared" : pname(g.owner)) + ")").join(", ") : "none") + ".",
      "- Open loans: " + (loans.length ? loans.map(l => (l.direction === "lent" ? pname(l.person) + " lent " : pname(l.person) + " borrowed from ") + l.counterparty + " (" + loanOutstanding(l) + " still owed)").join("; ") : "none") + ".",
      "- Data: " + state.entries.length + " entries" + (dates.length ? ", from " + dates[0] + " to " + dates[dates.length - 1] : "") + "."
    ].join("\n");
  }
  const historyText = () => chat.msgs.filter(m => !m.pending).slice(-9, -1).map(m => (m.role === "user" ? "User: " : "Assistant: ") + m.text).join("\n") || "(none)";

  function quickFacts() {
    const now = monthKey(new Date()), prev = shiftMonth(now, -1), me = askerPerson();
    const f = { this_month: TOOLS.month_summary({ month: now, person: me }), last_month: TOOLS.month_summary({ month: prev, person: me }) };
    if (isGroup()) f.group_this_month = TOOLS.month_summary({ month: now, person: "all" });
    try { f.savings = TOOLS.savings({ person: me }); } catch {}
    try { f.goals = TOOLS.goals({ person: me }).map(g => ({ name: g.name, saved: g.saved, target: g.target, percent: g.percent })); } catch {}
    try { f.owed = TOOLS.owed(); } catch {}
    try { f.bills = TOOLS.repeating({ person: me }); } catch {}
    return JSON.stringify(f).slice(0, 6000);
  }
  function planPrompt(q, voice) {
    return [
      "You are the assistant inside Pocket Ledger, a household money tracker. You can look things up and you can prepare changes (the user confirms them with one tap). Decide what to do for the latest message. Reply with JSON only.",
      "", "Context:", chatContext(), "",
      "Quick facts (already worked out, exact): " + quickFacts(), "",
      "Lookups:",
      '- totals {from, to, person, type, category, search, groupBy}: sum and count of matching entries. groupBy: "category", "month", "person", "type", "day" or "none".',
      '- list {from, to, person, type, category, search, sort, limit}: individual entries. sort: "newest", "oldest" or "largest".',
      '- month_summary {month, person}: income, spending, savings and what is left for one month ("YYYY-MM").',
      "- goals {person}, savings {person}, loans {person}, budgets {month, person}, owed {} (who owes whom for shared costs), repeating {person}.",
      "",
      "Changes (prepared for the user to confirm):",
      "- propose_entries {entries: [{type, amount, date, category, note, person, goal, split}]}: record income, spending, savings or withdrawals. split: true when the user says it was shared with their partner and should be split half each.",
      '- add_loan {direction, counterparty, amount, date, due, note, person}: money lent ("direction": "lent") or borrowed ("borrowed"). counterparty is the other person\'s name.',
      "- loan_repayment {counterparty, amount, date, person}: part or all of an open loan was paid back.",
      "- create_goal {name, target, by, owner}: a savings goal. by is \"YYYY-MM\" or null. owner is a person's name or \"shared\".",
      "- set_budget {category, amount, person}: a monthly spending limit for a category.",
      "- add_recurring {type, amount, category, note, person, day}: a monthly reminder for something due on a day each month (rent, bills, phone, electricity, class fees). It reminds; the user marks it paid.",
      "- settle_up {}: the partners have settled what they owe each other for shared costs.",
      "",
      'Rules: person is "me" for the person talking ("I", "my"), a person\'s name, or "all" for the household ("we", "our"). If unclear for lookups, use "all"; for changes, use "me". type is expense, income, save or withdraw. Dates are YYYY-MM-DD; work out relative dates from today; default to today. Use existing category names when one fits. Understand casual speech, slang and mixed languages. Use at most 4 calls.',
      "If something essential for a change is missing (like the amount, or the name of the person in a loan), don't guess: return no calls and ask one short question in reply. If the user then says they don't want to say, use \"Friend\" as the name.",
      "",
      "Conversation so far:", historyText(), "",
      voice ? "Latest message: the attached voice recording. First write exactly what was said in \"heard\"." : "Latest message: " + q, "",
      'Reply with exactly: {"heard": ' + (voice ? '"what was said"' : "null") + ', "calls": [{"tool": "...", "args": {...}}], "reply": null, "suggestions": []}. When you only prepare changes, put one short friendly line in reply (e.g. "Got it, a 10,000 loan to Ali. Tap Confirm to save it.").',
      "If nothing needs looking up or changing (a greeting, a question about the app, or a clarifying question), return an empty calls list and put your reply in reply, with 0-3 short suggestions the user might tap next (for a clarifying question, likely answers).",
      "FAST PATH: if the Quick facts already answer the question exactly (this or last month's income, spending, top categories, what's left, savings, goals, who owes whom, bills), don't make any calls: answer directly in reply (1-3 sentences, amounts like \"MVR 1,250.00\", **bold** for the key number, say which period) with 2-3 suggestions. Use lookups only when the facts don't cover it (other dates, a specific category or shop, lists of entries)."
    ].join("\n");
  }
  function answerPrompt(q, results) {
    return [
      "You are the assistant inside Pocket Ledger, a household money tracker. Reply to the latest message using ONLY the results below.",
      "Match the user's tone (casual is fine) but stay clear. Be brief: 1-3 sentences, or a short list with lines starting \"- \". Use amounts like \"MVR 1,250.00\" and say which period and whose money you mean. You may use **bold** for the key number. No headings.",
      "When changes were prepared, say in one line what will be saved and that they just need to tap Confirm. Don't claim anything is saved yet.",
      "If the results don't contain what is needed, say so and suggest a way to ask. Only give money advice if asked; keep it simple and kind.",
      "", "Context:", chatContext(), "",
      "Conversation so far:", historyText(), "",
      "Latest message: " + q, "",
      "Results (JSON):", JSON.stringify(results).slice(0, 60000), "",
      'Reply with JSON only: {"reply": "your answer", "suggestions": ["...", "..."]}. suggestions are 2-3 short follow-ups the user might want next, written as the user would say them (for example "Show those entries", "Compare with last month", "Set an eating out budget of 1,500"). Make them specific to this answer and doable in the app.'
    ].join("\n");
  }

  // ---------- prepared changes (confirm card) ----------
  const findGoal = n => n ? state.goals.find(g => g.name.toLowerCase() === String(n).toLowerCase()) || state.goals.find(g => g.name.toLowerCase().includes(String(n).toLowerCase())) : null;
  const meIfAll = p => { if (spaceMode()) return meId(); const w = resolvePerson(p || "me"); return w === "all" ? askerPerson() : w; };
  function prepareAction(tool, a) {
    a = a || {};
    const cur = c => money(+c || 0);
    if (tool === "propose_entries") {
      const list = (Array.isArray(a.entries) ? a.entries : []).filter(t => +t.amount > 0).slice(0, 10).map(t => {
        const type = ["expense", "income", "save", "withdraw"].includes(t.type) ? t.type : "expense", person = meIfAll(t.person), goal = findGoal(t.goal);
        const e = { type, amount: round2(t.amount), date: isoOk(t.date) ? t.date : todayISO(), person, category: String(t.category || (type === "income" ? "Salary" : type === "save" || type === "withdraw" ? "Savings" : "Other")), note: String(t.note || "").slice(0, 80), source: "chat" };
        if (goal && (type === "save" || type === "withdraw")) e.goalId = goal.id;
        if (t.split && type === "expense") e.split = { with: otherOf(person), share: 0.5 };
        return e;
      });
      if (!list.length) return null;
      return { tool, entries: list, lines: list.map(e => ({ expense: "Spent", income: "Income", save: "Save", withdraw: "Withdraw" }[e.type]) + " " + cur(e.amount) + " · " + (e.note || e.category) + " · " + fmtDate(e.date) + " · " + pname(e.person) + (e.split ? " · split with " + pname(e.split.with) : "") + (e.goalId ? " · " + goalNameOf(e.goalId) : "")) };
    }
    if (tool === "add_loan") {
      if (!(+a.amount > 0)) return null;
      const d = { direction: a.direction === "borrowed" ? "borrowed" : "lent", counterparty: String(a.counterparty || "Friend").slice(0, 40), amount: round2(a.amount), date: isoOk(a.date) ? a.date : todayISO(), due: isoOk(a.due) ? a.due : "", note: a.note || "", person: meIfAll(a.person) };
      return { tool, data: d, lines: [(d.direction === "lent" ? "Loan to " : "Loan from ") + d.counterparty + " · " + cur(d.amount) + " · " + fmtDate(d.date) + " · " + pname(d.person) + (d.due ? " · due " + fmtDate(d.due) : "")] };
    }
    if (tool === "loan_repayment") {
      const person = a.person ? resolvePerson(a.person) : "all", loan = findLoan(a.counterparty, person);
      if (!loan) return { tool, invalid: true, lines: ["No open loan with " + (a.counterparty || "that person") + " found"] };
      const amt = round2(+a.amount > 0 ? Math.min(+a.amount, loanOutstanding(loan)) : loanOutstanding(loan));
      return { tool, loan, amount: amt, date: isoOk(a.date) ? a.date : todayISO(), lines: [(loan.direction === "lent" ? loan.counterparty + " paid back " : "Paid back " + loan.counterparty + " ") + cur(amt) + (amt >= loanOutstanding(loan) - 0.004 ? " (fully paid)" : " (" + cur(loanOutstanding(loan) - amt) + " still owed)")] };
    }
    if (tool === "create_goal") {
      if (!a.name || !(+a.target > 0)) return null;
      const owner = String(a.owner || "").toLowerCase() === "shared" ? "shared" : meIfAll(a.owner);
      const by = /^\d{4}-\d{2}$/.test(String(a.by || "")) ? a.by : "";
      return { tool, data: { name: String(a.name).slice(0, 40), target: round2(a.target), by, owner, created: Date.now() }, lines: ["New goal: " + a.name + " · " + cur(a.target) + (by ? " by " + monthName(by, true) : "") + " · " + pname(owner)] };
    }
    if (tool === "set_budget") {
      if (!a.category || !(+a.amount >= 0)) return null;
      const who = a.person ? resolvePerson(a.person) : ui.view;
      return { tool, who, category: String(a.category), amount: round2(a.amount), lines: ["Budget: " + a.category + " · " + cur(a.amount) + " a month · " + whoLabel(who)] };
    }
    if (tool === "add_recurring") {
      if (!(+a.amount > 0)) return null;
      const d = { type: ["expense", "income", "save", "withdraw"].includes(a.type) ? a.type : "expense", amount: round2(a.amount), category: a.category, note: a.note || "", person: meIfAll(a.person), day: parseInt(a.day, 10) || new Date().getDate(), auto: a.auto !== false };
      return { tool, data: d, lines: ["Every month on day " + d.day + ": " + (d.note || d.category || d.type) + " · " + cur(d.amount) + " · " + pname(d.person) + (d.auto ? " · reminder" : " · reminder")] };
    }
    if (tool === "settle_up") {
      const p = owesPairs()[0]; if (!p) return { tool, invalid: true, lines: ["Nothing to settle: nobody owes anything for shared costs"] };
      return { tool, pair: p, lines: [pname(p.debtor) + " pays " + pname(p.creditor) + " " + cur(p.amt) + " (settled)"] };
    }
    return null;
  }
  function runAction(x) {
    if (x.invalid) return;
    if (x.tool === "propose_entries") x.entries.forEach((e, i) => { const ee = Object.assign({ created: Date.now() + i }, e); backend.add(ee); budgetCheck(ee); });
    else if (x.tool === "add_loan") createLoan(x.data);
    else if (x.tool === "loan_repayment") recordRepayment(x.loan, x.amount, x.date);
    else if (x.tool === "create_goal") backend.saveGoal(null, x.data);
    else if (x.tool === "set_budget") { const all = Object.assign({}, state.settings.budgets || {}); const b = Object.assign({}, all[x.who] || {}); if (x.amount > 0) b[x.category] = x.amount; else delete b[x.category]; all[x.who] = b; backend.saveSettings({ budgets: all }); }
    else if (x.tool === "add_recurring") createRecurring(x.data);
    else if (x.tool === "settle_up") settlePair(x.pair);
  }

  function fmtReply(t) {
    return esc(String(t || "").trim()).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .split("\n").map(l => /^\s*[-•]\s+/.test(l) ? "<span class=\"li\">" + l.replace(/^\s*[-•]\s+/, "") + "</span>" : l).join("<br>")
      .replace(/<br>(<span class="li">)/g, "$1").replace(/(<\/span>)<br>/g, "$1");
  }
  function renderChat() {
    const box = $("chatMsgs");
    if (!chat.msgs.length) {
      const sugg = ["How much did we spend this month?", "I lent Ali 10k today", "Rent is 5,500 on the 1st every month", "Who owes who?"];
      box.innerHTML = `<div class="chat-empty"><p>Ask about your money, or tell me what happened, by typing or with the mic. I'll look up exact numbers, and I'll prepare any changes for you to confirm.</p><div class="chips">${sugg.map(s => `<button type="button" class="chipq">${esc(s)}</button>`).join("")}</div></div>`;
    } else {
      box.innerHTML = chat.msgs.map((m, i) => m.role === "user"
        ? `<div class="msg me">${m.voice ? '<span class="vtag">🎙</span> ' : ""}${esc(m.text)}</div>`
        : `<div class="msg ai${m.error ? " err" : ""}"><div>${m.pending ? '<span class="spin" aria-hidden="true"></span>' + esc(m.pendingText || "Thinking…") : fmtReply(m.text)}</div>` +
          (m.actions && m.actions.length ? `<div class="act-card${m.done ? " done" : ""}">${m.actions.map(x => `<div class="act-line${x.invalid ? " bad" : ""}">${esc(x.lines.join(" · "))}</div>`).join("")}` +
            (m.done ? `<small>${m.done === "yes" ? "Saved ✓" : "Not saved"}</small>` : m.actions.some(x => !x.invalid) ? `<div class="row-btns"><button class="primary" type="button" data-ok="${i}">Confirm</button>${m.actions.length === 1 && m.actions[0].tool === "propose_entries" ? `<button class="ghost" type="button" data-editact="${i}">Edit first</button>` : ""}<button class="icon-btn" type="button" data-no="${i}">Not now</button></div>` : "") + `</div>` : "") +
          (m.note ? `<small>${esc(m.note)}</small>` : "") +
          (i === chat.msgs.length - 1 && !m.pending && !chat.busy && m.sugg && m.sugg.length ? `<div class="chips follow">${m.sugg.filter(x => typeof x === "string" && x.trim()).slice(0, 3).map(x => `<button type="button" class="chipq">${esc(x.trim().slice(0, 80))}</button>`).join("")}</div>` : "") +
          (m.action === "settings" ? `<button type="button" class="ghost" data-act="settings">Open Settings</button>` : "") + `</div>`).join("");
    }
    box.scrollTop = box.scrollHeight;
    $("chatSend").disabled = chat.busy || rec.on;
    $("chatStop").hidden = !chat.busy;
    $("chatMic").classList.toggle("rec", rec.on);
    $("chatMic").setAttribute("aria-label", rec.on ? "Stop recording" : "Speak");
    $("chatRecBar").hidden = !rec.on;
    $("chatSpeak").setAttribute("aria-pressed", String(speakOn()));
  }
  function openChat() { $("chatPanel").hidden = false; document.body.classList.add("chat-open"); renderChat(); setTimeout(() => { if (matchMedia("(hover: hover)").matches) $("chatInput").focus(); }, 50); }
  function closeChat() { if (rec.on) stopRec(true); $("chatPanel").hidden = true; document.body.classList.remove("chat-open"); try { speechSynthesis.cancel(); } catch {} }
  $("chatBtn").addEventListener("click", openChat);
  $("chatFab").addEventListener("click", openChat);
  $("chatClose").addEventListener("click", closeChat);
  $("chatClear").addEventListener("click", () => { if (chat.abort) chat.abort.abort(); chat.msgs = []; chat.busy = false; renderChat(); });
  $("chatStop").addEventListener("click", () => { if (chat.abort) chat.abort.abort(); });
  $("chatMsgs").addEventListener("click", ev => {
    const c = ev.target.closest(".chipq"); if (c) { $("chatInput").value = c.textContent; askChat(); return; }
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.act === "settings") { closeChat(); openSettings(); return; }
    const m = chat.msgs[+(b.dataset.ok || b.dataset.no || b.dataset.editact)]; if (!m || m.done) return;
    if (b.dataset.ok !== undefined) { m.actions.forEach(runAction); m.done = "yes"; toast("Saved"); renderChat(); }
    else if (b.dataset.no !== undefined) { m.done = "no"; renderChat(); }
    else if (b.dataset.editact !== undefined) { m.done = "no"; closeChat(); showProposals(m.actions[0].entries); $("scanPanel").scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
  $("chatForm").addEventListener("submit", ev => { ev.preventDefault(); askChat(); });
  $("chatInput").addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.shiftKey && matchMedia("(hover: hover)").matches) { ev.preventDefault(); askChat(); } });
  $("chatInput").addEventListener("input", () => { const t = $("chatInput"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; });

  function showProposals(list) {
    scanItems = list.map(e => ({ include: true, type: e.type, typeKnown: true, amount: e.amount, date: e.date, currency: state.settings.currency || "MVR", currencyOk: true,
      category: e.category, note: e.note, goalId: e.goalId || "", person: e.person, ref: "", confidence: "high", questions: [] }));
    if (!scanItems.length) return false;
    $("scanTitle").textContent = "Check before adding";
    setScanStatus("From your chat. Change anything that's not right, then add.", false);
    $("scanErr").hidden = true; $("scanPanel").hidden = false;
    renderScan();
    return true;
  }

  // ---------- voice: record, then Gemini listens ----------
  const rec = { on: false, mr: null, chunks: [], stream: null, t0: 0, timer: null };
  const speakOn = () => lsGet("pl-speak") !== "0";
  $("chatSpeak").addEventListener("click", () => { lsSet("pl-speak", speakOn() ? "0" : ""); if (!speakOn()) try { speechSynthesis.cancel(); } catch {} renderChat(); });
  $("chatMic").addEventListener("click", () => rec.on ? stopRec(false) : startRec());
  $("chatRecCancel").addEventListener("click", () => stopRec(true));
  async function startRec() {
    if (chat.busy) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast("Voice isn't supported in this browser."); return; }
    try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { toast("Allow microphone access to talk to Pocket Ledger."); return; }
    try { speechSynthesis.cancel(); } catch {}
    rec.chunks = []; rec.mr = new MediaRecorder(rec.stream);
    rec.mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
    rec.mr.start(); rec.on = true; rec.t0 = Date.now();
    rec.timer = setInterval(() => { const s = Math.floor((Date.now() - rec.t0) / 1000); $("chatRecTime").textContent = "0:" + String(s).padStart(2, "0"); if (s >= 59) stopRec(false); }, 250);
    $("chatRecTime").textContent = "0:00";
    renderChat();
  }
  function stopRec(cancel) {
    if (!rec.on) return;
    clearInterval(rec.timer); rec.on = false;
    const mr = rec.mr, stream = rec.stream;
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      renderChat();
      if (cancel || Date.now() - rec.t0 < 600) return;
      try { const wav = await toWav(new Blob(rec.chunks, { type: mr.mimeType || "audio/webm" })); askChat(wav); }
      catch { toast("Couldn't use that recording. Try again."); }
    };
    try { mr.stop(); } catch { stream.getTracks().forEach(t => t.stop()); }
    renderChat();
  }
  async function toWav(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC(); const buf = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close && ctx.close();
    const rate = 16000, len = Math.max(1, Math.ceil(buf.duration * rate));
    const off = new OfflineAudioContext(1, len, rate); const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
    const out = (await off.startRendering()).getChannelData(0);
    const ab = new ArrayBuffer(44 + out.length * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + out.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, out.length * 2, true);
    for (let i = 0; i < out.length; i++) { const s = Math.max(-1, Math.min(1, out[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    let bin = ""; const bytes = new Uint8Array(ab); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function speak(text) {
    if (!speakOn() || !window.speechSynthesis) return;
    try {
      const plain = String(text).replace(/\*\*/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/MVR\s?/g, "rufiyaa ").slice(0, 600);
      const u = new SpeechSynthesisUtterance(plain); u.rate = 1.05; speechSynthesis.cancel(); setTimeout(() => { try { speechSynthesis.speak(u); } catch {} }, 60);
    } catch {}
  }

  async function askChat(voiceWav) {
    const typed = $("chatInput").value.trim();
    if ((!typed && !voiceWav) || chat.busy) return;
    const voice = !!voiceWav;
    if (!voice) { $("chatInput").value = ""; $("chatInput").style.height = "auto"; }
    const userMsg = { role: "user", text: voice ? "…" : typed, voice };
    chat.msgs.push(userMsg);
    const reply = { role: "model", text: "", pending: true, pendingText: voice ? "Listening…" : "Thinking…" };
    chat.msgs.push(reply);
    chat.busy = true; const ctl = new AbortController(); chat.abort = ctl;
    renderChat();
    try {
      const plan = parseJsonText(await geminiText(planPrompt(typed, voice), [], { json: true, signal: ctl.signal, audio: voiceWav }));
      if (voice) { userMsg.text = String((plan && plan.heard) || "(voice message)").slice(0, 400); reply.pendingText = "Thinking…"; renderChat(); }
      const q = userMsg.text;
      const calls = (Array.isArray(plan && plan.calls) ? plan.calls : []).slice(0, 4);
      if (!calls.length) {
        reply.text = (plan && plan.reply) || "Could you say that another way? For example: \"How much did I spend on eating out this month?\"";
        reply.sugg = Array.isArray(plan && plan.suggestions) ? plan.suggestions : [];
      } else {
        const results = [], actions = [], looked = [];
        for (const c of calls) {
          const name = String(c.tool || ""), args = c.args || {};
          if (ACTIONS.includes(name)) {
            const x = prepareAction(name, args);
            if (x) { actions.push(x); results.push({ prepared_change: x.lines.join(" · "), can_save: !x.invalid }); }
            else results.push({ change: name, problem: "Missing details (like the amount)" });
            continue;
          }
          const fn = TOOLS[name];
          results.push({ tool: name, args, result: fn ? fn(args) : "Unknown lookup" });
          if (fn) looked.push(TOOL_LABEL[name] || name);
        }
        if (!looked.length && actions.length) {
          // only changes to confirm: no need to ask Gemini again
          const ok = actions.filter(x => !x.invalid);
          reply.text = (plan && plan.reply) || (ok.length ? "Here's what I'll save. Check it and tap Confirm." : actions.map(x => x.lines.join(" · ")).join("\n"));
          reply.sugg = [];
        } else {
          reply.pendingText = "Looking it up…"; renderChat();
          const raw = await geminiText(answerPrompt(q, results), [], { json: true, signal: ctl.signal, temperature: 0.3 });
          let ans = null; try { ans = parseJsonText(raw); } catch {}
          reply.text = ans && typeof ans.reply === "string" ? ans.reply : raw;
          reply.sugg = ans && Array.isArray(ans.suggestions) ? ans.suggestions : [];
        }
        if (looked.length) reply.note = "Looked up: " + [...new Set(looked)].join(", ");
        if (actions.length) reply.actions = actions;
      }
      if (voice) speak(reply.text);
    } catch (e) {
      if (e && !e.code && e.message) e = { code: "http", message: e.message };
      const code = e && e.code;
      if (code === "cancelled") { reply.text = "Stopped."; if (voice && userMsg.text === "…") userMsg.text = "(voice message)"; }
      else {
        reply.error = true;
        if (voice && userMsg.text === "…") userMsg.text = "(voice message)";
        reply.text = {
          no_key: "Add a Gemini key in Settings first. One key for the household lets everyone chat and scan.",
          bad_key: "Google didn't accept the Gemini key. Check it in Settings.",
          offline: "Chat needs an internet connection.",
          rate_limited: "Gemini's free limit was reached for now. Try again in a minute."
        }[code] || "Something went wrong. Try again.";
        if (code === "no_key" || code === "bad_key") reply.action = "settings";
        if (e && e.message && code === "http") reply.note = "Details: " + String(e.message).slice(0, 200);
      }
    }
    reply.pending = false; chat.busy = false; chat.abort = null;
    renderChat();
  }
