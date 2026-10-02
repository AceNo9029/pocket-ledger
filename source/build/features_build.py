# ================= extras: loans, repeating, split, budgets, trends, search, lock, voice =================
# --- summary banners (owes + due) ---
rep('  <section class="summary" aria-label="This month">', '''  <div class="banner info" id="dueBar" hidden></div>
  <div class="banner info" id="owesBar" hidden></div>
  <section class="summary" aria-label="This month">''')
# --- search in Entries ---
rep('''          <h2>Entries</h2>
          <div class="filters" role="group" aria-label="Filter entries">''', '''          <h2>Entries</h2>
          <input id="searchQ" class="search" type="search" placeholder="Search all months" aria-label="Search all months" autocomplete="off">
          <div class="filters" role="group" aria-label="Filter entries">''')
rep('    let es = inMonth(ui.month);', '    let es = ui.search ? searchEntries() : inMonth(ui.month);')
rep('html += `<li class="day">${esc(d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }))}</li>`;',
    'html += `<li class="day">${esc(d.toLocaleDateString(undefined, ui.search ? { day: "numeric", month: "short", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" }))}</li>`;')
rep('''      list.innerHTML = `<li class="empty"><span>${ui.filter === "all" ? "Nothing logged "''', '''      if (ui.search) { list.innerHTML = `<li class="empty"><span>Nothing matches "${esc(ui.search)}".</span></li>`; return; }
      list.innerHTML = `<li class="empty"><span>${ui.filter === "all" ? "Nothing logged "''')
rep('    const goalName = id => (state.goals.find(g => g.id === id) || {}).name;\n    let html = "", lastDay = "";',
    '    const goalName = id => (state.goals.find(g => g.id === id) || {}).name;\n    let html = ui.search ? `<li class="day">${es.length} match${es.length === 1 ? "" : "es"} · ${esc(money(sum(es, x => +x.amount)))} in total</li>` : "", lastDay = "";')
# split tag on ledger rows
rep('''<b>${esc(title || "Untitled")}${e.sample ? '<span class="sample-tag">Example</span>' : ""}</b>''',
    '''<b>${esc(title || "Untitled")}${e.split ? '<span class="owner-tag">Split</span>' : ""}${e.recurringId ? '<span class="owner-tag">Monthly</span>' : ""}</b>''')
# --- budgets + trend in main column ---
rep('''        <div class="cats" id="cats"></div>
      </section>''', '''        <div class="cats" id="cats"></div>
        <div class="panel-head" style="margin-top:6px"><h3 style="font-size:.95rem">Budgets</h3><button class="ghost" type="button" id="budgetBtn">Set budgets</button></div>
        <div class="buds" id="budgetList"></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Last 12 months</h2><span class="legend"><span><i style="background:var(--c-left)"></i>Income</span><span><i style="background:var(--c-spent)"></i>Spent</span></span></div>
        <div class="trend" id="trendChart"></div>
        <p class="hint" style="margin:0" id="trendNote"></p>
      </section>''')
# --- entry form: split + repeat ---
rep('          <div class="err" id="formErr" hidden></div>', '''          <label class="check" id="splitRow"><input type="checkbox" id="fSplit"><span id="splitLabel">Split half with your partner</span></label>
          <label class="check" id="repeatRow"><input type="checkbox" id="fRepeat"><span>Repeat every month<small>Added automatically on the same day each month.</small></span></label>
          <div class="err" id="formErr" hidden></div>''')
rep('    const e = { type: ui.type, amount, date, note: $("fNote").value.trim(), created: Date.now(), person: entryWho() };',
    '    const e = { type: ui.type, amount, date, note: $("fNote").value.trim(), created: Date.now(), person: entryWho() };\n    if (ui.type === "expense" && $("fSplit").checked) e.split = { with: otherOf(e.person), share: 0.5 };')
rep('    if (wasEdit) { const old = state.entries.find(x => x.id === wasEdit); if (old && old.created) e.created = old.created; }',
    '    if (wasEdit) { const old = state.entries.find(x => x.id === wasEdit); if (old && old.created) e.created = old.created; if (old) ["ref", "loanId", "loanRole", "recurringId", "source"].forEach(k => { if (old[k] !== undefined && e[k] === undefined) e[k] = old[k]; }); }')
rep('''    if (ok) {
      const keepDate = date;''', '''    if (ok) {
      if (!wasEdit) afterEntryAdded(e); else budgetCheck(e);
      const keepDate = date;''')
