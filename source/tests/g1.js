const { chromium } = require('playwright'); const fs = require('fs');
const H = 'households/HH1';
const seed = {
  [H]: { members: ['uid_farisxcom', 'uid_sulxcom'], personOf: { uid_farisxcom: 'p1', uid_sulxcom: 'p2' }, joinUntil: 0, ai: { server: true }, gemini: { key: '' },
    settings: { currency: 'MVR', opening: 1000, openingBy: { p1: 1000, p2: 500 }, people: [{ id: 'p1', name: 'Faris', acct: '5369', bank: 'AHMED FARIS', color: '#1f8a7a' }, { id: 'p2', name: 'Sul', acct: '1111', color: '#c0587e' }], budgets: { p1: { Food: 2000 }, all: { Bills: 3000 } } } },
  [H + '/entries/e1']: { type: 'income', amount: 20000, date: '2026-10-01', category: 'Salary', person: 'p1', created: 1 },
  [H + '/entries/e2']: { type: 'expense', amount: 300, date: '2026-10-01', category: 'Food', note: 'Faris lunch', person: 'p1', created: 2 },
  [H + '/entries/e3']: { type: 'expense', amount: 1000, date: '2026-10-01', category: 'Groceries', note: 'Shared groceries', person: 'p1', split: { with: 'p2', share: 0.5 }, created: 3 },
  [H + '/entries/e4']: { type: 'expense', amount: 450, date: '2026-10-01', category: 'Shopping', note: 'Sul dress', person: 'p2', created: 4 },
  [H + '/entries/e5']: { type: 'save', amount: 700, date: '2026-10-01', category: 'Savings', goalId: 'gS', person: 'p2', created: 5 },
  [H + '/entries/e6']: { type: 'income', amount: 15000, date: '2026-10-01', category: 'Salary', person: 'p2', created: 6 },
  [H + '/goals/gP']: { name: 'New phone', target: 20000, owner: 'p1', created: 1 },
  [H + '/goals/gS']: { name: 'Bali trip', target: 30000, owner: 'shared', created: 2 },
  [H + '/loans/l1']: { direction: 'lent', counterparty: 'Ali', amount: 10000, date: '2026-09-20', person: 'p1', created: 1 },
  [H + '/recurring/r1']: { type: 'expense', amount: 800, category: 'Bills', note: 'Sul phone', person: 'p2', day: 15, remindDays: 3, startMonth: '2026-10' },
  [H + '/settlements/s1']: { from: 'p2', to: 'p1', amount: 100, date: '2026-09-30', created: 1 },
  'users/uid_farisxcom': { household: 'HH1', email: 'faris@x.com' },
  'users/uid_sulxcom': { household: 'HH1', email: 'sul@x.com' }
};
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/mockfb/' + r.request().url().split('/').pop()) }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(300);
  await p.evaluate(s => { localStorage.clear(); localStorage.setItem('mock-db', JSON.stringify(s)); localStorage.setItem('mock-users', JSON.stringify({ 'faris@x.com': 'secret12', 'sul@x.com': 'secret12', 'ali@x.com': 'secret12' })); }, seed);
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('mock-db')));
  const login = async email => { await p.evaluate(e => localStorage.setItem('mock-cur', e), email); await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500); };
  const show = async tag => {
    const t = await p.evaluate(() => ({
      bar: [...document.querySelectorAll('#spaceBar button')].map(b => (b.getAttribute('aria-pressed') === 'true' ? '*' : '') + b.textContent).join(' | '),
      barHidden: document.getElementById('spaceBar').hidden, whoHidden: document.getElementById('who').hidden,
      who: [...document.querySelectorAll('#who button')].map(b => b.textContent).join(','),
      hero: document.getElementById('heroLabel').textContent, left: document.getElementById('leftSub').textContent,
      rows: [...document.querySelectorAll('#ledger li.tx')].map(li => li.querySelector('.what').innerText.replace(/\n/g, ' ~ ') + ' [' + [...li.querySelectorAll('button')].map(x => x.textContent).join('/') + ']'),
      goals: [...document.querySelectorAll('#goals .goal')].map(g => g.querySelector('h3').textContent + ' [' + [...g.querySelectorAll('button')].map(x => x.textContent).join('/') + ']'),
      owes: document.getElementById('owesBar').hidden ? '' : document.getElementById('owesBar').innerText,
      ro: !document.getElementById('readonlyBanner').hidden ? document.getElementById('readonlyBanner').innerText : '',
      req: document.getElementById('reqBar').hidden ? '' : document.getElementById('reqBar').innerText,
      denied: window.__denied || []
    }));
    console.log('=== ' + tag); console.log(JSON.stringify(t, null, 1));
  };
  await login('faris@x.com'); await show('Faris after migration (Me)');
  let d = await db();
  console.log('faris user doc:', JSON.stringify(d['users/uid_farisxcom']));
  console.log('group keys:', Object.keys(d).filter(k => k.startsWith(H)).join(' '));
  console.log('group doc:', JSON.stringify(Object.assign({}, d[H], { legacy: '…' })));
  await p.click('#spaceBar button:nth-child(2)'); await p.waitForTimeout(1500); await show('Faris in Household group');
  fs.writeFileSync('/tmp/g_state.json', JSON.stringify(await db()));
  console.log('errors:', errs); await b.close();
})();
