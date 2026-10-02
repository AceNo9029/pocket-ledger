s=open('/home/claude/app/web/index.html').read()
def rep(a,b):
    global s
    assert s.count(a)==1, ("COUNT",s.count(a),a[:90]); s=s.replace(a,b)
cam='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.5"/></svg>'
inst='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7"/><path d="m9 11 3 3 3-3"/><path d="M10.5 18.5h3"/></svg>'

# ---- head ----
a=s.index('<meta name="viewport"'); b=s.index('<style>')
s=s[:a]+'''<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B5F57">
<meta name="description" content="Household money tracker: income, spending, savings goals and receipt scanning.">
<title>Pocket Ledger</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600&display=swap">
'''+s[b:]
rep('--f-display: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;','--f-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;')
rep('--f-body: "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;','--f-body: "Figtree", "Segoe UI", system-ui, -apple-system, sans-serif;')
rep('html { color-scheme: light; }\n','html { color-scheme: light; -webkit-tap-highlight-color: transparent; }\n')
rep('.wrap { max-width: 1120px; margin: 0 auto; padding-inline: 16px; padding-block: 20px 48px;',
    '.wrap { max-width: 1120px; margin: 0 auto; padding-inline: 16px; padding-block: calc(16px + env(safe-area-inset-top, 0px)) calc(48px + env(safe-area-inset-bottom, 0px));')

# ---- categories + bank account names ----
rep('"Health","Family & gifts"','"Health","Education","Family & gifts"')
rep('''  const isHouse = () => ui.view === "all";''','''  const isHouse = () => ui.view === "all";
  const last4 = v => String(v || "").split(/[,\\s]+/).map(x => x.replace(/\\D/g, "").slice(-4)).filter(x => x.length === 4).join(", ");''')
rep('''    <p class="hint" style="margin:0">"Savings they already had" is each person's starting balance''',
'''    <div class="row2">
      <div class="field"><label for="setBank1" id="setBank1L">Name on first person's bank account</label><input id="setBank1" maxlength="80" spellcheck="false" placeholder="As shown on transfers"></div>
      <div class="field"><label for="setBank2" id="setBank2L">Name on second person's bank account</label><input id="setBank2" maxlength="80" spellcheck="false" placeholder="As shown on transfers"></div>
      <div class="field"><label for="setAcct1" id="setAcct1L">First person's account numbers (last 4 digits)</label><input id="setAcct1" maxlength="40" inputmode="numeric" spellcheck="false" placeholder="e.g. 5369"></div>
      <div class="field"><label for="setAcct2" id="setAcct2L">Second person's account numbers (last 4 digits)</label><input id="setAcct2" maxlength="40" inputmode="numeric" spellcheck="false" placeholder="e.g. 1234"></div>
    </div>
    <p class="hint" style="margin:0">These help scanning tell whose transfer it is and whether money went out or came in. People who pay you often save you under a nickname, so the last 4 digits of your account number are the most reliable. Only the last 4 digits are kept. Separate several with commas.</p>
    <p class="hint" style="margin:0">"Savings they already had" is each person's starting balance''')
rep('''people: [{ id: "p1", name: n1 }, { id: "p2", name: n2 }] }), "Settings saved");''',
    '''people: [{ id: "p1", name: n1, bank: $("setBank1").value.trim(), acct: last4($("setAcct1").value) }, { id: "p2", name: n2, bank: $("setBank2").value.trim(), acct: last4($("setAcct2").value) }] }), "Settings saved");''')

# ---- toolbar ----
rep('<div class="toolbar">\n      <button class="tool" id="settingsBtn"',
    f'<div class="toolbar">\n      <button class="tool" id="installBtn" title="Install app" aria-label="Install app" hidden>{inst}</button>\n      <button class="tool" id="scanBtn" title="Scan a receipt or screenshot" aria-label="Scan a receipt or screenshot">{cam}</button>\n      <button class="tool" id="settingsBtn"')
rep('<input type="file" id="restoreFile" accept=".json,application/json" hidden>',
    '<input type="file" id="restoreFile" accept=".json,application/json" hidden>\n      <input type="file" id="scanFile" accept="image/*" multiple hidden>')

