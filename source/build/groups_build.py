# Spaces & groups: markup, small source patches, styles.
rep('const entryWho = () => isHouse() ? ($("fWho").value || "p1") : ui.view;',
    'const entryWho = () => spaceMode() ? meId() : isHouse() ? ($("fWho").value || "p1") : ui.view;')
rep('''  $("saveSettings").addEventListener("click", async () => {
    const o1 = num(''', '''  $("saveSettings").addEventListener("click", async () => {
    if (spaceMode()) return saveMyDetails();
    const o1 = num(''')
rep('(id === "p2" ? PCOLORS[1] : PCOLORS[0])', 'PCOLORS[Math.max(0, people().findIndex(p => p.id === id)) % PCOLORS.length]')
rep('<div class="who" id="who"', '<nav class="spacebar" id="spaceBar" aria-label="Your spaces" hidden></nav>\n    <div class="who" id="who"')
rep('<div class="banner info" id="owesBar" hidden></div>', '<div class="banner info" id="reqBar" hidden></div>\n  <div class="banner info" id="owesBar" hidden></div>')
a = s.index('''    <div class="setsec">
      <h3>Household</h3>''')
b = s.index('''    <div class="setsec">
      <h3>Account</h3>''')
s = s[:a] + '''    <div class="setsec" id="grpSec">
      <h3>Groups</h3>
      <p class="hint" id="grpInfo" style="margin:0"></p>
      <div id="grpList" class="grp-list"></div>
      <details class="box"><summary>Start a new group</summary><div>
        <div class="field"><label for="grpNewName">Group name</label><input id="grpNewName" maxlength="30" placeholder="e.g. Household, Bali trip"></div>
        <div><button class="ghost" id="grpCreate" type="button">Create group</button></div>
      </div></details>
      <details class="box"><summary>Join a group</summary><div>
        <div class="field"><label for="grpJoinCode">Invite link or code</label><input id="grpJoinCode" autocomplete="off" spellcheck="false"></div>
        <div><button class="ghost" id="grpJoin" type="button">Join</button></div>
      </div></details>
    </div>
    <div class="setsec" id="privSec">
      <h3>Privacy</h3>
      <p class="hint" style="margin:0">Your own entries (in Me) are private. Only people you allow can see them, and they can never change anything.</p>
      <div id="privList" class="grp-list"></div>
    </div>
''' + s[b:]
rep('* { box-sizing: border-box; }', '''* { box-sizing: border-box; }
.spacebar { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0 8px; scrollbar-width: none; }
.spacebar[hidden] { display: none; }
.spacebar button { flex: none; border: 1px solid var(--line, #ccc); background: transparent; color: inherit; border-radius: 999px; padding: 7px 14px; font: inherit; font-size: .9em; cursor: pointer; }
.spacebar button[aria-pressed="true"] { background: var(--accent, #0B5F57); border-color: var(--accent, #0B5F57); color: var(--accent-ink, #fff); font-weight: 600; }
.by-tag { opacity: .75; font-style: italic; }
#owesBar { display: grid; gap: 8px; }
#owesBar .owe-row { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.grp-list { display: grid; gap: 10px; }
.grp { border: 1px solid var(--line, #ccc); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.grp-top { display: grid; gap: 2px; } .grp-top small { opacity: .75; }
.grp-rename { display: flex; gap: 8px; } .grp-rename input { flex: 1; min-width: 0; }
.priv-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
#reqBar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }''')
rep('(isHouse() ? "household" : poss(ui.view))', '(isHouse() ? (isGroup() ? "the group\'s" : "household") : poss(ui.view))')
rep('''    <div class="setsec" id="privSec">''', '''    <div class="setsec" id="invSec" hidden>
      <h3>Invite people to Pocket Ledger</h3>
      <p class="hint" style="margin:0">Pocket Ledger is invite-only. Make a link for each new person. It works once and lasts 7 days.</p>
      <div class="field"><label for="invNote">Who is it for?</label><input id="invNote" maxlength="40" placeholder="e.g. Mum"></div>
      <div class="field"><label for="invGroup">What they get</label><select id="invGroup"></select></div>
      <div><button class="primary" id="invMake" type="button">Make invite link</button></div>
      <div id="invList" class="grp-list"></div>
    </div>
    <div class="setsec" id="privSec">''')
