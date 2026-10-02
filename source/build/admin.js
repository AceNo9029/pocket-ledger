
  // ======================================================================
  // Admin dashboard (only for admins): who uses the app, Gemini use,
  // remove or restore someone's access. Never shows anyone's money.
  // ======================================================================
  const adm = { data: null, ask: null, busy: false };
  const ago = t => {
    if (!t) return "never";
    const ms = Date.now() - (typeof t === "string" ? Date.parse(t) : t); if (!(ms >= 0)) return "—";
    const m = Math.round(ms / 60e3); if (m < 2) return "just now"; if (m < 60) return m + " min ago";
    const h = Math.round(m / 60); if (h < 24) return h + " h ago";
    const d = Math.round(h / 24); return d === 1 ? "yesterday" : d < 45 ? d + " days ago" : new Date(Date.now() - ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };
  const dShort = k => new Date(k + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  function adminChart(days) {
    const W = 340, H = 140, pad = { l: 24, r: 4, t: 8, b: 20 }, n = days.length;
    const max = Math.max(5, ...days.map(d => d.n)), step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step;
    const bw = (W - pad.l - pad.r) / n, ih = H - pad.t - pad.b, y = v => pad.t + ih - v / top * ih;
    let g = "";
    [0, top / 2, top].forEach(v => { g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="ad-grid"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" class="ad-ax">${Math.round(v)}</text>`; });
    days.forEach((d, i) => {
      const x = pad.l + i * bw, h = Math.max(d.n ? 2 : 0, d.n / top * ih), w = Math.max(2, bw - 2);
      if (h) g += `<path class="ad-bar" d="M${x + 1},${pad.t + ih} v${-(h - Math.min(4, h))} q0,${-Math.min(4, h)} ${Math.min(4, w / 2)},${-Math.min(4, h)} h${w - 2 * Math.min(4, w / 2)} q${Math.min(4, w / 2)},0 ${Math.min(4, w / 2)},${Math.min(4, h)} v${h - Math.min(4, h)} z"/>`;
      g += `<rect class="ad-hit" x="${x}" y="${pad.t}" width="${bw}" height="${ih + pad.b}" data-i="${i}"><title>${esc(dShort(d.day))}: ${d.n} Gemini call${d.n === 1 ? "" : "s"}</title></rect>`;
      if (i === 0 || i === n - 1 || i === Math.floor(n / 2)) g += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}" class="ad-ax">${esc(dShort(d.day))}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="ad-chart" role="img" aria-label="Gemini calls per day for the last 30 days">${g}</svg>`;
  }
  function renderAdmin() {
    const box = $("adminBody"); if (!box) return;
    const D = adm.data;
    if (!D) { box.innerHTML = `<p class="hint">${adm.busy ? "Loading…" : "Couldn't load the dashboard. Check your connection and tap Refresh."}</p>`; return; }
    const total30 = D.days.reduce((a, d) => a + d.n, 0), todayN = (D.days[D.days.length - 1] || {}).n || 0;
    const active7 = D.people.filter(p => p.lastSeen && Date.now() - p.lastSeen < 7 * 864e5).length;
    const me = meId();
    const tile = (label, value, sub) => `<div class="ad-tile"><span>${esc(label)}</span><b class="num">${esc(String(value))}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
    let h = `<div class="ad-tiles">${tile("People with access", D.people.length, active7 + " used it this week")}${tile("Gemini today", todayN, "limit " + D.limit + " each")}${tile("Gemini, 30 days", total30, "")}${tile("Open invites", D.openInvites, "")}</div>`;
    h += `<div class="ad-card"><div class="ad-head"><b>Gemini calls per day</b><small id="adTip">Last 30 days. Tap a bar for the day.</small></div>${adminChart(D.days)}</div>`;
    h += `<div class="ad-card"><b>Daily Gemini limit per person</b><div class="grp-rename"><input id="adLimit" type="number" inputmode="numeric" min="10" max="2000" value="${D.limit}" aria-label="Daily limit per person"><button class="ghost" type="button" data-adlimit="1">Save</button></div><small class="hint">Each scan or chat message counts as one or two calls.</small></div>`;
    const sorted = D.people.slice().sort((a, b) => (b.uid === me) - (a.uid === me) || (b.lastSeen || 0) - (a.lastSeen || 0));
    h += `<h3 class="ad-h">People</h3>` + sorted.map(p => {
      const asking = adm.ask && adm.ask.uid === p.uid;
      const who = p.name || p.email || "Unnamed";
      return `<div class="grp"><div class="grp-top"><b>${esc(who)}${p.uid === me ? ' <span class="ad-badge">You</span>' : ""}${p.admin ? ' <span class="ad-badge">Admin</span>' : ""}</b>
        <small>${esc([p.name && p.email ? p.email : "", p.how === "invite" ? "joined with an invite" : p.how === "existing" ? "here before invite-only" : p.how === "restored" ? "access restored" : "", p.since ? "since " + new Date(p.since).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""].filter(Boolean).join(" · "))}</small>
        <small>${p.uid === me ? "Active now" : "Last active " + esc(ago(p.lastSeen || p.lastSignIn))} · in ${p.groups} group${p.groups === 1 ? "" : "s"} · Gemini today ${p.aiToday}, 30 days ${p.aiMonth}</small></div>
        ${p.uid === me ? "" : asking
          ? `<div class="formfoot"><span class="hint">${adm.ask.what === "revoke" ? "Remove " + esc(who) + "'s access? They'll be signed out and can't open Pocket Ledger. Their data is kept, so you can restore them." : "Make " + esc(who) + " an admin? They'll see this dashboard and can make invites."}</span><button class="primary" type="button" data-adgo="${esc(p.uid)}">${adm.ask.what === "revoke" ? "Remove access" : "Make admin"}</button><button class="ghost" type="button" data-adno="1">Cancel</button></div>`
          : `<div class="formfoot">${p.admin ? `<button class="ghost" type="button" data-adact="removeAdmin" data-u="${esc(p.uid)}">Remove admin</button>` : `<button class="ghost" type="button" data-adask="makeAdmin" data-u="${esc(p.uid)}">Make admin</button>`}<button class="icon-btn danger" type="button" data-adask="revoke" data-u="${esc(p.uid)}">Remove access</button></div>`}
      </div>`;
    }).join("");
    if (D.revoked.length) h += `<h3 class="ad-h">Removed</h3>` + D.revoked.map(r => `<div class="priv-row"><span>${esc(r.name || r.email || "Someone")}<small class="hint"> · removed ${esc(ago(r.revokedAt))}</small></span><button class="ghost" type="button" data-adact="restore" data-u="${esc(r.uid)}">Restore</button></div>`).join("");
    h += `<h3 class="ad-h">Signed up without an invite</h3>` + (D.waiting.length ? `<p class="hint" style="margin:0">These accounts exist but can't see or save anything. Make them an invite in Settings if you know them, or delete the account.</p>` + D.waiting.map(w => {
      const asking = adm.ask && adm.ask.uid === w.uid;
      return `<div class="priv-row"><span>${esc(w.email || "No email")}<small class="hint"> · signed up ${esc(ago(w.created))}</small></span>${asking ? `<span class="row-btns"><button class="icon-btn danger" type="button" data-adgo="${esc(w.uid)}">Delete account</button><button class="icon-btn" type="button" data-adno="1">Keep</button></span>` : `<button class="icon-btn" type="button" data-adask="deleteWaiting" data-u="${esc(w.uid)}">Delete</button>`}</div>`;
    }).join("") : `<p class="hint" style="margin:0">Nobody.</p>`);
    h += `<p class="hint" style="margin-top:14px">This dashboard never shows anyone's money. Their entries stay private to them and their groups.</p>`;
    box.innerHTML = h;
  }
  async function loadAdmin() {
    adm.busy = true; renderAdmin();
    try { adm.data = await callFn("admin", { action: "overview" }); }
    catch (e) { adm.data = null; toast(/permission/.test(String(e && e.code)) ? "Only the app's admin can open this." : /not-found|internal|unavailable/.test(String(e && e.code)) ? "The admin server isn't set up yet. Run the deploy step first." : "Couldn't load the dashboard."); }
    adm.busy = false; renderAdmin();
  }
  async function adminDo(action, target, extra) {
    try { await callFn("admin", Object.assign({ action, target }, extra || {})); adm.ask = null; await loadAdmin(); return true; }
    catch (e) { toast((e && e.message) || "That didn't work. Try again."); return false; }
  }
  $("adminBtn").addEventListener("click", () => {
    const p = $("adminPanel"); p.hidden = !p.hidden;
    if (!p.hidden) { $("settingsPanel").hidden = true; p.scrollIntoView({ behavior: "smooth", block: "start" }); loadAdmin(); }
  });
  $("adminClose").addEventListener("click", () => { $("adminPanel").hidden = true; });
  $("adminRefresh").addEventListener("click", loadAdmin);
  $("adminBody").addEventListener("click", async ev => {
    const bar = ev.target.closest(".ad-hit");
    if (bar && adm.data) { const d = adm.data.days[+bar.dataset.i]; $("adTip").textContent = dShort(d.day) + ": " + d.n + " Gemini call" + (d.n === 1 ? "" : "s"); document.querySelectorAll(".ad-hit.on").forEach(x => x.classList.remove("on")); bar.classList.add("on"); return; }
    const b = ev.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.adask) { adm.ask = { uid: d.u, what: d.adask }; renderAdmin(); }
    else if (d.adno) { adm.ask = null; renderAdmin(); }
    else if (d.adgo && adm.ask) { b.disabled = true; const what = adm.ask.what; if (await adminDo(what, d.adgo)) toast(what === "revoke" ? "Access removed" : what === "deleteWaiting" ? "Account deleted" : "Done"); }
    else if (d.adact) { b.disabled = true; if (await adminDo(d.adact, d.u)) toast(d.adact === "restore" ? "Access restored" : "Done"); }
    else if (d.adlimit) { const n = Math.round(+$("adLimit").value); if (!(n >= 10 && n <= 2000)) return toast("Pick a limit between 10 and 2000."); if (await adminDo("setLimit", null, { limit: n })) toast("Daily limit saved"); }
  });
  function adminBoot() { $("adminBtn").hidden = !(fbctx && fbctx.admin); }
  // remember when each person last opened the app (for the admin's "last active")
  function markSeen() {
    if (!fbctx || isViewer()) return;
    const last = +lsGet("pl-seen") || 0;
    if (Date.now() - last < 3 * 3600e3) return;
    fbctx.F.setDoc(fbctx.F.doc(fbctx.db, "users", meId()), { lastSeen: Date.now() }, { merge: true }).then(() => lsSet("pl-seen", String(Date.now()))).catch(() => {});
  }
