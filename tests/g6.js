// g6: the admin page — Gemini use, daily limit, removing and restoring access.
const { start, loadState } = require("./lib");

(async () => {
  const st = loadState("2");
  for (let i = 0; i < 30; i += 2) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); st["aiUsage/uid_farisxcom_" + d] = { n: 3 + (i * 7) % 20, uid: "uid_farisxcom", day: d }; if (i % 4 === 0) st["aiUsage/uid_sulxcom_" + d] = { n: 5, uid: "uid_sulxcom", day: d }; }
  const T = await start({ seed: st, users: { "faris@x.com": "secret12", "sul@x.com": "secret12", "eve@x.com": "secret12" } }), { p, check } = T;
  console.log("g6: admin");
  await T.login("sul@x.com");
  check(!(await T.visible("#adminNav")), "Sul has no admin page");
  await T.nav("admin");
  check((await p.evaluate(() => location.hash)) === "#admin" && !(await T.visible("#pg-admin")), "Sul can't open #admin");
  await T.login("faris@x.com", "#settings"); await p.waitForTimeout(300);
  check(await T.visible("#adminLink"), "Faris has the admin link in Settings (phone)");
  await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(200);
  check(await T.visible("#adminNav"), "Faris has Admin in the side menu (wide)");
  await p.click("#adminNav"); await p.waitForTimeout(900);
  const body = await T.text("#adminBody");
  check(/People with access/i.test(body) && /Faris/.test(body) && /Sul/.test(body) && /eve@x.com/.test(body), "people, and Eve waiting without an invite", body.slice(0, 300));
  check(!/MVR/.test(body), "no money on the admin page");
  await p.click('.ad-hit[data-i="29"]'); check(/Gemini call/.test(await p.textContent("#adTip")), "tap a bar for the day");
  await p.click('[data-adask="revoke"][data-u="uid_sulxcom"]'); await p.waitForTimeout(200);
  await p.click('[data-adgo="uid_sulxcom"]'); await p.waitForTimeout(900);
  check(/Removed.*Sul/.test(await T.text("#adminBody")), "Sul removed", await T.text("#adminBody"));
  await p.fill("#adLimit", "150"); await p.click("[data-adlimit]"); await p.waitForTimeout(700);
  check((await p.inputValue("#adLimit")) === "150", "limit saved");
  await p.screenshot({ path: require("os").tmpdir() + "/pl_admin.png" });
  await p.setViewportSize({ width: 412, height: 900 });
  await T.login("sul@x.com");
  check((await T.gate()) === "gInvite" && /removed/.test(await p.textContent("#gInviteErr")), "Sul is locked out", [await T.gate(), await p.textContent("#gInviteErr")]);
  await T.login("faris@x.com", "#admin"); await p.waitForTimeout(900);
  await p.click('[data-adact="restore"]'); await p.waitForTimeout(900);
  const names = await p.$$eval("#adminBody .grp b", b => b.map(x => x.textContent));
  check(names.some(n => /Sul/.test(n)), "Sul restored", names);
  await T.end();
})();