# ---- settings additions ----
rep('''    <div><button class="primary" id="saveSettings">Save settings</button></div>
  </section>''','''    <div class="setsec">
      <h3>Scanning on this device</h3>
      <div class="field"><label for="setKey">Gemini API key</label><input id="setKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key from Google AI Studio"></div>
      <p class="hint" style="margin:0">Kept on this device only, never in the shared data. Get a free key at aistudio.google.com, then Get API key.</p>
      <details class="box"><summary>Advanced</summary><div><div class="field"><label for="setModel">Gemini model</label><input id="setModel" spellcheck="false" placeholder="Automatic (gemini-3.8-flash)"></div></div></details>
    </div>
    <div><button class="primary" id="saveSettings">Save settings</button></div>
    <div class="setsec">
      <h3>Household</h3>
      <p class="hint" id="hhInfo" style="margin:0"></p>
      <div class="field"><label for="inviteLink">Invite link for your partner</label><input id="inviteLink" readonly></div>
      <div class="formfoot"><button class="ghost" id="copyInvite" type="button">Copy link</button><button class="ghost" id="shareInvite" type="button" hidden>Share</button></div>
      <p class="hint" style="margin:0" id="joinState"></p>
      <div class="formfoot"><button class="ghost" id="joinOpen" type="button">Open invitations for 7 days</button><button class="ghost" id="joinClose" type="button">Close invitations</button></div>
    </div>
    <div class="setsec">
      <h3>Account</h3>
      <p class="hint" id="acctInfo" style="margin:0"></p>
      <div><button class="ghost" id="signOutBtn" type="button">Sign out</button></div>
    </div>
  </section>''')

# ---- scan panel + big button ----
rep('  <div class="cols">','''  <section class="panel scan" id="scanPanel" hidden aria-live="polite">
    <div class="panel-head"><h2 id="scanTitle">Reading your image…</h2><button class="icon-btn" id="scanClose">Close</button></div>
    <div class="scan-status" id="scanStatus"></div>
    <div class="scan-list" id="scanList"></div>
    <div class="err" id="scanErr" hidden></div>
    <div class="formfoot" id="scanFoot" hidden><button class="primary" id="scanAdd">Add entries</button><button class="ghost" id="scanMore">Scan another</button></div>
  </section>

  <div class="cols">''')
rep('''<div class="panel-head"><h2 id="formTitle">Add an entry</h2>''','''<button class="scanbig" id="scanBtn2">''' + cam.replace('width="18" height="18"','width="20" height="20"') + '''<span><b>Scan a receipt or screenshot</b><small>Take a photo or pick one. I'll fill in the details and ask if anything's unclear.</small></span></button>
        <div class="panel-head"><h2 id="formTitle">Add an entry</h2>''')

# ---- gate (sign-in) overlay ----
rep('<div class="toast" id="toast" hidden></div>','''<div class="toast" id="toast" hidden></div>

<div class="gate" id="gate">
  <div class="gate-card">
    <div class="gate-brand"><img src="icons/icon-192.png" alt="" width="48" height="48"><div><h1>Pocket Ledger</h1><span>Your money, and what you share</span></div></div>

    <div id="gLoading"><p class="muted" id="gLoadingMsg"><span class="spin" aria-hidden="true"></span>Opening…</p></div>

    <div id="gSignin" hidden>
      <form id="gSigninForm" class="gate-form" novalidate>
        <div class="field"><label for="gEmail">Email</label><input id="gEmail" type="email" autocomplete="email" inputmode="email" required></div>
        <div class="field"><label for="gPass">Password</label><input id="gPass" type="password" autocomplete="current-password" required></div>
        <div class="err" id="gErr" hidden></div>
        <div class="ok" id="gOk" hidden></div>
        <button class="primary" type="submit" id="gSigninBtn">Sign in</button>
        <button class="ghost" type="button" id="gCreateBtn">Create account</button>
        <button class="linkish" type="button" id="gForgot">Forgot password?</button>
      </form>
      <p class="hint">New here? Type your email and a password (6+ characters), then tap Create account.</p>
    </div>

    <div id="gInvite" hidden>
      <p class="muted">Signed in as <b id="gInviteWho"></b></p>
      <section class="gate-sec">
        <h2>Pocket Ledger is invite-only</h2>
        <p class="hint">Paste the invite link or code you were sent. You only need to do this once.</p>
        <div class="field"><label for="gInviteCode">Invite link or code</label><input id="gInviteCode" autocomplete="off" spellcheck="false"></div>
        <button class="primary" type="button" id="gInviteBtn">Continue</button>
      </section>
      <div class="err" id="gInviteErr" hidden></div>
      <button class="linkish" type="button" id="gInviteOut">Use a different account</button>
    </div>

    <div id="gSetup" hidden>
      <p class="muted">Signed in as <b id="gWho"></b></p>
      <section class="gate-sec">
        <h2>Welcome to Pocket Ledger</h2>
        <p class="hint">Your own entries are private to you. You can share costs with others in groups later.</p>
        <div class="field"><label for="gMyName">Your name</label><input id="gMyName" maxlength="20" placeholder="e.g. Faris" autocomplete="given-name"></div>
        <div class="field"><label for="gJoinCode">Invite link or code (optional)</label><input id="gJoinCode" autocomplete="off" spellcheck="false" placeholder="Only if someone invited you to their group"></div>
        <button class="primary" type="button" id="gContinue">Continue</button>
      </section>
      <div class="err" id="gSetupErr" hidden></div>
      <button class="linkish" type="button" id="gSignout">Use a different account</button>
    </div>

    <div id="gConfig" hidden>
      <p class="muted">This copy of Pocket Ledger isn't connected to a database yet. Add your Firebase settings to config.js and upload it again.</p>
    </div>
  </div>
</div>''')

