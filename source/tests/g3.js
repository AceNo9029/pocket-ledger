const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/mockfb/' + r.request().url().split('/').pop()) }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => errs.push('console: ' + m.text()));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(300);
  const st = JSON.parse(fs.readFileSync('/tmp/g_state2.json'));
  await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mock-db', JSON.stringify(s)); localStorage.setItem('mock-users', JSON.stringify({ 'ali@x.com': 'secret12' })); }, st);
  await p.goto('http://localhost:8765/?join=HH1'); await p.waitForTimeout(800);
  await p.fill('#gEmail', 'ali@x.com'); await p.fill('#gPass', 'secret12'); await p.click('#gSigninBtn'); await p.waitForTimeout(1000);
  console.log('views:', await p.evaluate(() => ['gLoading','gSignin','gSetup'].map(v => v + ':' + document.getElementById(v).hidden).join(' ')), await p.inputValue('#gJoinCode'));
  await p.fill('#gMyName', 'Ali'); await p.click('#gContinue'); await p.waitForTimeout(2000);
  console.log('err:', await p.textContent('#gSetupErr'), 'gate hidden', await p.evaluate(() => document.getElementById('gate').hidden), 'url', p.url());
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('mock-db')));
  console.log(d['users/uid_alixcom'], d['households/HH1'].members);
  console.log('bar:', await p.$$eval('#spaceBar button', bs => bs.map(b => b.textContent)), await p.textContent('#heroLabel'));
  console.log(errs.join('\n')); await b.close();
})();