# scanned entries: budget check
rep('      if (!(await run(backend.add(e)))) break;', '      if (!(await run(backend.add(e)))) break;\n      budgetCheck(e);')
# --- side column: loans + repeating ---
rep('''        </details>
      </section>
    </aside>''', '''        </details>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Loans</h2></div>
        <div class="loans" id="loanList"></div>
        <p class="hint" style="margin:0" id="loanClosed"></p>
        <details class="box" id="loanBox">
          <summary>New loan</summary>
          <div>
            <div class="row2">
              <div class="field"><label for="lnDir">Type</label><select id="lnDir"><option value="lent">I lent money</option><option value="borrowed">I borrowed money</option></select></div>
              <div class="field"><label for="lnAmt">Amount</label><input id="lnAmt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0"></div>
            </div>
            <div class="field"><label for="lnName">Who with?</label><input id="lnName" maxlength="40" placeholder="e.g. Ali"></div>
            <div class="row2">
              <div class="field"><label for="lnDate">Date</label><input id="lnDate" type="date"></div>
              <div class="field"><label for="lnDue">Due back <span class="muted">(optional)</span></label><input id="lnDue" type="date"></div>
            </div>
            <div class="field" id="lnWhoF" hidden><label for="lnWho">Whose money?</label><select id="lnWho"></select></div>
            <div class="err" id="loanErr" hidden></div>
            <div class="formfoot"><button class="primary" type="button" id="saveLoan">Save loan</button></div>
          </div>
        </details>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Repeating every month</h2></div>
        <div class="recs" id="recList"></div>
      </section>
    </aside>''')
# --- settings: app lock ---
rep('''    <h3 style="font-size:.95rem">Shared with your household</h3>''', '''    <div class="setsec" style="border-top:0;padding-top:0">
      <h3>App lock on this device</h3>
      <p class="hint" style="margin:0" id="lockState"></p>
      <div class="row-btns"><button class="ghost" type="button" id="lockOn">Turn on</button><button class="ghost" type="button" id="lockBioAdd" hidden>Also use fingerprint</button><button class="ghost" type="button" id="lockOff" hidden>Turn off</button></div>
      <div id="lockSetup" hidden class="row2">
        <div class="field"><label for="lockPin1">New PIN (4-8 digits)</label><input id="lockPin1" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
        <div class="field"><label for="lockPin2">PIN again</label><input id="lockPin2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>
        <div><button class="primary" type="button" id="lockSave">Save PIN</button></div>
      </div>
    </div>
    <h3 style="font-size:.95rem">Shared with your household</h3>''')
# --- lock overlay ---
rep('<div class="gate" id="gate">', '''<div class="lock" id="lock" hidden>
  <div class="lock-card">
    <img src="icons/icon-192.png" alt="" width="56" height="56">
    <h2>Pocket Ledger is locked</h2>
    <div class="lock-dots" id="lockDots" aria-live="polite"></div>
    <div class="err" id="lockErr" hidden>That PIN isn't right.</div>
    <div class="lock-pad" id="lockPad">
      <button type="button" data-k="1">1</button><button type="button" data-k="2">2</button><button type="button" data-k="3">3</button>
      <button type="button" data-k="4">4</button><button type="button" data-k="5">5</button><button type="button" data-k="6">6</button>
      <button type="button" data-k="7">7</button><button type="button" data-k="8">8</button><button type="button" data-k="9">9</button>
      <button type="button" data-k="bio" id="lockBio" aria-label="Use fingerprint" hidden>☝</button><button type="button" data-k="0">0</button><button type="button" data-k="del" aria-label="Delete">⌫</button>
    </div>
  </div>
</div>
<div class="gate" id="gate">''')
# --- chat: mic, speaker, recording bar ---
mic = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
spk = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
rep('<span><button class="icon-btn" id="chatClear" type="button">New chat</button>',
    '<span class="row-btns"><button class="icon-btn spk" id="chatSpeak" type="button" title="Read voice answers aloud" aria-label="Read voice answers aloud">' + spk + '</button><button class="icon-btn" id="chatClear" type="button">New chat</button>')
rep('<form class="chat-form" id="chatForm"><textarea id="chatInput"',
    '<div class="rec-bar" id="chatRecBar" hidden><span class="rec-dot"></span><span>Listening… <b id="chatRecTime">0:00</b></span><span>Tap the mic again to send</span><button class="icon-btn" type="button" id="chatRecCancel">Cancel</button></div>\n  <form class="chat-form" id="chatForm"><button class="mic" id="chatMic" type="button" aria-label="Speak">' + mic + '</button><textarea id="chatInput"')