# ---- CSS ----
rep('.toast {','''.scanbig { display: flex; gap: 12px; align-items: center; text-align: left; width: 100%; border: 1.5px dashed var(--accent); background: transparent; color: var(--ink); border-radius: 12px; padding: 12px 14px; }
.scanbig svg { color: var(--accent); flex: none; }
.scanbig small { display: block; color: var(--ink-3); font-size: .8rem; }
.scanbig:hover { background: var(--sunk); }
.scan { border-color: var(--accent); }
.scan-status { color: var(--ink-2); font-size: .92rem; }
.spin { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; vertical-align: -1px; margin-right: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }
.scan-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; }
.scard { border: 1px solid var(--line); border-radius: var(--r); padding: 12px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.scard.off { opacity: .55; }
.scard-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: .88rem; }
.scard-top label { display: flex; gap: 8px; align-items: center; font-weight: 600; }
.flag { font-size: .7rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; border-radius: 4px; padding: 2px 6px; background: var(--warn-bg); color: var(--warn-ink); }
.q { background: var(--warn-bg); color: var(--warn-ink); border-radius: 8px; padding: 9px 10px; font-size: .88rem; display: grid; gap: 8px; }
.q.done { background: var(--sunk); color: var(--ink-2); }
.q .opts { display: flex; flex-wrap: wrap; gap: 6px; }
.q .opts button { border: 1px solid currentColor; background: transparent; color: inherit; border-radius: 999px; padding: 5px 12px; font-size: .82rem; }
.q .opts button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.field.need input, .field.need select { border-color: var(--neg); }
.dup { font-size: .8rem; color: var(--warn-ink); background: var(--warn-bg); border-radius: 6px; padding: 5px 8px; }
.setsec { display: grid; gap: 10px; border-top: 1px solid var(--line); padding-top: 14px; }
.setsec h3 { font-size: .95rem; }
.ok { font-size: .85rem; color: var(--pos); }
.linkish { border: 0; background: transparent; color: var(--accent); font-weight: 600; padding: 6px 0; justify-self: start; }
.gate { position: fixed; inset: 0; z-index: 20; background: var(--bg); overflow: auto; display: grid; justify-items: center; align-items: start; padding-inline: 16px; padding-block: calc(24px + env(safe-area-inset-top, 0px)) calc(24px + env(safe-area-inset-bottom, 0px)); }
.gate-card { width: min(100%, 440px); display: grid; gap: 18px; margin-top: 5vh; }
.gate-brand { display: flex; gap: 14px; align-items: center; }
.gate-brand img { border-radius: 12px; }
.gate-brand h1 { font-size: 1.6rem; }
.gate-brand span { color: var(--ink-3); font-size: .9rem; }
.gate-form, .gate-sec { display: grid; gap: 12px; }
.gate-sec { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
#gSignin, #gSetup, #gInvite { display: grid; gap: 14px; }
#gSignin[hidden], #gSetup[hidden], #gInvite[hidden] { display: none; }
.toast {''')
rep('.toast { position: fixed; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);',
    '.toast { position: fixed; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); max-width: calc(100% - 32px); text-align: center; z-index: 30;')

# ---- JS: backend ----
a=s.index('  async function fileBackend() {'); b=s.index('  function onDbErr(e)')
s=s[:a]+open('/home/claude/pl-app/src/backend.js').read()+s[b:]
rep('''$("modeNote").textContent = backend && backend.kind === "file" ? "Saved on this computer" : "";''',
    '''$("modeNote").textContent = !backend ? "" : navigator.onLine ? "Synced" : "Offline · changes will sync";''')
