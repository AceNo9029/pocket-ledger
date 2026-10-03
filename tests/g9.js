// g9: sending money between people in a shared group: the receiver checks and accepts it into their own income.
const { start, loadState } = require("./lib");

(async () => {
  const T = await start({ seed: loadState("2"), users: { "faris@x.com": "secret12", "sul@x.com": "secret12" } }), { p, check } = T;
  console.log("g9: transfers between people");
  const personal = async who => (await T.db())["users/uid_" + who + "xcom"].personal;
  const entriesOf = async who => { const d = await T.db(), pid = await personal(who); return Object.keys(d).filter(k => k.startsWith("households/" + pid + "/entries/")).map(k => Object.assign({ id: k.split("/").pop() }, d[k])); };
  // Sul passes on fees to Faris (not her spending)
  await T.login("sul@x.com", "#entries");
  check(await T.visible("[data-xfer]"), "Send money link on the Entries page");
  await p.click("[data-xfer]"); await p.waitForTimeout(500);
  const to = await p.$$eval("#xsTo option", o => o.map(x => x.textContent));
  check(to.length === 1 && /Faris/.test(to[0]), "Sul can send to Faris", to);
  await p.fill("#xsAmt", "2500"); await p.fill("#xsNote", "Fees from Aisha's mum"); await p.click("#xsSend"); await p.waitForTimeout(300);
  check(/Choose how it counts/.test(await p.textContent("#xsErr")), "asks how it counts on her side");
  await p.selectOption("#xsSide", "__none"); await p.click("#xsSend"); await p.waitForTimeout(700);
  check(!(await T.visible("#xferSendWrap")), "sheet closes after sending");
  check((await p.evaluate(() => (window.__notified || []).length)) === 1, "notification requested");
  const sulBefore = (await entriesOf("sul")).length;
  // a second one that is her spending
  await p.click("[data-xfer]"); await p.waitForTimeout(400);
  await p.fill("#xsAmt", "300"); await p.fill("#xsNote", "Lunch"); await p.selectOption("#xsSide", "exp:Eating out"); await p.click("#xsSend"); await p.waitForTimeout(700);
  const sulE = await entriesOf("sul");
  check(sulE.length === sulBefore + 1 && sulE.some(e => e.type === "expense" && e.category === "Eating out" && /To Faris: Lunch/.test(e.note)), "her spending recorded on her side", sulE.map(e => e.note));
  // Faris gets two cards
  await T.login("faris@x.com", "#home"); await p.waitForTimeout(500);
  check(await T.visible("#xferBar"), "Faris sees money sent to him");
  check((await p.$$eval(".xfer-card", c => c.length)) === 2 && /Sul sent you MVR\s?2,500\.00/.test(await T.text("#xferBar")), "two cards, first from Sul for 2,500", await T.text("#xferBar"));
  await p.fill(".xfer-card[data-x='0'] [data-xk=note]", "Fees: Aisha, October"); await p.click(".xfer-card[data-x='0'] [data-xok]"); await p.waitForTimeout(600);
  let fe = await entriesOf("faris");
  const inc = fe.find(e => e.source === "transfer");
  check(inc && inc.type === "income" && inc.amount === 2500 && inc.category === "Side income" && inc.note === "From Sul: Fees: Aisha, October", "accepted into his own income with his edited note", inc);
  check((await p.$$eval(".xfer-card", c => c.length)) === 1, "one card left");
  await p.click(".xfer-card [data-xno]"); await p.waitForTimeout(500);
  check(!(await T.visible("#xferBar")), "declined: no cards left");
  fe = await entriesOf("faris");
  check(fe.filter(e => e.source === "transfer").length === 1, "declining adds nothing");
  // nothing shows in the group's entries, and cards don't come back
  const d = await T.db();
  check(!Object.keys(d).some(k => k.startsWith("households/HH1/entries/") && d[k].source === "transfer"), "nothing added to the group's entries");
  await T.login("faris@x.com"); await p.waitForTimeout(500);
  check(!(await T.visible("#xferBar")), "answered transfers don't come back");
  // notification setting
  await T.nav("settings/notify"); await p.waitForTimeout(400);
  await p.click("#ntXfer"); await p.waitForTimeout(400);
  check((await T.db())["users/uid_farisxcom"].notify.transfers === false, "can turn off money notifications");
  check((await T.denied()).length === 0, "no rule denials", await T.denied());
  await T.end();
})();
