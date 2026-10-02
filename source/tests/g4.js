const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/mockfb/' + r.request().url().split('/').pop()) }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() !== 'log') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('mock-db', JSON.stringify({ 'invites/TESTCODE1': { by: 'x', expires: Date.now() + 1e8, max: 1, used: [] } })); });
  await p.goto('http://localhost:8765/?invite=TESTCODE1'); await p.waitForTimeout(500);
  await p.fill('#gEmail', 'new@y.com'); await p.fill('#gPass', 'secret12'); await p.click('#gCreateBtn'); await p.waitForTimeout(600);
  await p.fill('#gMyName', 'Faris'); await p.click('#gContinue'); await p.waitForTimeout(1500);
  console.log('bar hidden', await p.evaluate(() => document.getElementById('spaceBar').hidden), 'who hidden', await p.evaluate(() => document.getElementById('who').hidden));
  await p.click('.seg button[data-t=income]'); await p.fill('#fAmount', '6000'); await p.click('#submitBtn'); await p.waitForTimeout(300);
  await p.click('.seg button[data-t=expense]'); await p.fill('#fAmount', '120'); await p.selectOption('#fCatSel', { index: 1 }); await p.click('#submitBtn'); await p.waitForTimeout(300);
  console.log(await p.textContent('#heroLabel'), '|', await p.textContent('#leftSub'), '| split row hidden', await p.evaluate(() => document.getElementById('splitRow').hidden));
  // goal
  await p.evaluate(() => document.getElementById('goalBox').open = true); await p.waitForTimeout(100);
  console.log('goal owner field hidden', await p.evaluate(() => document.getElementById('gOwner').closest('.field').hidden));
  // settings
  await p.click('#settingsBtn'); await p.waitForTimeout(500);
  await p.fill('#setName1', 'Faris A'); await p.fill('#setAcct1', '12345369'); await p.fill('#setOpen1', '2500'); await p.click('#saveSettings'); await p.waitForTimeout(500);
  let d = await p.evaluate(() => JSON.parse(localStorage.getItem('mock-db')));
  const u = d['users/uid_newycom']; console.log('personal settings:', JSON.stringify(d['households/' + u.personal].settings));
  // create a group
  await p.click('#settingsBtn'); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll('#grpSec details').forEach(x => x.open = true));
  await p.fill('#grpNewName', 'Bali trip'); await p.click('#grpCreate'); await p.waitForTimeout(1800);
  console.log('bar:', await p.$$eval('#spaceBar button', bs => bs.map(b => (b.getAttribute('aria-pressed') === 'true' ? '*' : '') + b.textContent).join(' | ')), '|', await p.textContent('#heroLabel'));
  await p.click('.seg button[data-t=expense]'); await p.fill('#fAmount', '900'); await p.selectOption('#fCatSel', { index: 2 }); await p.click('#submitBtn'); await p.waitForTimeout(300);
  console.log('group rows:', await p.$$eval('#ledger li.tx', ls => ls.map(l => l.innerText.replace(/\n/g, ' ~ '))));
  await p.click('#settingsBtn'); await p.waitForTimeout(700);
  console.log('groups:', (await p.innerText('#grpList')).replace(/\n+/g, ' / '));
  console.log('srv:', await p.textContent('#srvState'), 'notify:', await p.textContent('#ntState'));
  d = await p.evaluate(() => JSON.parse(localStorage.getItem('mock-db')));
  console.log('denied:', await p.evaluate(() => window.__denied || []));
  console.log('errors:', errs); await b.close();
})();
