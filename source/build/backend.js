  // ---------- Firebase (shared household data) ----------
  let household = null, fbctx = null, joinAutoSet = false;
  const validId = id => /^[A-Za-z0-9_-]{1,100}$/.test(String(id || ""));
  function firebaseBackend(fb) {
    const { F, db, hid } = fb;
    const hh = F.doc(db, "households", hid), E = F.collection(hh, "entries"), G = F.collection(hh, "goals");
    const clean = o => { const c = JSON.parse(JSON.stringify(o)); delete c.id; c.author = c.author || fb.user.uid; return c; };
    const cleanS = o => { const c = JSON.parse(JSON.stringify(o)); delete c.id; return c; };
    // Writes show up straight away and sync in the background (also offline),
    // so don't wait for the server here; report failures when they happen.
    const fire = p => { p.catch(e => toast(e && e.code === "permission-denied" ? "Only the person who added that can change it." : "A change couldn't be saved. Check your connection.")); return Promise.resolve(); };
    const got = { e: false, g: false, h: false };
    const settle = k => { got[k] = true; if (got.e && got.g && got.h) state.ready = true; normalize(); render(); };
    const snapErr = e => { if (e && e.code === "permission-denied") { readOnly = true; render(); toast("You don't have access to this household."); } };
    F.onSnapshot(E, s => { state.entries = legacyIds(s.docs.map(d => Object.assign({ id: d.id }, d.data()))); settle("e"); }, snapErr);
    F.onSnapshot(G, s => { state.goals = legacyIds(s.docs.map(d => Object.assign({ id: d.id }, d.data()))); settle("g"); }, snapErr);
    F.onSnapshot(hh, s => {
      if (s.exists()) {
        household = s.data();
        state.settings = Object.assign({ currency: "MVR", opening: 0 }, JSON.parse(JSON.stringify(household.settings || {})));
        fmtCache = {};
        if (state.entries.length) state.entries = legacyIds(state.entries);
      }
      settle("h");
    }, snapErr);
    const subCol = (name, key) => F.onSnapshot(F.collection(hh, name), q => { state[key] = legacyIds(q.docs.map(d => Object.assign({ id: d.id }, d.data()))); render(); }, snapErr);
    subCol("recurring", "recurring"); subCol("loans", "loans"); subCol("settlements", "settlements");
    // deleting keeps a copy in "trash" for 30 days (Settings › Recently deleted)
    const toTrash = (col, id) => {
      const src = col === "entries" ? state.entries : col === "goals" ? state.goals : (state[col] || []);
      const x = src.find(o => o.id === id);
      const b = F.writeBatch(db);
      if (x) b.set(F.doc(F.collection(hh, "trash"), col + "__" + id), { col, docId: id, data: cleanS(x), deletedAt: Date.now(), author: fb.user.uid });
      b.delete(F.doc(F.collection(hh, col), id));
      return fire(b.commit());
    };
    return {
      kind: "firebase",
      addWithId: (id, e) => fire(F.setDoc(F.doc(E, id), clean(e))),
      saveDoc: (col, id, data) => { const c = F.collection(hh, col); const ref = id ? F.doc(c, id) : F.doc(c); fire(F.setDoc(ref, clean(data))); return ref.id; },
      removeDoc: (col, id) => toTrash(col, id),
      add: e => fire(F.setDoc(F.doc(E), clean(e))),
      update: (id, e) => fire(F.setDoc(F.doc(E, id), clean(e))),
      remove: id => toTrash("entries", id),
      saveGoal: (id, g) => fire(F.setDoc(id ? F.doc(G, id) : F.doc(G), clean(g))),
      removeGoal: id => toTrash("goals", id),
      saveSettings: st => { const c = cleanS(Object.assign({}, state.settings, st)); if (household && household.type === "group") delete c.people; return fire(F.updateDoc(hh, { settings: c })); },
      setJoinUntil: ms => fire(F.updateDoc(hh, { joinUntil: ms })),
      saveGemini: key => household && household.type === "group" && household.owner !== fb.user.uid ? Promise.resolve() : fire(F.updateDoc(hh, { gemini: { key: key || "" } })),
      replaceAll: async d => {
        if (household && household.type && household.type !== "personal") { toast("Restore a backup from your own space (Me), not from a group."); throw { code: "group" }; }
        const me = meId();
        const toMe = v => (!v || v === "p1" || v === "p2") ? me : v;
        const inE = (d.entries || []).map(e => Object.assign({}, e, { person: toMe(e.person), author: me }));
        const inG = (d.goals || []).map(g => Object.assign({}, g, { owner: g.owner === "shared" ? "shared" : toMe(g.owner), author: me }));
        const keepE = new Set(inE.filter(e => validId(e.id)).map(e => e.id)), keepG = new Set(inG.filter(g => validId(g.id)).map(g => g.id));
        const ops = [];
        state.entries.forEach(e => { if (!keepE.has(e.id)) ops.push(b => b.delete(F.doc(E, e.id))); });
        state.goals.forEach(g => { if (!keepG.has(g.id)) ops.push(b => b.delete(F.doc(G, g.id))); });
        inG.forEach(g => ops.push(b => b.set(validId(g.id) ? F.doc(G, g.id) : F.doc(G), clean(g))));
        inE.forEach(e => ops.push(b => b.set(validId(e.id) ? F.doc(E, e.id) : F.doc(E), clean(e))));
        ["recurring", "loans", "settlements"].forEach(col => {
          const C = F.collection(hh, col), incoming = (Array.isArray(d[col]) ? d[col] : []).map(x => Object.assign({}, x, x.person ? { person: toMe(x.person) } : {}, { author: me }));
          const keep = new Set(incoming.filter(x => validId(x.id)).map(x => x.id));
          (state[col] || []).forEach(x => { if (!keep.has(x.id)) ops.push(b => b.delete(F.doc(C, x.id))); });
          incoming.forEach(x => ops.push(b => b.set(validId(x.id) ? F.doc(C, x.id) : F.doc(C), clean(x))));
        });
        for (let i = 0; i < ops.length; i += 400) { const b = F.writeBatch(db); ops.slice(i, i + 400).forEach(f => f(b)); await b.commit(); }
        const st = Object.assign({ currency: "MVR", opening: 0 }, d.settings || {});
        if (!Array.isArray(st.people) || !st.people.length) st.people = (state.settings.people || DEFAULT_PEOPLE);
        st.people = [Object.assign({}, (state.settings.people || [])[0] || {}, { id: me })];
        st.openingBy = { [me]: +((d.settings && d.settings.openingBy && (d.settings.openingBy[me] ?? d.settings.openingBy.p1)) || st.opening || 0) };
        await F.updateDoc(hh, { settings: cleanS(st) });
      }
    };
  }
