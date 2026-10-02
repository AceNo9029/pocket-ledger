const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/mockfb/' + r.request().url().split('/').pop()) }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() !== 'log') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(300);
  const st = JSON.parse(fs.readFileSync('/tmp/g_state2.json'));
  await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mock-db', JSON.stringify(s)); localStorage.setItem('mock-users', JSON.stringify({ 'faris@x.com': 'secret12' })); localStorage.setItem('mock-cur', 'faris@x.com'); }, st);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
  const rows = () => p.$$eval('#ledger li.tx .what', l => l.map(x => x.innerText.replace(/\n/g, ' ~ ')));
  console.log('before:', await rows());
  // delete Faris lunch
  await p.click('#ledger li.tx >> nth=0'); await p.waitForTimeout(150);
  await p.click('#ledger button[data-ask] >> nth=0'); await p.click('#ledger button[data-del]'); await p.waitForTimeout(500);
  console.log('after delete:', await rows());
  await p.click('#settingsBtn'); await p.waitForTimeout(800);
  console.log('trash:', (await p.innerText('#trashList')).replace(/\n+/g, ' / '));
  await p.click('#trashList button[data-untrash]'); await p.waitForTimeout(600);
  console.log('after restore:', await rows(), '| trash:', (await p.innerText('#trashList')).replace(/\n+/g, ' / '));
  // backup (download path in headless)
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#backupBtn')]);
  const path = await dl.path(); const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log('backup:', dl.suggestedFilename(), 'entries', d.entries.length, 'goals', d.goals.length, 'loans', d.loans.length, 'groups', d.groups.map(g => g.name + ':' + g.entries.length));
  for (const a of ['11', '12', '13']) { await p.click('.seg button[data-t=expense]'); await p.fill('#fAmount', a); await p.selectOption('#fCatSel', { index: 1 }); await p.click('#submitBtn'); await p.waitForTimeout(200); }
  // nag: set lastbackup old
  await p.evaluate(() => { localStorage.setItem('pl-lastbackup', String(Date.now() - 20 * 864e5)); }); await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
  console.log('nag visible:', await p.isVisible('#backupNag'), await p.textContent('#backupNag'));
  await p.click('#backupNag [data-bk=later]'); console.log('nag after later:', await p.isVisible('#backupNag'));
  // chat: action-only (one call) and fast path
  await p.evaluate(() => { window.__mockPlan = { heard: null, calls: [{ tool: 'add_loan', args: { direction: 'lent', counterparty: 'Ali', amount: 10000, person: 'me' } }], reply: 'Got it, a 10,000 loan to Ali. Tap Confirm to save it.', suggestions: [] }; window.__calls = []; window.__prompts = []; });
  await p.click('#chatBtn'); await p.waitForTimeout(300);
  await p.fill('#chatInput', 'lent ali 10k'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  console.log('chat calls:', await p.evaluate(() => window.__calls.filter(c => c === 'gemini').length), '| last msg:', (await p.$$eval('#chatMsgs .msg', m => m.map(x => x.innerText.replace(/\n+/g, ' / ')))).slice(-1)[0]);
  const pr = await p.evaluate(() => window.__prompts[0]); console.log('quick facts in prompt:', /Quick facts/.test(pr), pr.match(/Quick facts[^\n]{0,160}/)[0]);
  console.log('errors:', errs); await b.close();
})();
