
  // ======================================================================
  // Spaces: everyone has their own private space ("Me"), plus any groups
  // they're in. Group entries are seen by the whole group but can only be
  // changed by whoever added them. People can ask to see someone's own
  // dashboard; if allowed, they get a view-only copy.
  // ======================================================================
  var SP = { space: null, spaces: [], profile: {}, my: null };
  function meId() { return (fbctx && fbctx.user && fbctx.user.uid) || ""; }
  function spaceMode() { return !!(household && household.type); }
  function isGroup() { return !!(household && household.type === "group"); }
  function isViewer() { return !!(SP.space && SP.space.role === "viewer"); }
  function houseName() { return isGroup() ? (household.name || "Group") : "Household"; }
  const FS = () => fbctx.F, hRef = id => FS().doc(fbctx.db, "households", id), uRef = () => FS().doc(fbctx.db, "users", meId());

  // Old shared households used "p1"/"p2" for people; map them to accounts.
  function legacyIds(arr) {
    const pOf = household && household.personOf; if (!pOf || !arr) return arr;
    const inv = {}; Object.keys(pOf).forEach(u => { inv[pOf[u]] = u; });
    const m = v => (v === "p1" || v === "p2") && inv[v] ? inv[v] : v;
    arr.forEach(x => {
      if (x.person) x.person = m(x.person);
      if (x.owner) x.owner = m(x.owner);
      if (x.split && x.split.with) x.split = Object.assign({}, x.split, { with: m(x.split.with) });
      if (x.from) x.from = m(x.from);
      if (x.to) x.to = m(x.to);
    });
    return arr;
  }

  // Can I change this entry / goal / loan / bill?
  function canEdit(x) {
    if (readOnly || !x) return false;
    if (!spaceMode()) return true;
    const me = meId();
    if (x.author) return x.author === me;
    if (!isGroup()) return true;
    if (x.owner === "shared") return household.owner === me;
    return !!(x.person || x.owner) && (x.person || x.owner) === me;
  }
  // Until someone opens the new version, their old private entries still sit in
  // the shared group. Keep those out of sight: only split costs, shared-goal
  // savings and things added in the group itself belong there.
  function hideOthersPrivate() {
    if (!isGroup()) return;
    const me = meId(), shared = new Set(state.goals.filter(g => g.owner === "shared").map(g => g.id));
    const mineOrGroup = x => !!x.author || (x.person || x.owner) === me;
    state.entries = state.entries.filter(e => mineOrGroup(e) || (e.split && e.split.with) || (e.goalId && shared.has(e.goalId)));
    state.goals = state.goals.filter(g => g.owner === "shared" || mineOrGroup(g));
    ["loans", "recurring"].forEach(k => { if (state[k]) state[k] = state[k].filter(mineOrGroup); });
  }
  function addedBy(x) { const a = x && (x.author || x.person); return a && a !== meId() && isGroup() ? pname(a) : ""; }

  // people for this space
  normalize = (orig => function () {
    if (spaceMode()) {
      const st = state.settings, me = meId();
      if (isGroup()) {
        const nm = household.names || {}, cl = household.colors || {};
        st.people = (household.members || []).map(u => Object.assign({ id: u, name: nm[u] || "Member" }, cl[u] ? { color: cl[u] } : {},
          u === me && SP.my ? { bank: SP.my.bank || "", acct: SP.my.acct || "" } : {}));
        if (!st.people.length) st.people = [{ id: me, name: "Me" }];
      } else if (!Array.isArray(st.people) || !st.people.length) st.people = [{ id: household.owner || me, name: "Me" }];
      const solo = isGroup() ? "" : st.people[0].id;
      state.entries.forEach(e => { if (!e.person) e.person = e.author || solo || household.owner; });
      state.goals.forEach(g => { if (!g.owner) g.owner = solo || g.author || "shared"; });
      if (!st.openingBy) st.openingBy = {};
      if (!isGroup()) ui.view = st.people[0].id;
      else if (ui.view !== "all" && !st.people.some(p => p.id === ui.view)) ui.view = "all";
    }
    orig();
    hideOthersPrivate();
  })(normalize);

  // ---------- hide change buttons on things other people added ----------
  function lockOthers() {
    if (!spaceMode()) return;
    const find = (arr, id) => (arr || []).find(x => x.id === id);
    const strip = (sel, attr, arr) => document.querySelectorAll(sel).forEach(b => { if (!canEdit(find(arr, b.dataset[attr]))) b.remove(); });
    strip("#ledger button[data-edit]", "edit", state.entries); strip("#ledger button[data-ask]", "ask", state.entries);
    strip("#goals button[data-gedit]", "gedit", state.goals); strip("#goals button[data-gask]", "gask", state.goals);
    strip("button[data-repay]", "repay", state.loans); strip("button[data-inmonth]", "inmonth", state.loans);
    strip("button[data-rpause]", "rpause", state.recurring); strip("button[data-rask]", "rask", state.recurring);
    if (isGroup() && !isHouse()) document.querySelectorAll("#ledger li.tx").forEach(li => {
      const e = find(state.entries, li.dataset.id); const by = addedBy(e); const sm = li.querySelector(".what small");
      if (by && sm && !sm.querySelector(".by-tag")) sm.insertAdjacentHTML("beforeend", ` <span class="by-tag">added by ${esc(by)}</span>`);
    });
  }
  renderLedger = (o => function () { o(); lockOthers(); })(renderLedger);
  renderGoals = (o => function () { o(); lockOthers(); })(renderGoals);
  renderLoans = (o => function () { o(); lockOthers(); })(renderLoans);
  renderRecurring = (o => function () { o(); lockOthers(); })(renderRecurring);

  // the form: in a space you always add things as yourself
  renderFormBits = (o => function () {
    o();
    if (!spaceMode()) return;
    const me = meId(), myName = pname(me);
    $("whoField").hidden = true;
    $("fWho").innerHTML = `<option value="${esc(me)}">${esc(myName)}</option>`;
    const go = $("gOwner"), cur = go.value;
    go.innerHTML = isGroup() ? `<option value="shared">Shared with ${esc(houseName())}</option>` : `<option value="${esc(me)}">${esc(myName)}</option>`;
    go.value = go.options[0].value; if (cur && [...go.options].some(x => x.value === cur)) go.value = cur;
    go.closest(".field").hidden = true;
  })(renderFormBits);

  // ---------- the bar at the top: Me / groups / dashboards shared with me ----------
  function renderSpaceBar() {
    const bar = $("spaceBar"); if (!bar) return;
    const list = SP.spaces || [];
    bar.hidden = list.length < 2;
    bar.innerHTML = list.map(s => `<button type="button" data-space="${esc(s.id)}" aria-pressed="${s.id === (SP.space && SP.space.id)}">${esc(s.role === "viewer" ? s.name + " (view only)" : s.name)}</button>`).join("");
  }
  function afterRenderSpaces() {
    if (!spaceMode()) return;
    renderSpaceBar();
    $("who").hidden = !isGroup() || people().length < 2;
    const hb = $("who").querySelector("button.house"); if (hb) hb.textContent = "All of " + houseName();
    if (isViewer()) { $("readonlyBanner").hidden = false; $("readonlyBanner").innerHTML = `<span>You're looking at ${esc(SP.space.name.replace(/'s$/, ""))}'s dashboard. Only they can change it.</span>`; }
    if (!isGroup() && !isViewer()) { $("heroLabel").textContent = "Left to spend this month"; }
  }
  render = (o => function () { try { hideOthersPrivate(); } catch (e) {} o(); try { afterRenderSpaces(); } catch (e) { console.error(e); } })(render);
  document.addEventListener("click", ev => {
    const b = ev.target.closest("#spaceBar button[data-space]"); if (!b || !fbctx) return;
    if (SP.space && b.dataset.space === SP.space.id) return;
    fbctx.switchTo(b.dataset.space);
  });

  function spacesBoot(fb) {
    SP.space = fb.space || null; SP.spaces = fb.spaces || []; SP.profile = fb.profile || {};
    if (!SP.space) return;
    if (SP.space.role === "viewer") readOnly = true;
    try { ui.view = SP.space.type === "group" ? (localStorage.getItem("pl-view-" + SP.space.id) || "all") : fb.user.uid; } catch { ui.view = "all"; }
    // my own name / bank details (they live in my private space)
    if (SP.profile.personal && SP.space.id !== SP.profile.personal) {
      fb.F.getDoc(fb.F.doc(fb.db, "households", SP.profile.personal)).then(s => { if (s.exists()) { SP.my = ((s.data().settings || {}).people || [])[0] || null; normalize(); render(); } }).catch(() => {});
    }
    try { const m = sessionStorage.getItem("pl-join-msg"); if (m) { sessionStorage.removeItem("pl-join-msg"); setTimeout(() => toast(m), 800); } } catch {}
  }
  $("who").addEventListener("click", ev => { const b = ev.target.closest("button[data-view]"); if (b && SP.space) { try { localStorage.setItem("pl-view-" + SP.space.id, b.dataset.view); } catch {} } });


  // ---------- settings: your details ----------
  function fillMyDetails() {
    if (!spaceMode()) return;
    const me = meId(), p = (isGroup() ? SP.my : (people()[0] || {})) || {}, ob = state.settings.openingBy || {};
    $("setName1").value = (isGroup() ? (household.names || {})[me] : p.name) || p.name || "";
    $("setOpen1").value = isGroup() ? "" : (ob[me] || "");
    $("setBank1").value = p.bank || ""; $("setAcct1").value = p.acct || "";
    $("setName1").previousElementSibling.textContent = "Your name";
    $("setOpen1L").textContent = "Savings you already had";
    $("setBank1L").textContent = "Name on your bank account";
    $("setAcct1L").textContent = "Your account numbers (last 4 digits)";
    ["setName2", "setOpen2", "setBank2", "setAcct2"].forEach(id => { const f = $(id).closest(".field"); if (f) f.hidden = true; });
    $("pcol2").hidden = true;
    $("setCurrency").disabled = isGroup() && household.owner !== me;
    $("setOpen1").closest(".field").hidden = isGroup();
    renderPcolors();
    renderGroups(); renderPrivacy();
  }
  $("settingsBtn").addEventListener("click", () => { if (fbctx && !$("settingsPanel").hidden) setTimeout(fillMyDetails, 0); });

  async function saveMyDetails() {
    const me = meId(), F = FS();
    const name = $("setName1").value.trim() || "Me";
    const o1 = num($("setOpen1").value || "0");
    if (!(o1 >= 0)) { toast("Starting savings can't be negative."); return; }
    const color = pickColor[me] || pcolor(me);
    const mine = { id: me, name, bank: $("setBank1").value.trim(), acct: last4($("setAcct1").value), color };
    const cur = $("setCurrency").value;
    const jobs = [];
    const pid = SP.profile.personal;
    if (pid && (!isGroup() || SP.my)) {
      const up = { "settings.people": [mine] };
      if (!isGroup()) { up["settings.openingBy"] = { [me]: o1 }; up["settings.opening"] = o1; up["settings.currency"] = cur; }
      jobs.push(F.updateDoc(hRef(pid), up));
    }
    (SP.spaces || []).filter(s => s.type === "group" && s.role === "member").forEach(s => {
      const up = { ["names." + me]: name, ["colors." + me]: color };
      jobs.push(F.updateDoc(hRef(s.id), up));
      if (isGroup() && s.id === fbctx.hid && household.owner === me) jobs.push(F.updateDoc(hRef(s.id), { "settings.currency": cur }));
    });
    jobs.push(F.setDoc(uRef(), { name }, { merge: true }));
    fmtCache = {}; SP.my = mine;
    const ok = await run(Promise.all(jobs), "Settings saved");
    if (ok) $("settingsPanel").hidden = true;
  }

  // ---------- settings: groups ----------
  const groupDocs = {};
  async function renderGroups() {
    const box = $("grpList"); if (!box) return;
    const groups = (SP.spaces || []).filter(s => s.type === "group" && s.role === "member");
    $("grpInfo").textContent = groups.length ? "Everyone in a group sees its entries. Only the person who added something can change it." : "You're not in any groups yet. A group is for shared costs, like a household or a trip.";
    for (const g of groups) { if (g.id === fbctx.hid) groupDocs[g.id] = household; else if (!groupDocs[g.id]) { try { const s = await FS().getDoc(hRef(g.id)); if (s.exists()) groupDocs[g.id] = s.data(); } catch {} } }
    box.innerHTML = groups.map(g => {
      const d = groupDocs[g.id] || {}, own = d.owner === meId(), open = (d.joinUntil || 0) > Date.now();
      const names = (d.members || []).map(u => (d.names || {})[u] || "Member");
      return `<div class="grp" data-g="${esc(g.id)}">
        <div class="grp-top"><b>${esc(d.name || g.name)}</b><small>${esc(names.join(", "))}${own ? " · you made this group" : ""}</small></div>
        ${own ? `<div class="grp-rename"><input data-rename="${esc(g.id)}" maxlength="30" value="${esc(d.name || g.name)}" aria-label="Group name"><button class="ghost" type="button" data-renameok="${esc(g.id)}">Rename</button></div>
        <div class="field"><label>Invite link</label><input readonly value="${esc(inviteUrl(g.id))}"></div>
        <p class="hint" style="margin:0">${open ? "Invitations are open until " + esc(new Date(d.joinUntil).toLocaleDateString(undefined, { day: "numeric", month: "short" })) + ". People who already use Pocket Ledger can join with the link." + (fbctx.admin ? " For someone new, make an invite under Invite people below." : " Someone new also needs an invite from the app's admin.") : "Invitations are closed, so the link doesn't let anyone join."}</p>
        <div class="formfoot"><button class="ghost" type="button" data-copy="${esc(g.id)}">Copy link</button>${navigator.share ? `<button class="ghost" type="button" data-share="${esc(g.id)}">Share</button>` : ""}<button class="ghost" type="button" data-inv="${esc(g.id)}" data-open="${open ? 0 : 1}">${open ? "Close invitations" : "Open invitations for 7 days"}</button></div>`
        : `<div class="formfoot"><button class="ghost" type="button" data-leave="${esc(g.id)}">Leave group</button></div>`}
      </div>`;
    }).join("");
  }
  $("settingsPanel").addEventListener("click", async ev => {
    const b = ev.target.closest("button"); if (!b || !fbctx) return;
    const F = FS(), d = b.dataset;
    try {
      if (d.renameok) {
        const name = (document.querySelector(`[data-rename="${CSS.escape(d.renameok)}"]`).value || "").trim().slice(0, 30);
        if (!name) return toast("Type a name for the group.");
        await F.updateDoc(hRef(d.renameok), { name }); (groupDocs[d.renameok] || {}).name = name;
        const sp = SP.spaces.find(s => s.id === d.renameok); if (sp) sp.name = name;
        toast("Group renamed"); renderGroups(); render();
      } else if (d.copy) {
        try { await navigator.clipboard.writeText(inviteUrl(d.copy)); toast("Invite link copied"); } catch { toast("Select and copy the link"); }
      } else if (d.share) {
        navigator.share({ title: "Pocket Ledger", text: "Join my group in Pocket Ledger", url: inviteUrl(d.share) }).catch(() => {});
      } else if (d.inv) {
        const until = d.open === "1" ? Date.now() + 7 * 864e5 : 0;
        await F.updateDoc(hRef(d.inv), { joinUntil: until }); if (groupDocs[d.inv]) groupDocs[d.inv].joinUntil = until; if (d.inv === fbctx.hid && household) household.joinUntil = until;
        toast(until ? "Invitations open for 7 days" : "Invitations closed"); renderGroups();
      } else if (d.leave) {
        if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Tap again to leave"; return; }
        await F.updateDoc(hRef(d.leave), { members: F.arrayRemove(meId()) });
        await F.setDoc(uRef(), { spaces: F.arrayRemove(d.leave) }, { merge: true });
        toast("You left the group");
        if (d.leave === fbctx.hid) fbctx.switchTo(SP.profile.personal); else { SP.spaces = SP.spaces.filter(s => s.id !== d.leave); renderGroups(); renderSpaceBar(); }
      } else if (b.id === "grpCreate") {
        const name = $("grpNewName").value.trim().slice(0, 30);
        if (!name) return toast("Give the group a name first.");
        const me = meId(), ref = F.doc(F.collection(fbctx.db, "households"));
        await F.setDoc(ref, { type: "group", name, owner: me, members: [me], names: { [me]: pname(me) || "Me" }, colors: { [me]: pcolor(me) },
          created: Date.now(), joinUntil: Date.now() + 7 * 864e5, ai: { server: serverAI() }, settings: { currency: state.settings.currency || "MVR", opening: 0 } });
        await F.setDoc(uRef(), { spaces: F.arrayUnion(ref.id) }, { merge: true });
        toast("Group created. Send the invite link from Settings."); fbctx.switchTo(ref.id);
      } else if (b.id === "grpJoin") {
        let c = $("grpJoinCode").value.trim(); const m = c.match(/join=([A-Za-z0-9_-]+)/); if (m) c = m[1];
        if (!/^[A-Za-z0-9_-]{3,40}$/.test(c)) return toast("That invite code doesn't look right.");
        await fbctx.joinGroup(c); toast("You joined the group"); fbctx.switchTo(c);
      } else if (d.ask) {
        const [to, group] = d.ask.split("|");
        await F.setDoc(F.doc(F.collection(fbctx.db, "viewRequests")), { from: meId(), fromName: SP.profile.name || pname(meId()), to, toName: d.askname || "", status: "pending", created: Date.now(), group });
        toast("Asked. They'll see your request next time they open Pocket Ledger."); renderPrivacy();
      } else if (d.cancelreq) {
        await F.deleteDoc(F.doc(fbctx.db, "viewRequests", d.cancelreq)); renderPrivacy();
      } else if (d.revoke) {
        const [rid, who] = d.revoke.split("|");
        await F.updateDoc(hRef(SP.profile.personal), { viewers: F.arrayRemove(who) });
        await F.updateDoc(F.doc(fbctx.db, "viewRequests", rid), { status: "revoked", answered: Date.now() });
        toast("They can't see your dashboard any more"); renderPrivacy();
      }
    } catch (e) {
      toast(e && e.code === "permission-denied" ? "You can't do that. Only the group's creator can change it." : e && e.code === "not-found" ? "No group has that code." : "That didn't work. Check your connection and try again.");
    }
  });

  // ---------- settings: privacy (who can see my dashboard) ----------
  async function requestsWhere(field) {
    const F = FS();
    const q = await F.getDocs(F.query(F.collection(fbctx.db, "viewRequests"), F.where(field, "==", meId())));
    return q.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  async function renderPrivacy() {
    const box = $("privList"); if (!box || !fbctx) return;
    let mineOut = [], toMe = [];
    try { [mineOut, toMe] = await Promise.all([requestsWhere("from"), requestsWhere("to")]); } catch { box.innerHTML = `<p class="hint">Connect to the internet to see who can view your dashboard.</p>`; return; }
    const seeing = toMe.filter(r => r.status === "accepted");
    // people in my groups I could ask
    const others = {};
    (SP.spaces || []).filter(s => s.type === "group").forEach(s => {
      const d = groupDocs[s.id] || (s.id === fbctx.hid ? household : null); if (!d) return;
      (d.members || []).forEach(u => { if (u !== meId()) others[u] = { name: (d.names || {})[u] || "Member", group: s.id }; });
    });
    const asked = new Set(mineOut.filter(r => r.status === "pending" || r.status === "accepted").map(r => r.to));
    let html = `<p class="hint" style="margin:0">${seeing.length ? "These people can see your own dashboard (view only):" : "Nobody else can see your own entries."}</p>`;
    html += seeing.map(r => `<div class="priv-row"><span>${esc(r.fromName || "Someone")}</span><button class="ghost" type="button" data-revoke="${esc(r.id)}|${esc(r.from)}">Stop sharing</button></div>`).join("");
    const outs = mineOut.filter(r => r.status === "pending" || r.status === "declined");
    if (outs.length) html += `<p class="hint" style="margin:8px 0 0">Your requests:</p>` + outs.map(r => `<div class="priv-row"><span>${esc(r.toName || "Someone")}: ${r.status === "pending" ? "waiting" : "said no"}</span><button class="icon-btn" type="button" data-cancelreq="${esc(r.id)}">${r.status === "pending" ? "Cancel" : "Clear"}</button></div>`).join("");
    const can = Object.keys(others).filter(u => !asked.has(u));
    if (can.length) html += `<p class="hint" style="margin:8px 0 0">Ask to see someone's own dashboard:</p>` + can.map(u => `<div class="priv-row"><span>${esc(others[u].name)}</span><button class="ghost" type="button" data-ask="${esc(u)}|${esc(others[u].group)}" data-askname="${esc(others[u].name)}">Ask to see</button></div>`).join("");
    box.innerHTML = html;
  }

  // ---------- someone asked to see my dashboard ----------
  let reqQueue = [];
  async function checkRequests() {
    if (!fbctx || !SP.profile.personal || isViewer()) return;
    try { const F = FS(); const q = await F.getDocs(F.query(F.collection(fbctx.db, "viewRequests"), F.where("to", "==", meId()), F.where("status", "==", "pending"))); reqQueue = q.docs.map(d => Object.assign({ id: d.id }, d.data())); }
    catch { reqQueue = []; }
    renderReqBar();
  }
  function renderReqBar() {
    const bar = $("reqBar"); if (!bar) return;
    const r = reqQueue[0]; bar.hidden = !r; if (!r) return;
    bar.innerHTML = `<span><b>${esc(r.fromName || "Someone")}</b> would like to see your own dashboard. They'd only be able to look, not change anything. You can stop it any time in Settings.</span><span class="row-btns"><button class="primary" type="button" data-reqok="${esc(r.id)}">Allow</button><button class="ghost" type="button" data-reqno="${esc(r.id)}">Don't allow</button></span>`;
  }
  $("reqBar").addEventListener("click", async ev => {
    const b = ev.target.closest("button"); if (!b) return;
    const r = reqQueue.find(x => x.id === (b.dataset.reqok || b.dataset.reqno)); if (!r) return;
    const F = FS();
    try {
      if (b.dataset.reqok) {
        await F.updateDoc(hRef(SP.profile.personal), { viewers: F.arrayUnion(r.from) });
        await F.updateDoc(F.doc(fbctx.db, "viewRequests", r.id), { status: "accepted", space: SP.profile.personal, toName: SP.profile.name || pname(meId()), answered: Date.now() });
        toast((r.fromName || "They") + " can now see your dashboard");
      } else {
        await F.updateDoc(F.doc(fbctx.db, "viewRequests", r.id), { status: "declined", answered: Date.now() });
        toast("Request declined");
      }
      reqQueue = reqQueue.filter(x => x.id !== r.id); renderReqBar();
    } catch { toast("That didn't work. Check your connection and try again."); }
  });

  // ---------- invite-only: admins make invite links ----------
  const appInviteUrl = (code, group) => location.origin + location.pathname + "?invite=" + code + (group ? "&join=" + group : "");
  function newCode() { const ch = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", a = new Uint32Array(12); crypto.getRandomValues(a); return [...a].map(n => ch[n % ch.length]).join(""); }
  async function renderInvites() {
    const sec = $("invSec"); if (!sec) return;
    sec.hidden = !(fbctx && fbctx.admin);
    if (sec.hidden) return;
    const own = (SP.spaces || []).filter(s => s.type === "group" && s.role === "member" && s.owner === meId());
    const gs = $("invGroup"), cur = gs.value;
    gs.innerHTML = `<option value="">Just the app (their own space)</option>` + own.map(g => `<option value="${esc(g.id)}">Also add them to ${esc(g.name)}</option>`).join("");
    if ([...gs.options].some(o => o.value === cur)) gs.value = cur;
    const box = $("invList");
    try {
      const F = FS(); const q = await F.getDocs(F.query(F.collection(fbctx.db, "invites"), F.where("by", "==", meId())));
      const list = q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.created || 0) - (a.created || 0));
      const gname = id => ((SP.spaces || []).find(s => s.id === id) || {}).name || "";
      box.innerHTML = !list.length ? `<p class="hint" style="margin:0">No invites yet.</p>` : list.map(i => {
        const used = (i.used || []).length >= (i.max || 1), expired = (i.expires || 0) < Date.now();
        const state = used ? "Used" + (i.usedBy && i.usedBy.length ? " by " + i.usedBy.join(", ") : "") : expired ? "Expired" : "Open until " + new Date(i.expires).toLocaleDateString(undefined, { day: "numeric", month: "short" });
        return `<div class="grp"><div class="grp-top"><b>${esc(i.note || "Invite")}</b><small>${esc(state)}${i.group && gname(i.group) ? " · joins " + esc(gname(i.group)) : ""}</small></div>
          ${!used && !expired ? `<div class="field"><input readonly value="${esc(appInviteUrl(i.id, i.group))}" aria-label="Invite link"></div>` : ""}
          <div class="formfoot">${!used && !expired ? `<button class="ghost" type="button" data-invcopy="${esc(i.id)}">Copy link</button>${navigator.share ? `<button class="ghost" type="button" data-invshare="${esc(i.id)}">Share</button>` : ""}` : ""}<button class="icon-btn" type="button" data-invdel="${esc(i.id)}">${!used && !expired ? "Cancel invite" : "Remove"}</button></div></div>`;
      }).join("");
      box.dataset.list = JSON.stringify(list.map(i => ({ id: i.id, group: i.group || "" })));
    } catch { box.innerHTML = `<p class="hint" style="margin:0">Connect to the internet to see your invites.</p>`; }
  }
  $("settingsBtn").addEventListener("click", () => { if (fbctx && !$("settingsPanel").hidden) setTimeout(renderInvites, 0); });
  $("invSec").addEventListener("click", async ev => {
    const b = ev.target.closest("button"); if (!b || !fbctx) return;
    const F = FS(), d = b.dataset;
    const groupOf = id => ((JSON.parse($("invList").dataset.list || "[]").find(x => x.id === id)) || {}).group || "";
    try {
      if (b.id === "invMake") {
        const note = $("invNote").value.trim().slice(0, 40), group = $("invGroup").value;
        const code = newCode(), expires = Date.now() + 7 * 864e5;
        b.disabled = true;
        await F.setDoc(F.doc(fbctx.db, "invites", code), { by: meId(), note, group: group || null, created: Date.now(), expires, max: 1, used: [] });
        if (group) { const gd = groupDocs[group] || (group === fbctx.hid ? household : null); if (!gd || (gd.joinUntil || 0) < expires) await F.updateDoc(hRef(group), { joinUntil: expires }); }
        $("invNote").value = ""; b.disabled = false;
        try { await navigator.clipboard.writeText(appInviteUrl(code, group)); toast("Invite link made and copied. It works once, for 7 days."); } catch { toast("Invite link made. It works once, for 7 days."); }
        renderInvites();
      } else if (d.invcopy) {
        try { await navigator.clipboard.writeText(appInviteUrl(d.invcopy, groupOf(d.invcopy))); toast("Invite link copied"); } catch { toast("Select and copy the link"); }
      } else if (d.invshare) {
        navigator.share({ title: "Pocket Ledger", text: "You're invited to Pocket Ledger", url: appInviteUrl(d.invshare, groupOf(d.invshare)) }).catch(() => {});
      } else if (d.invdel) {
        await F.deleteDoc(F.doc(fbctx.db, "invites", d.invdel)); renderInvites();
      }
    } catch (e) { b.disabled = false; toast(e && e.code === "permission-denied" ? "Only the app's admin can make invites." : "That didn't work. Check your connection and try again."); }
  });
