
  // ---------- settings: this device, household, account ----------
  function openSettings() { if ($("settingsPanel").hidden) $("settingsBtn").click(); $("settingsPanel").scrollIntoView({ behavior: "smooth", block: "start" }); }
  const inviteUrl = id => location.origin + location.pathname + "?join=" + id;
  $("settingsBtn").addEventListener("click", () => {
    const dk = lsGet(KEY_LS).trim(), hk = householdKey();
    $("setHKey").value = hk || dk; $("setKey").value = dk && dk !== (hk || dk) ? dk : ""; $("setModel").value = lsGet(MODEL_LS);
    const pp = people();
    $("setBank1").value = (pp[0] || {}).bank || ""; $("setBank2").value = (pp[1] || {}).bank || "";
    $("setAcct1").value = (pp[0] || {}).acct || ""; $("setAcct2").value = (pp[1] || {}).acct || "";
    $("setAcct1L").textContent = ((pp[0] || {}).name || "First person") + "'s account numbers (last 4 digits)";
    $("setAcct2L").textContent = ((pp[1] || {}).name || "Second person") + "'s account numbers (last 4 digits)";
    $("setBank1L").textContent = "Name on " + ((pp[0] || {}).name || "first person") + "'s bank account";
    $("setBank2L").textContent = "Name on " + ((pp[1] || {}).name || "second person") + "'s bank account";
    $("acctInfo").textContent = fbctx && fbctx.user ? "Signed in as " + (fbctx.user.email || "you") + "." : "";
  });
  $("saveSettings").addEventListener("click", () => {
    const hk = $("setHKey").value.trim(), dk = $("setKey").value.trim();
    lsSet(KEY_LS, dk && dk !== hk ? dk : ""); lsSet(MODEL_LS, $("setModel").value.trim());
    if (backend && backend.saveGemini && hk !== householdKey()) backend.saveGemini(hk);
  });
  $("signOutBtn").addEventListener("click", () => { if (fbctx) fbctx.signOut(); });

  // ---------- install button ----------
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("installBtn").hidden = false; });
  $("installBtn").addEventListener("click", async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch {} installEvt = null; $("installBtn").hidden = true; });
  window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; toast("Pocket Ledger is installed"); });
  window.addEventListener("online", render);
  window.addEventListener("offline", render);

  // ---------- boot (called by app.js once signed in) ----------
  $("fDate").value = defaultDate();
  window.PL = {
    boot(fb) {
      fbctx = fb;
      spacesBoot(fb); adminBoot();
      backend = firebaseBackend(fb);
      render();
      $("lnDate").value = todayISO();
      (function waitReady() { if (state.ready) { takeSharedFiles(); handleShortcut(); refreshPush(); checkRequests(); markSeen(); } else setTimeout(waitReady, 300); })();
    }
  };

  // ---------- appearance (this device) + person colours ----------
  function syncAppearance() {
    const mode = lsGet("pl-mode") || "auto", preset = lsGet("pl-preset") || "lagoon";
    document.querySelectorAll(".modeseg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    document.querySelectorAll(".theme-sw").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.preset === preset)));
    $("setAmoled").checked = lsGet("pl-amoled") === "1";
  }
  document.querySelectorAll(".modeseg button").forEach(b => b.addEventListener("click", () => { lsSet("pl-mode", b.dataset.mode === "auto" ? "" : b.dataset.mode); window.plApplyTheme(); syncAppearance(); }));
  document.querySelectorAll(".theme-sw").forEach(b => b.addEventListener("click", () => { lsSet("pl-preset", b.dataset.preset === "lagoon" ? "" : b.dataset.preset); window.plApplyTheme(); syncAppearance(); }));
  $("setAmoled").addEventListener("change", () => { lsSet("pl-amoled", $("setAmoled").checked ? "1" : ""); window.plApplyTheme(); });
  function renderPcolors() {
    (spaceMode() ? people().filter(p => p.id === meId()) : people().slice(0, 2)).forEach((p, i) => {
      const cur = pickColor[p.id] || pcolor(p.id);
      $("pcol" + (i + 1)).innerHTML = `<span>${esc(p.name)}'s colour</span>` + PCOLORS.map(c => `<button type="button" data-p="${p.id}" data-c="${c}" style="background:${c}" aria-label="${c}" aria-pressed="${c === cur}"></button>`).join("");
    });
  }
  ["pcol1", "pcol2"].forEach(id => $(id).addEventListener("click", ev => {
    const b = ev.target.closest("button[data-c]"); if (!b) return;
    pickColor[b.dataset.p] = b.dataset.c; renderPcolors();
  }));
  $("settingsBtn").addEventListener("click", () => { Object.keys(pickColor).forEach(k => { pickColor[k] = null; }); syncAppearance(); renderPcolors(); });

