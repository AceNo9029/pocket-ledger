const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/mockfb/' + r.request().url().split('/').pop()) }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() !== 'log') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(300);
  const st = JSON.parse(fs.readFileSync('/tmp/g_state2.json'));
  await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mock-db', JSON.stringify(s)); localStorage.setItem('mock-users', JSON.stringify({ 'faris@x.com': 'secret12', 'sul@x.com': 'secret12', 'ali@x.com': 'secret12', 'zed@x.com': 'secret12', 'eve@x.com': 'secret12' })); }, st);
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('mock-db')));
  const login = async email => { await p.evaluate(e => { localStorage.setItem('mock-cur', e); window.__denied = []; }, email); await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500); };
  const view = () => p.evaluate(() => ['gLoading', 'gSignin', 'gInvite', 'gSetup'].filter(v => !document.getElementById(v).hidden).join(',') + ' gate:' + !document.getElementById('gate').hidden);
  // Sul (not admin) shouldn't see the invite section
  await login('sul@x.com'); await p.click('#settingsBtn'); await p.waitForTimeout(500);
  console.log('Sul sees invites section:', await p.isVisible('#invSec'));
  // Faris is admin
  await login('faris@x.com'); await p.click('#settingsBtn'); await p.waitForTimeout(500);
  console.log('Faris sees invites section:', await p.isVisible('#invSec'), await p.$$eval('#invGroup option', o => o.map(x => x.textContent)));
  await p.fill('#invNote', 'Ali'); await p.selectOption('#invGroup', { index: 1 }); await p.click('#invMake'); await p.waitForTimeout(600);
  await p.fill('#invNote', 'Zed'); await p.selectOption('#invGroup', { index: 0 }); await p.click('#invMake'); await p.waitForTimeout(600);
  console.log('invites:', (await p.innerText('#invList')).replace(/\n+/g, ' / '));
  const links = await p.$$eval('#invList input', i => i.map(x => x.value)); console.log(links);
  let d = await db(); console.log('HH1 joinUntil open:', d['households/HH1'].joinUntil > Date.now());
  // stranger without invite
  await p.evaluate(() => localStorage.removeItem('mock-cur')); await p.goto('http://localhost:8765/'); await p.waitForTimeout(500);
  await p.fill('#gEmail', 'eve@x.com'); await p.fill('#gPass', 'secret12'); await p.click('#gSigninBtn'); await p.waitForTimeout(1000);
  console.log('Eve (no invite):', await view(), '| err:', await p.textContent('#gInviteErr'));
  await p.fill('#gInviteCode', 'NOPEnope123'); await p.click('#gInviteBtn'); await p.waitForTimeout(500);
  console.log('Eve bad code:', await p.textContent('#gInviteErr'));
  // Ali with group invite link (link for Ali is the one with &join)
  const aliLink = links.find(l => l.includes('join=')), zedLink = links.find(l => !l.includes('join='));
  await p.evaluate(() => localStorage.removeItem('mock-cur')); await p.goto(aliLink.replace('https://', 'http://').replace(/^http:\/\/[^/]+\//, 'http://localhost:8765/')); await p.waitForTimeout(500);
  await p.fill('#gEmail', 'ali@x.com'); await p.fill('#gPass', 'secret12'); await p.click('#gSigninBtn'); await p.waitForTimeout(1200);
  console.log('Ali:', await view());
  await p.fill('#gMyName', 'Ali'); await p.click('#gContinue'); await p.waitForTimeout(2000);
  console.log('Ali in:', await view(), await p.$$eval('#spaceBar button', bs => bs.map(b => (b.getAttribute('aria-pressed') === 'true' ? '*' : '') + b.textContent)), 'url', p.url());
  // Eve reuses Ali's link
  await p.evaluate(() => localStorage.removeItem('mock-cur')); await p.goto(aliLink.replace(/^https?:\/\/[^/]+\/[^?]*/, 'http://localhost:8765/')); await p.waitForTimeout(500);
  await p.fill('#gEmail', 'eve@x.com'); await p.fill('#gPass', 'secret12'); await p.click('#gSigninBtn'); await p.waitForTimeout(1200);
  console.log('Eve reusing:', await view(), '|', await p.textContent('#gInviteErr'));
  // Zed types code manually
  await p.click('#gInviteOut'); await p.waitForTimeout(500);
  await p.fill('#gEmail', 'zed@x.com'); await p.fill('#gPass', 'secret12'); await p.click('#gSigninBtn'); await p.waitForTimeout(1200);
  await p.fill('#gInviteCode', zedLink); await p.click('#gInviteBtn'); await p.waitForTimeout(1200);
  console.log('Zed after code:', await view());
  await p.fill('#gMyName', 'Zed'); await p.click('#gContinue'); await p.waitForTimeout(1800);
  console.log('Zed in:', await view(), await p.$$eval('#spaceBar button', bs => bs.map(b => b.textContent)), await p.textContent('#heroLabel'));
  d = await db(); console.log('HH1 members:', d['households/HH1'].members, '| access:', Object.keys(d).filter(k => k.startsWith('access/')).map(k => k + (d[k].admin ? '(admin)' : '')).join(' '));
  // Faris list shows used
  await login('faris@x.com'); await p.click('#settingsBtn'); await p.waitForTimeout(600);
  console.log('Faris invites now:', (await p.innerText('#invList')).replace(/\n+/g, ' / '));
  console.log('denied:', await p.evaluate(() => window.__denied || []));
  console.log('errors:', errs); await b.close();
})();
