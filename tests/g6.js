// g6: the admin page — Gemini use, daily limit, removing and restoring access.
const { start, loadState } = require("./lib");

(async () => {
  const st = loadState("2");
  for (let i = 0; i < 30; i += 2) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); st["aiUsage/uid_adamxcom_" + d] = { n: 3 + (i * 7) % 20, uid: "uid_adamxcom", day: d }; if (i % 4 === 0) st["aiUsage/uid_linaxcom_" + d] = { n: 5, uid: "uid_linaxcom", day: d }; }
  const T = await start({ seed: st, users: { "adam@x.com": "secret12", "lina@x.com": "secret12", "eve@x.com": "secret12" } }), { p, check } = T;
  console.log("g6: admin");
  await T.login("lina@x.com");
  check(!(await T.visible("#adminNav")), "Lina has no admin page");
  await T.nav("admin");
  check((await p.evaluate(() => location.hash)) === "#admin" && !(await T.visible("#pg-admin")), "Lina can't open #admin");
  await T.login("adam@x.com", "#settings"); await p.waitForTimeout(300);
  check(await T.visible("#adminLink"), "Adam has the admin link in Settings (phone)");
  await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(200);
  check(await T.visible("#adminNav"), "Adam has Admin in the side menu (wide)");
  await p.click("#adminNav"); await p.waitForTimeout(900);
  const body = await T.text("#adminBody");
  check(/People with access/i.test(body) && /Adam/.test(body) && /Lina/.test(body) && /eve@x.com/.test(body), "people, and Eve waiting without an invite", body.slice(0, 300));
  check(!/MVR/.test(body), "no money on the admin page");
  await p.click('.ad-hit[data-i="29"]'); check(/Gemini call/.test(await p.textContent("#adTip")), "tap a bar for the day");
  await p.click('[data-adask="revoke"][data-u="uid_linaxcom"]'); await p.waitForTimeout(200);
  await p.click('[data-adgo="uid_linaxcom"]'); await p.waitForTimeout(900);
  check(/Removed.*Lina/.test(await T.text("#adminBody")), "Lina removed", await T.text("#adminBody"));
  await p.fill("#adLimit", "150"); await p.click("[data-adlimit]"); await p.waitForTimeout(700);
  check((await p.inputValue("#adLimit")) === "150", "limit saved");
  await p.screenshot({ path: require("os").tmpdir() + "/pl_admin.png" });
  await p.setViewportSize({ width: 412, height: 900 });
  await T.login("lina@x.com");
  check((await T.gate()) === "gInvite" && /removed/.test(await p.textContent("#gInviteErr")), "Lina is locked out", [await T.gate(), await p.textContent("#gInviteErr")]);
  await T.login("adam@x.com", "#admin"); await p.waitForTimeout(900);
  await p.click('[data-adact="restore"]'); await p.waitForTimeout(900);
  const names = await p.$$eval("#adminBody .grp b", b => b.map(x => x.textContent));
  check(names.some(n => /Lina/.test(n)), "Lina restored", names);
  await T.end();
})();
