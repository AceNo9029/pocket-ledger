// g5: invite-only — admin makes links, strangers are kept out, links work once.
const { start, loadState, URL0 } = require("./lib");
const users = { "faris@x.com": "secret12", "sul@x.com": "secret12", "ali@x.com": "secret12", "zed@x.com": "secret12", "eve@x.com": "secret12" };

(async () => {
  const T = await start({ seed: loadState("2"), users }), { p, check } = T;
  console.log("g5: invites");
  const signIn = async (email, url) => { await T.logout(); await p.goto("about:blank"); await p.goto(url || URL0); await p.waitForTimeout(500); await p.fill("#gEmail", email); await p.fill("#gPass", "secret12"); await p.click("#gSigninBtn"); await p.waitForTimeout(1300); };
  await T.login("sul@x.com", "#settings"); await p.waitForTimeout(400);
  check(!(await T.visible("#invSec")), "Sul (not admin) has no invite section");
  await T.login("faris@x.com", "#settings"); await p.waitForTimeout(500);
  check(await T.visible("#invSec"), "Faris (admin) has the invite section");
  const opts = await p.$$eval("#invGroup option", o => o.map(x => x.textContent));
  check(opts.length === 2 && /Home/.test(opts[1]), "can add them to his group", opts);
  await p.fill("#invNote", "Ali"); await p.selectOption("#invGroup", { index: 1 }); await p.click("#invMake"); await p.waitForTimeout(700);
  await p.fill("#invNote", "Zed"); await p.selectOption("#invGroup", { index: 0 }); await p.click("#invMake"); await p.waitForTimeout(700);
  const links = await p.$$eval("#invList input", i => i.map(x => x.value));
  check(links.length === 2, "two invite links", links);
  const aliLink = links.find(l => l.includes("join=")), zedLink = links.find(l => !l.includes("join="));
  const local = l => l.replace(/^https?:\/\/[^/]+\/[^?]*/, URL0);
  // stranger without invite
  await signIn("eve@x.com");
  check((await T.gate()) === "gInvite", "Eve without an invite is stopped", await T.gate());
  await p.fill("#gInviteCode", "NOPEnope123"); await p.click("#gInviteBtn"); await p.waitForTimeout(600);
  check(/isn't valid/.test(await p.textContent("#gInviteErr")), "bad code is refused", await p.textContent("#gInviteErr"));
  // Ali uses his link (with a group)
  await signIn("ali@x.com", local(aliLink));
  check((await T.gate()) === "gSetup", "Ali's link lets him set up", await T.gate());
  await p.fill("#gMyName", "Ali"); await p.click("#gContinue"); await p.waitForTimeout(2200);
  check((await T.bar()).join("|") === "Me|*Home", "Ali lands in Faris's group", await T.bar());
  // Eve reuses Ali's link
  await signIn("eve@x.com", local(aliLink));
  check((await T.gate()) === "gInvite" && /already been used/.test(await p.textContent("#gInviteErr")), "a used link can't be reused", [await T.gate(), await p.textContent("#gInviteErr")]);
  // Zed pastes his link by hand
  await p.click("#gInviteOut"); await p.waitForTimeout(600);
  await p.fill("#gEmail", "zed@x.com"); await p.fill("#gPass", "secret12"); await p.click("#gSigninBtn"); await p.waitForTimeout(1300);
  await p.fill("#gInviteCode", zedLink); await p.click("#gInviteBtn"); await p.waitForTimeout(1300);
  check((await T.gate()) === "gSetup", "Zed's pasted link works", await T.gate());
  await p.fill("#gMyName", "Zed"); await p.click("#gContinue"); await p.waitForTimeout(1800);
  check(/gate closed/.test(await T.gate()) && await p.isHidden("#spaceBar"), "Zed is in, with just his own space", await T.bar());
  const d = await T.db();
  check(d["households/HH1"].members.includes("uid_alixcom") && !d["households/HH1"].members.includes("uid_zedxcom"), "only Ali joined the group");
  // Faris sees both used
  await T.login("faris@x.com", "#settings"); await p.waitForTimeout(700);
  const list = await T.text("#invList");
  check((list.match(/Used by/g) || []).length === 2, "both invites show as used", list);
  check((await T.denied()).length === 0, "no rule denials", await T.denied());
  await T.end();
})();
