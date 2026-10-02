# ================= v10 markup, logic patches and CSS =================
# --- money logic: month an entry counts for; loans kept separate ---
rep('  function inMonth(k) { return viewEntries().filter(e => (e.date || "").slice(0, 7) === k); }',
    '  function inMonth(k) { return viewEntries().filter(e => effMonth(e) === k); }')
rep('''  function monthTotals(k) {
    const es = inMonth(k);''', '''  function monthTotals(k) {
    const es = inMonth(k).filter(countsMoney);''')
rep('    const es = inMonth(ui.month).filter(e => e.type === "expense");', '    const es = inMonth(ui.month).filter(e => e.type === "expense" && countsMoney(e));')
rep('    if (ui.type === "expense" && $("fSplit").checked) e.split = { with: otherOf(e.person), share: 0.5 };',
    '''    if (ui.type === "expense" && $("fSplit").checked) e.split = { with: otherOf(e.person), share: 0.5 };
    if (ui.type === "income" && $("fFor").value === "next") e.countMonth = shiftMonth(date.slice(0, 7), 1);
    if (ui.type === "save" && $("fGoal").value === "__other") { const pur = $("fPurpose").value.trim(); e.goalId = ""; if (pur) e.note = "Saving for " + pur + (e.note ? " · " + e.note : ""); }''')
rep('    if (goalMode) { e.goalId = $("fGoal").value || ""; e.category = "Savings"; }',
    '    if (goalMode) { e.goalId = $("fGoal").value === "__other" ? "" : ($("fGoal").value || ""); e.category = "Savings"; }')
# tags on entries
rep('''${e.recurringId ? '<span class="owner-tag">Monthly</span>' : ""}''',
    '''${e.recurringId ? '<span class="owner-tag">Bill</span>' : ""}${e.countMonth && e.countMonth !== (e.date || "").slice(0, 7) ? '<span class="owner-tag">For ' + esc(monthName(e.countMonth, true)) + '</span>' : ""}${e.loanId && !countsMoney(e) ? '<span class="owner-tag">Loan · separate</span>' : ""}''')

# --- dashboard ---
rep('''  <section class="summary" aria-label="This month">
    <div class="hero">''', '''  <section class="summary" aria-label="This month">
    <div class="dash-head"><span class="label">Dashboard</span><button class="icon-btn" type="button" id="tileBtn">Customize</button></div>
    <div class="tile-cfg" id="tileCfg" hidden></div>
    <div class="hero">''')
rep('''    <div>
      <div class="split" id="split"''', '''    <div data-tile="split">
      <div class="split" id="split"''')
rep('<div><div class="label">Income</div><div class="v num" id="sIncome">', '<div data-tile="income"><div class="label">Income</div><div class="v num" id="sIncome">')
rep('<div><div class="label">Spent</div><div class="v num" id="sSpent">', '<div data-tile="spent"><div class="label">Spent</div><div class="v num" id="sSpent">')
rep('<div><div class="label">Saved this month</div><div class="v num" id="sSaved">', '<div data-tile="saved"><div class="label">Saved this month</div><div class="v num" id="sSaved">')
rep('<div><div class="label">Total savings</div><div class="v num" id="sTotal">', '<div data-tile="total"><div class="label">Total savings</div><div class="v num" id="sTotal">')
rep('''      <div data-tile="total"><div class="label">Total savings</div><div class="v num" id="sTotal">—</div><div class="h" id="sTotalH">&nbsp;</div></div>
    </div>''', '''      <div data-tile="total"><div class="label">Total savings</div><div class="v num" id="sTotal">—</div><div class="h" id="sTotalH">&nbsp;</div></div>
    </div>
    <div class="tiles" id="tiles"></div>''')
rep('  <div class="banner info" id="dueBar" hidden></div>', '  <div class="bills-bar" id="dueBar" hidden></div>')

