// g3: someone new opens a group link (?join=HH1): invite-only gate, then set-up joins the group.
const { start, loadState, URL0 } = require("./lib");

(async () => {
  const st = loadState("2");
  st["invites/ALIINVITE1"] = { by: "uid_farisxcom", note: "Ali", group: null, created: Date.now(), expires: Date.now() + 1e8, max: 1, used: [] };
  const T = await start({ seed: st, users: { "ali@x.com": "secret12" } }), { p, check } = T;
  console.log("g3: joining a group from a link");
  await p.goto(URL0 + "?join=HH1"); await p.waitForTimeout(800);
  await p.fill("#gEmail", "ali@x.com"); await p.fill("#gPass", "secret12"); await p.click("#gSigninBtn"); await p.waitForTimeout(1200);
  check((await T.gate()) === "gInvite", "Ali without an invite gets the invite-only screen", await T.gate());
  await p.fill("#gInviteCode", "ALIINVITE1"); await p.click("#gInviteBtn"); await p.waitForTimeout(1500);
  check((await T.gate()) === "gSetup", "valid invite → set-up", await T.gate());
  check((await p.inputValue("#gJoinCode")) === "HH1", "group code from the link is filled in", await p.inputValue("#gJoinCode"));
  await p.fill("#gMyName", "Ali"); await p.click("#gContinue"); await p.waitForTimeout(2200);
  check(/gate closed/.test(await T.gate()), "app opens", await T.gate());
  const d = await T.db();
  check(d["households/HH1"].members.includes("uid_alixcom") && d["users/uid_alixcom"].spaces.includes("HH1"), "Ali joined the group");
  const bar = await T.bar();
  check(bar.join("|") === "Me|*Home", "Ali lands in the group", bar);
  check(/All of Home/.test(await T.text("#who")), "group switch shows", await T.text("#who"));
  check((await T.denied()).length === 0, "no rule denials", await T.denied());
  await T.end();
})();
