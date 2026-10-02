# ================= server features: settings markup =================
rep('<div class="field"><label for="setHKey">Gemini key for the household</label>', '<div class="srv"><p class="hint" style="margin:0" id="srvState"></p><div class="row-btns"><button class="ghost" type="button" id="srvOn">Use the secure server</button><button class="ghost" type="button" id="srvOff" hidden>Stop using the server</button></div></div>\n      <div class="field" id="hkeyField"><label for="setHKey">Gemini key for the household</label>')
rep('    <div><button class="primary" id="saveSettings">Save settings</button></div>', '''    <div class="setsec">
      <h3>Notifications</h3>
      <p class="hint" style="margin:0" id="ntState"></p>
      <div class="row-btns"><button class="ghost" type="button" id="ntOn">Turn on for this device</button><button class="ghost" type="button" id="ntTest" hidden>Send a test</button><button class="icon-btn" type="button" id="ntOff" hidden>Turn off on this device</button></div>
      <div class="tile-opts">
        <label class="check"><input type="checkbox" id="ntBills" checked><span>Bills &amp; reminders<small>When a bill turns amber, then red</small></span></label>
        <label class="check"><input type="checkbox" id="ntBudgets" checked><span>Budgets<small>At 80% and when you go over</small></span></label>
        <label class="check"><input type="checkbox" id="ntLoans" checked><span>Loans<small>3 days before the due date, and when overdue</small></span></label>
      </div>
      <p class="hint" style="margin:0">Your choices apply to all your devices. Alerts are checked every morning at 8:30.</p>
    </div>
    <div><button class="primary" id="saveSettings">Save settings</button></div>''')
rep('* { box-sizing: border-box; }', '''.srv { display: grid; gap: 8px; background: var(--sunk); border-radius: 10px; padding: 10px 12px; }
* { box-sizing: border-box; }''')

rep('<p class="hint" style="margin:0">Saved with your household\'s data, so everyone', '<p class="hint" style="margin:0" id="hkeyHint">Saved with your household\'s data, so everyone')
# talk to the person on their own dashboard as "you"; use names only when looking at someone else's
rep('const poss = id => { const n = pname(id); return /^me$/i.test(n) ? "your" : n + "\'s"; };', 'const poss = id => { const n = pname(id); return isMine(id) || /^me$/i.test(n) ? "your" : n + "\'s"; };')
rep('$("heroLabel").textContent = (isHouse() ? "Household" : pname(ui.view)) + " · left to spend this month";', '$("heroLabel").textContent = isHouse() ? houseName() + " · left to spend this month" : isMine(ui.view) ? "Left to spend this month" : pname(ui.view) + " · left to spend this month";')
rep('"Nothing logged " + (isHouse() ? "" : "for " + esc(pname(ui.view)) + " ") + "in "', '"Nothing logged " + (isHouse() || isMine(ui.view) ? "" : "for " + esc(pname(ui.view)) + " ") + "in "')