rep('''else toast("Couldn't save. Keep the Pocket Ledger window open and try again.");''','''else toast("Couldn't save. Check your connection and try again.");''')
rep('''    if (backend && backend.kind === "db" && !state.ready) {''','''    if (!state.ready) {''')

# ---- export via blob download ----
a=s.index('  async function saveFile(name, content, okLabel) {'); b=s.index('  $("exportBtn").addEventListener')
s=s[:a]+'''  function saveFile(name, content, okLabel) {
    try {
      const blob = new Blob([content], { type: name.endsWith(".csv") ? "text/csv" : "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(okLabel + " as " + name);
    } catch { toast("The file wasn't saved. Try again."); }
  }
'''+s[b:]
rep('''    const d = { app: "pocket-ledger", version: 1, entries''','''    const d = { app: "pocket-ledger", version: 2, entries''')
rep('''    await run(backend.replaceAll(d), "Backup restored");''','''    if (!navigator.onLine) return toast("Restoring needs an internet connection.");
    toast("Restoring…");
    await run(backend.replaceAll(d), "Backup restored");''')

# ---- remove ping/boot; add scanning + boot ----
a=s.index('  // keep the app running while this window is open'); b=s.index('})();\n</script>')
scan=open('/home/claude/web2/scan.js').read()
def srep(x,y):
    global scan
    assert scan.count(x)==1, x[:80]; scan=scan.replace(x,y)
srep('  let sampler = null, imgCaps = null, scanAbort = null, scanItems = [];','  let scanAbort = null, scanItems = [];')
srep('  function openScanPicker() { if (!readOnly && sampler && imgCaps) $("scanFile").click(); }',
     '''  function openScanPicker() {
    if (!aiReady()) { openSettings(); setTimeout(() => $("setKey").focus(), 50); toast("Add your Gemini key first. It's free from Google AI Studio."); return; }
    $("scanFile").click();
  }''')
srep('    const max = (imgCaps && imgCaps.maxCount) || 1;','    const max = 4;')
srep('const res = await sampler.json(scanPrompt(files.length), { images: files.length === 1 ? files[0] : files, signal: ctl.signal, cache: false });',
     'const res = await geminiJson(scanPrompt(files.length), files, ctl.signal);')
srep('''        not_granted: "Scanning uses your Claude account, so it needs your permission. Tap scan again and choose Allow.",
        rate_limited: "Too many scans in a short time. Wait a minute and try again.",
        image_rejected: "That image couldn't be opened. Try a JPG or PNG photo or screenshot.",
        images_unavailable: "Scanning images isn't available here. You can still add entries by hand.",''',
'''        no_key: "Add your Gemini key in Settings to use scanning.",
        bad_key: "Google didn't accept the Gemini key on this device. Check it in Settings (copy it again from Google AI Studio).",
        offline: "Scanning needs an internet connection. You can add the entry by hand and it will sync later.",
        rate_limited: "Gemini's free limit was reached for now. Wait a minute and try again, or add it by hand.",
        image_rejected: "That image couldn't be opened. Try a JPG or PNG photo or screenshot.",''')
s=s[:a]+open('/home/claude/pl-app/src/gemini.js').read()+scan+open('/home/claude/pl-app/src/features.js').read()+open('/home/claude/pl-app/src/chat.js').read()+open('/home/claude/pl-app/src/polish.js').read()+open('/home/claude/pl-app/src/v10.js').read()+open('/home/claude/pl-app/src/notify.js').read()+open('/home/claude/pl-app/src/groups.js').read()+open('/home/claude/pl-app/src/admin.js').read()+open('/home/claude/pl-app/src/backup.js').read()+open('/home/claude/pl-app/src/boot.js').read()+s[b:]
rep('</script>\n</body>','</script>\n<script type="module" src="app.js"></script>\n</body>')
exec(open('/home/claude/pl-app/src/themes_build.py').read())
exec(open('/home/claude/pl-app/src/chat_build.py').read())
exec(open('/home/claude/pl-app/src/features_build.py').read())
exec(open('/home/claude/pl-app/src/polish_build.py').read())
exec(open('/home/claude/pl-app/src/v10_build.py').read())
exec(open('/home/claude/pl-app/src/notify_build.py').read())
exec(open('/home/claude/pl-app/src/groups_build.py').read())
exec(open('/home/claude/pl-app/src/admin_build.py').read())
exec(open('/home/claude/pl-app/src/backup_build.py').read())
open('/home/claude/pl-app/index.html','w').write(s)
print("built", len(s))