rep('placeholder="e.g. How much did I spend on eating out this month?" aria-label="Your question"', 'placeholder="Ask, or tap the mic and just say it" aria-label="Your message"')
# --- CSS ---
rep('* { box-sizing: border-box; }', '''.banner.info { background: var(--sunk); color: var(--ink); }
.banner.info .ghost { flex: none; }
.row-btns { display: inline-flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.search { flex: 1 1 140px; min-width: 0; max-width: 240px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: .85rem; }
.search:focus { outline: none; border-color: var(--accent); }
.buds { display: grid; gap: 10px; }
.bud { display: grid; gap: 4px; font-size: .86rem; }
.bud-top { display: flex; justify-content: space-between; gap: 8px; color: var(--ink-2); }
.bud .meter div { background: var(--c-left); }
.bud.near .meter div { background: #D99A1E; }
.bud.over .meter div { background: var(--neg); }
.bud small { color: var(--ink-3); }
.bud.over small { color: var(--neg); }
.bud-edit { display: grid; grid-template-columns: minmax(0, 1fr) 120px; gap: 10px; align-items: center; font-size: .88rem; }
.bud-edit input { border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 8px; padding: 7px 9px; font: inherit; min-width: 0; }
.trend svg { width: 100%; height: auto; display: block; }
.trend .grid { stroke: var(--line); stroke-width: 1; }
.trend .ax { fill: var(--ink-3); font-size: 11px; font-family: var(--f-body); }
.trend .curt { fill: var(--ink); font-weight: 700; }
.trend .inc { fill: var(--c-left); }
.trend .out { fill: var(--c-spent); }
.trend .hit { fill: transparent; cursor: pointer; }
.trend .mon.cur .hit { fill: var(--sunk); }
.trend .mon:hover .hit { fill: var(--sunk); }
.loans, .recs { display: grid; gap: 10px; }
.loan { border: 1px solid var(--line); border-radius: var(--r); padding: 12px; display: grid; gap: 6px; }
.loan.late { border-color: var(--neg); }
.loan-top { display: flex; justify-content: space-between; gap: 8px; }
.loan-top .num { font-family: var(--f-display); font-weight: 700; }
.loan-meta { font-size: .82rem; color: var(--ink-2); }
.loan.late .loan-meta { color: var(--neg); }
.loan-pay { display: flex; gap: 6px; align-items: center; }
.loan-pay input { flex: 1; min-width: 0; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 8px; padding: 8px 10px; font: inherit; }
.rec { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.rec b { display: block; font-weight: 600; }
.rec small { color: var(--ink-3); font-size: .8rem; }
.lock { position: fixed; inset: 0; z-index: 40; background: var(--bg); display: grid; place-items: center; padding: 24px 16px; }
.lock-card { display: grid; justify-items: center; gap: 14px; width: min(100%, 320px); }
.lock-card img { border-radius: 14px; }
.lock-card h2 { font-size: 1.15rem; }
.lock-dots { height: 24px; font-size: 1.6rem; letter-spacing: .3em; color: var(--ink); }
.lock-pad { display: grid; grid-template-columns: repeat(3, 72px); gap: 12px; }
.lock-pad button { height: 64px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 1.4rem; font-family: var(--f-display); }
.lock-pad button:active { background: var(--sunk); }
.lock-pad button[hidden] { display: block !important; visibility: hidden; }
.mic { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--accent); display: grid; place-items: center; }
.mic.rec { background: var(--neg); border-color: var(--neg); color: #fff; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 8px rgba(181,65,43,.18); } }
@media (prefers-reduced-motion: reduce) { .mic.rec { animation: none; } }
.rec-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: .85rem; color: var(--ink-2); padding: 8px 12px; border-top: 1px solid var(--line); }
.rec-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--neg); }
.spk[aria-pressed="false"] { opacity: .45; }
.vtag { font-size: .8rem; }
.act-card { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 10px; display: grid; gap: 8px; }
.act-card.done { opacity: .75; }
.act-line { font-size: .88rem; color: var(--ink); }
.act-line.bad { color: var(--neg); }
* { box-sizing: border-box; }''')
# --- backup includes new collections ---
rep('    const d = { app: "pocket-ledger", version: 2, entries: state.entries, goals: state.goals, settings: state.settings };',
    '    const d = { app: "pocket-ledger", version: 3, entries: state.entries, goals: state.goals, settings: state.settings, recurring: state.recurring, loans: state.loans, settlements: state.settlements };')
# --- loan category in defaults + default loan date ---
rep('"Family & gifts","Entertainment","Other"]', '"Family & gifts","Entertainment","Loans given","Loan repayment","Other"]')
rep('const INC_CATS = ["Salary","Side income","Overtime","Gift","Other"];', 'const INC_CATS = ["Salary","Side income","Overtime","Gift","Loan repaid","Loan received","Other"];')