# --- settings: font size + button labels ---
rep('''      <label class="check"><input type="checkbox" id="setAmoled">''', '''      <div class="field"><span class="label" style="text-transform:none;letter-spacing:0;font-size:.85rem">Text size</span>
        <div class="modeseg four" id="fsSeg" role="group" aria-label="Text size"><button type="button" data-fs="s">Small</button><button type="button" data-fs="m">Normal</button><button type="button" data-fs="l">Large</button><button type="button" data-fs="xl">Extra large</button></div></div>
      <div class="field"><span class="label" style="text-transform:none;letter-spacing:0;font-size:.85rem">Top buttons show</span>
        <div class="modeseg" id="toolSeg" role="group" aria-label="Top buttons show"><button type="button" data-tools="icons">Icons</button><button type="button" data-tools="text">Words</button><button type="button" data-tools="both">Both</button></div></div>
      <label class="check"><input type="checkbox" id="setAmoled">''')

# --- entry form ---
rep('''<div class="field" id="catField"><label for="fCat">Category</label>
              <input id="fCat" list="catList" autocomplete="off" placeholder="Pick or type"><datalist id="catList"></datalist>''',
    '''<div class="field" id="catField"><label for="fCatSel">Category</label>
              <select id="fCatSel"></select><input id="fCat" autocomplete="off" placeholder="Type a category" hidden aria-label="Your own category"><datalist id="catList"></datalist>''')
rep('<div class="field" id="goalField" hidden><label for="fGoal">Goal</label>', '<div class="field" id="goalField" hidden><label for="fGoal" id="goalLabel">Put it into</label>')
rep('''          <div class="field"><label for="fNote">Note <span class="muted">(optional)</span></label>''', '''          <div class="field" id="purposeRow" hidden><label for="fPurpose">What are you saving for?</label><input id="fPurpose" maxlength="40" placeholder="e.g. Wedding gift, Eid"></div>
          <div class="field" id="forRow" hidden><label for="fFor">Counts for</label><select id="fFor"><option value="this">This month</option><option value="next">Next month</option></select></div>
          <div class="field"><label for="fNote" id="noteLabel">Note <span class="muted">(optional)</span></label>''')
rep('<span>Repeat every month<small>Added automatically on the same day each month.</small></span>', '<span>Remind me every month<small>Shows up as a bill when it\'s due. Nothing is added until you mark it paid.</small></span>')

# --- loans form ---
rep('<div class="field"><label for="lnName">Who with?</label>', '<div class="field"><label for="lnName" id="lnNameL">Who did you lend to?</label>')
rep('''            <div class="field" id="lnWhoF" hidden>''', '''            <label class="check"><input type="checkbox" id="lnInMonth"><span>Count it in this month's money<small>Off by default: loans are tracked separately from "left to spend".</small></span></label>
            <div class="field" id="lnWhoF" hidden>''')

# --- bills & reminders panel ---
rep('''        <div class="panel-head"><h2>Repeating every month</h2></div>
        <div class="recs" id="recList"></div>''', '''        <div class="panel-head"><h2>Bills &amp; reminders</h2></div>
        <div class="recs" id="recList"></div>
        <details class="box" id="billBox">
          <summary>New bill or reminder</summary>
          <div>
            <div class="field"><label for="brName">Name</label><input id="brName" maxlength="40" placeholder="e.g. Electricity, Rent, Phone bill"></div>
            <div class="row2">
              <div class="field"><label for="brAmt">Usual amount</label><input id="brAmt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0"></div>
              <div class="field"><label for="brDay">Due on day</label><input id="brDay" type="number" inputmode="numeric" min="1" max="31" placeholder="e.g. 10"></div>
            </div>
            <div class="row2">
              <div class="field"><label for="brRemind">Remind me</label><select id="brRemind"><option value="3">3 days before</option><option value="5">5 days before</option><option value="7" selected>7 days before</option><option value="10">10 days before</option><option value="14">14 days before</option></select></div>
              <div class="field"><label for="brType">Type</label><select id="brType"><option value="expense">Money out (bill)</option><option value="income">Money in</option></select></div>
            </div>
            <div class="field"><label for="brCat">Category</label><select id="brCat"></select></div>
            <div class="field" id="brWhoF" hidden><label for="brWho">Whose?</label><select id="brWho"></select></div>
            <div class="err" id="brErr" hidden></div>
            <div class="formfoot"><button class="primary" type="button" id="saveBill">Save reminder</button></div>
          </div>
        </details>''')

