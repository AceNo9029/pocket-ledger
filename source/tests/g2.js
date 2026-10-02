const { chromium } = require('playwright'); const fs = require('fs');
const H = 'households/HH1';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/mockfb/' + r.request().url().split('/').pop()) }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(300);
  const st = JSON.parse(fs.readFileSync('/tmp/g_state.json'));
  await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mock-db', JSON.stringify(s)); localStorage.setItem('mock-users', JSON.stringify({ 'faris@x.com': 'secret12', 'sul@x.com': 'secret12', 'ali@x.com': 'secret12' })); }, st);
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('mock-db')));
  const login = async email => { await p.evaluate(e => { localStorage.setItem('mock-cur', e); window.__denied = []; }, email); await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500); };
  const show = async tag => {
    const t = await p.evaluate(() => ({
      bar: [...document.querySelectorAll('#spaceBar button')].map(b => (b.getAttribute('aria-pressed') === 'true' ? '*' : '') + b.textContent).join(' | '),
      who: document.getElementById('who').hidden ? '(hidden)' : [...document.querySelectorAll('#who button')].map(b => b.textContent).join(','),
      hero: document.getElementById('heroLabel').textContent, left: document.getElementById('leftSub').textContent,
      rows: [...document.querySelectorAll('#ledger li.tx')].map(li => li.querySelector('.what').innerText.replace(/\n/g, ' ~ ') + ' [' + [...li.querySelectorAll('button')].map(x => x.textContent).join('/') + ']'),
      goals: [...document.querySelectorAll('#goals .goal')].map(g => g.querySelector('h3').textContent + ' [' + [...g.querySelectorAll('button')].map(x => x.textContent).join('/') + ']'),
      owes: document.getElementById('owesBar').hidden ? '' : document.getElementById('owesBar').innerText,
      bills: document.getElementById('dueBar') && !document.getElementById('dueBar').hidden ? document.getElementById('dueBar').innerText.slice(0, 120) : '',
      ro: !document.getElementById('readonlyBanner').hidden ? document.getElementById('readonlyBanner').innerText : '',
      req: document.getElementById('reqBar').hidden ? '' : document.getElementById('reqBar').innerText,
      formDisabled: document.getElementById('submitBtn').disabled,
      denied: window.__denied || []
    }));
    console.log('=== ' + tag); console.log(JSON.stringify(t, null, 1));
  };
  await login('sul@x.com'); await show('Sul after migration (Me)');
  let d = await db();
  console.log('group keys:', Object.keys(d).filter(k => k.startsWith(H)).join(' '));
  await p.click('#spaceBar button:nth-child(2)'); await p.waitForTimeout(1200); await show('Sul in Household');
  // Sul adds a group expense
  await p.click('.seg button[data-t=expense]'); await p.fill('#fAmount', '250'); await p.selectOption('#fCatSel', { index: 1 }); await p.click('#submitBtn'); await p.waitForTimeout(400);
  await show('Sul after adding group expense');
  // settings as Sul: groups / privacy
  await p.click('#settingsBtn'); await p.waitForTimeout(800);
  console.log('Sul settings groups:', await p.innerText('#grpList'), '\nprivacy:', await p.innerText('#privList'));
  await p.waitForTimeout(100); console.log('name fields:', await p.inputValue('#setName1'), await p.inputValue('#setAcct1'), await p.isVisible('#setName2'));
  // ask to see Faris's dashboard
  await p.click('#privList button[data-ask]'); await p.waitForTimeout(500);
  console.log('after ask:', await p.innerText('#privList'));
  // Faris logs in and sees the request
  await login('faris@x.com'); await show('Faris sees request');
  await p.click('#reqBar button[data-reqok]'); await p.waitForTimeout(400);
  d = await db(); const fp = d['users/uid_farisxcom'].personal; console.log('Faris personal viewers:', d['households/' + fp].viewers);
  // Faris renames the group
  await p.click('#spaceBar button:nth-child(2)'); await p.waitForTimeout(1200);
  await p.click('#settingsBtn'); await p.waitForTimeout(800);
  await p.fill('#grpList input[data-rename]', 'Home'); await p.click('#grpList button[data-renameok]'); await p.waitForTimeout(400);
  await p.click('#grpList button[data-inv]'); await p.waitForTimeout(300);
  console.log('Faris groups:', await p.innerText('#grpList'));
  await p.click('#closeSettings').catch(() => {});
  await show('Faris in renamed group');
  // Sul views Faris's dashboard
  await login('sul@x.com'); await show('Sul landing');
  const btns = await p.$$eval('#spaceBar button', bs => bs.map(b => b.textContent));
  await p.click('#spaceBar button:nth-child(' + (btns.findIndex(t => /view only/.test(t)) + 1) + ')'); await p.waitForTimeout(1500); await show('Sul viewing Faris');
  fs.writeFileSync('/tmp/g_state2.json', JSON.stringify(await db()));
  console.log('errors:', errs); await b.close();
})();
