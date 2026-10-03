// g12: tap a category on Home to see its entries; the total of whatever is chosen on Entries.
const { start, loadState } = require("./lib");
(async () => {
  const T = await start({ seed: loadState("2"), users: { "adam@x.com": "secret12" } }), { p, check } = T;
  console.log("g12: category drill-down and totals");
  await T.login("adam@x.com", "#entries");
  for (const [amt, cat] of [[85, 2], [40, 2], [120, 1]]) await T.addEntry("expense", amt, cat);
  const c2 = await p.$eval("#fCatSel", s => s.options[2].value);
  await T.nav("home"); await p.waitForTimeout(400);
  await p.click(`#cats [data-cat-go="${c2}"]`); await p.waitForTimeout(800);
  check(/#entries/.test(p.url()), "tapping a category opens Entries", p.url());
  check((await p.inputValue("#catFilter")) === c2, "filtered to that category", await p.inputValue("#catFilter"));
  const rows = await T.rows();
  check(rows.length === 2 && rows.every(r => r.includes(c2)), "only its entries", rows);
  const tot = await T.text("#ledgerTotal");
  check(new RegExp(c2.replace(/[&]/g, "\\&") + ".*2 entries.*MVR\\s?125\\.00 spent").test(tot), "total for the category", tot);
  await p.click("#ledgerTotal [data-cat-clear]"); await p.waitForTimeout(300);
  check((await T.rows()).length > 2 && /Spent/.test(await T.text("#ledgerTotal")), "clear shows all categories, total updates", await T.text("#ledgerTotal"));
  await p.selectOption("#catFilter", c2); await p.waitForTimeout(300);
  check((await T.rows()).length === 2, "category picker on Entries works too");
  await p.click('.filters [data-f="all"]'); await p.fill("#searchQ", "zzzz"); await p.waitForTimeout(500);
  check(await p.isHidden("#ledgerTotal"), "no total when nothing matches");
  await T.end();
})();