# --- CSS ---
rep('* { box-sizing: border-box; }', '''/* text size + button labels */
:root[data-fs="s"] body { zoom: .92; }
:root[data-fs="l"] body { zoom: 1.12; }
:root[data-fs="xl"] body { zoom: 1.25; }
.modeseg.four { grid-template-columns: repeat(4, 1fr); }
.tool .tl { display: none; font-size: .78rem; font-weight: 600; white-space: nowrap; }
:root[data-tools="text"] .tool svg { display: none; }
:root[data-tools="text"] .tool .tl, :root[data-tools="both"] .tool .tl { display: inline; }
:root[data-tools="text"] .tool, :root[data-tools="both"] .tool { width: auto; padding: 0 12px; display: inline-flex; gap: 6px; align-items: center; }
:root[data-tools="text"] .tool::after, :root[data-tools="both"] .tool::after { display: none; }
/* dashboard */
.summary { border: 0; box-shadow: 0 2px 4px rgba(0,0,0,.05), 0 12px 32px rgba(0,0,0,.08); gap: 16px; }
.dash-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: -6px; }
.summary .hero { background: var(--accent); color: var(--accent-ink); border-radius: 14px; padding: 18px 18px 16px; }
.summary .hero .label, .summary .hero .sub { color: var(--accent-ink); opacity: .85; }
.summary .hero .big.neg { color: var(--accent-ink); text-decoration: underline wavy; text-underline-offset: 6px; }
.summary .hero .ghost { background: transparent; color: var(--accent-ink); border-color: currentColor; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.tile { border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 10px; padding: 10px 12px; min-width: 0; }
.tile .v { font-family: var(--f-display); font-size: 1.15rem; font-weight: 600; }
.tile .h { font-size: .8rem; color: var(--ink-3); overflow-wrap: anywhere; }
.tile.t-ok { border-left-color: var(--c-left); }
.tile.t-amber { border-left-color: #D99A1E; }
.tile.t-red { border-left-color: var(--neg); }
.tile.t-red .v { color: var(--neg); }
.tile-cfg { display: grid; gap: 8px; background: var(--sunk); border-radius: 10px; padding: 10px 12px; }
.tile-opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px 12px; }
/* bills bar */
.bills-bar { display: grid; gap: 8px; }
.bill { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 12px; border-radius: 12px; padding: 10px 12px; border-left: 6px solid; background: var(--surface); box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.bill.green { border-left-color: var(--c-left); }
.bill.amber { border-left-color: #D99A1E; background: color-mix(in srgb, #D99A1E 10%, var(--surface)); }
.bill.red { border-left-color: var(--neg); background: color-mix(in srgb, var(--neg) 12%, var(--surface)); }
.bill-main { display: grid; min-width: 0; }
.bill-main span { font-size: .84rem; color: var(--ink-2); }
.bill.red .bill-main span { color: var(--neg); font-weight: 600; }
.bill-amt { width: 110px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 8px; padding: 7px 9px; font: inherit; }
.bill-more { font-size: .8rem; color: var(--ink-3); padding-left: 4px; }
.rec { align-items: flex-start; }
.rec-main { flex: 1; min-width: 0; }
.rec-dot { flex: none; width: 12px; height: 12px; border-radius: 50%; margin-top: 5px; background: var(--line); }
.rec-dot.green { background: var(--c-left); } .rec-dot.amber { background: #D99A1E; } .rec-dot.red { background: var(--neg); }
.rec-dot.done { background: transparent; border: 2px solid var(--c-left); } .rec-dot.off { background: var(--line); }
/* loans */
.loan-meter { height: 8px; }
.loan-meter div { background: var(--c-left); }
.loan.paid { opacity: .75; }
.loan-hist summary, .loan-done summary { cursor: pointer; font-size: .82rem; color: var(--accent); font-weight: 600; }
.loan-hist ul { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 4px; font-size: .84rem; }
.loan-hist li { display: flex; justify-content: space-between; border-bottom: 1px dashed var(--line); padding-bottom: 3px; }
.loan-done .loans { margin-top: 8px; }
.loan-pay { flex-wrap: wrap; }
.loan-pay input[type=date] { flex: 1 1 130px; }
/* entries */
.ledger li.more { list-style: none; padding-top: 10px; display: flex; justify-content: center; }
#fCatSel, #fFor, #brRemind, #brType, #brCat, #brWho, #lnDir, #lnWho { width: 100%; }
#fCat:not([hidden]) { margin-top: 6px; }
* { box-sizing: border-box; }''')
