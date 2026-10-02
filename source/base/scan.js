  // ---------- scan a receipt or screenshot ----------
  let sampler = null, imgCaps = null, scanAbort = null, scanItems = [];
  const TYPES = [["expense", "Spent"], ["income", "Income"], ["save", "Save"], ["withdraw", "Withdraw"]];
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  function openScanPicker() { if (!readOnly && sampler && imgCaps) $("scanFile").click(); }
  $("scanBtn").addEventListener("click", openScanPicker);
  $("scanBtn2").addEventListener("click", openScanPicker);
  $("scanMore").addEventListener("click", openScanPicker);
  $("scanClose").addEventListener("click", () => { if (scanAbort) scanAbort.abort(); scanAbort = null; scanItems = []; $("scanPanel").hidden = true; });
  $("scanFile").addEventListener("change", ev => {
    const files = Array.from(ev.target.files || []); ev.target.value = "";
    if (!files.length) return;
    const max = (imgCaps && imgCaps.maxCount) || 1;
    if (files.length > max) toast("Reading the first " + max + " image" + (max === 1 ? "" : "s"));
    startScan(files.slice(0, max));
  });

  function scanPrompt(n) {
    const st = state.settings;
    const who = isHouse() ? "the household (either person)" : pname(ui.view);
    const goals = visibleGoals(isHouse() ? "all" : ui.view).map(g => g.name);
    return [
      "You are reading " + (n === 1 ? "a photo or screenshot" : n + " photos or screenshots") + " for a personal money tracker. Find each money transaction shown and reply with JSON only.",
      "",
      "Context:",
      "- Today is " + todayISO() + ". The tracker's currency is " + (st.currency || "MVR") + ".",
      "- People in the tracker: " + people().map(p => p.name).join(", ") + ". This was added while viewing: " + who + ".",
      "- Names on their bank accounts: " + (people().map(p => p.name + ": " + ((p.bank || "").trim() || "not set")).join("; ")) + ".",
      "- Their bank account numbers end in: " + (people().map(p => p.name + ": " + ((p.acct || "").trim() || "not set")).join("; ")) + ".",
      "- Expense categories: " + EXP_CATS.join(", ") + ".",
      "- Income categories: " + INC_CATS.join(", ") + ".",
      "- Savings goals: " + (goals.length ? goals.join(", ") : "none") + ".",
      "",
      "What to record:",
      "- A shop receipt, bill or TAX INVOICE (a printed slip, often photographed in someone's hand, maybe creased or at an angle): it is ONE expense, never income, never a transfer. The amount is the final total actually paid: use \"Grand Total\", \"Total\", \"Net Total\" or \"Amount Due\" (after discounts, including GST/TGST and service charge). Ignore Sub Total, GST lines, Tendered/Cash/Paid, Change/Balance and item rates. Small rounding differences between Sub Total + GST and Grand Total are normal: trust the Grand Total and don't ask about it. Do not list line items separately. Note: the shop name (from the top of the slip), then EVERY item on the slip in short plain words (1-3 words each, add x2 for quantities above 1), like \"Faza Link: bolster case x2, bucket, cutting board, hanger, bolster\". Count the item lines and check none is missed. Only if the note would go over 150 characters, list the biggest items and end with \"+ N more\". Pick the category from what was bought: groceries or food items -> Food & groceries; restaurant or cafe -> Eating out; household items, clothes, electronics, hardware -> Shopping; pharmacy -> Health; fuel or fares -> Transport.",
      "- On a shop receipt, a \"Remittance instruction\", beneficiary name, BML/MIB account numbers, TIN, cashier, bill number, phone or Viber numbers are just the shop's details. They do NOT make it a bank transfer and are not the amount. \"Cust. Name: Cash Sales\" just means a walk-in customer.",
      "- A bank app screen, transfer confirmation or SMS alert: each money-out is an expense, each money-in is income (salary, transfers received). A transfer clearly into the user's own savings account is type \"save\".",
      "- Bank transfer receipts (for example Bank of Maldives or MIB, showing From, To, Reference, Transaction date and Amount): From is the sender and To is the recipient. Account numbers decide first: if the To account number ends in one of a person's digits, it is money IN (income) for that person, whatever name is shown next to it (senders often save people under nicknames like \"Quraan sir\"). If the From account ends in a person's digits, it is money OUT (expense) by that person. Otherwise match names loosely (initials, abbreviations like AMTH or MOHD, and dots are fine): From matching a person means money out by them, To matching means money in for them. If nothing matches, set type to null and ask whether the money went out or came in, naming the two sides. In the note, name the OTHER party: \"From AMTH.SHIZLEEN\" for money in, \"Transfer to Ali\" for money out. For money in, ignore the nickname the sender used for the recipient. For money out, pick the category from the recipient when it is clear (a shop is Shopping), otherwise Other. For money in, use the income categories (Side income if unsure).",
      "- Maldivian receipts, invoices and bank screens write dates as DD/MM/YYYY (day first). 03/10/2026 is 3 October 2026, never March. Use the bill or paid date, not a printed time.",
      "- A list of several transactions (for example a statement): one entry for each.",
      "- Ignore balances and account or card numbers, and never copy account or card numbers into the note. Do copy the transaction reference (like BLAZ847926686391) into ref, if one is shown.",
      "- person is the name of the person from the list above whose money this is, or null if you can't tell.",
      "",
      "Rules:",
      "- Do not guess. If the amount, the date, or whether money came in or went out is unclear, set that field to null and ask a question about it. But a shop receipt with a readable total is clear: answer with confidence high or medium and no questions.",
      "- date is the transaction date as YYYY-MM-DD. If the year is missing, use the most recent such date not after today. If no date is shown, set null and ask, offering \"Today\" with value \"" + todayISO() + "\".",
      "- If the amount is in a different currency from " + (st.currency || "MVR") + ", put the original amount in amount, set currency to that code, and ask how much to record in " + (st.currency || "MVR") + ".",
      "- category must be one of the categories above when one fits, otherwise \"Other\".",
      "- Ask at most 2 short, plain questions per transaction, only when something is really unclear. Give 2-4 answer options when you can. Each option is {\"label\": what the button says, \"value\": the value to put in the field}. For type, values are expense, income, save or withdraw. For amount, values are plain numbers. For date, values are YYYY-MM-DD.",
      "- confidence is high when everything is clearly readable, medium if you inferred something, low if the image is hard to read.",
      "",
      "Reply with exactly this JSON shape:",
      '{"summary": "one short sentence on what you found", "transactions": [{"type": "expense" | "income" | "save" | "withdraw" | null, "amount": number | null, "currency": "MVR", "date": "YYYY-MM-DD" | null, "category": "...", "note": "...", "person": "name" | null, "ref": "..." | null, "confidence": "high" | "medium" | "low", "questions": [{"field": "amount" | "date" | "type" | "category" | "note", "question": "...", "options": [{"label": "...", "value": "..."}]}]}]}',
      "If there are no transactions in the image, return an empty transactions list and say why in summary."
    ].join("\n");
  }

  function setScanStatus(html, busy) { $("scanStatus").innerHTML = (busy ? '<span class="spin" aria-hidden="true"></span>' : "") + html; }

  async function startScan(files) {
    if (scanAbort) scanAbort.abort();
    const ctl = new AbortController(); scanAbort = ctl;
    scanItems = [];
    $("scanPanel").hidden = false; $("scanTitle").textContent = "Reading your image…";
    $("scanList").innerHTML = ""; $("scanFoot").hidden = true; $("scanErr").hidden = true;
    setScanStatus("Looking for amounts, dates and shop names. This takes a few seconds.", true);
    $("scanPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await sampler.json(scanPrompt(files.length), { images: files.length === 1 ? files[0] : files, signal: ctl.signal, cache: false });
      if (scanAbort !== ctl) return;
      scanAbort = null;
      const list = Array.isArray(res && res.transactions) ? res.transactions : [];
      const dv = isHouse() ? ($("fWho").value || "p1") : ui.view;
      scanItems = list.map(t => {
        const type = TYPES.some(x => x[0] === t.type) ? t.type : null;
        const amount = typeof t.amount === "number" && isFinite(t.amount) && t.amount > 0 ? Math.round(t.amount * 100) / 100 : null;
        const date = typeof t.date === "string" && ISO.test(t.date) ? t.date : null;
        const cur = String(t.currency || state.settings.currency || "MVR").toUpperCase().slice(0, 3);
        const qs = (Array.isArray(t.questions) ? t.questions : []).slice(0, 3).map(q => ({
          field: String(q.field || ""), question: String(q.question || ""), picked: null,
          options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(o => ({ label: String(o.label ?? o.value ?? ""), value: String(o.value ?? o.label ?? "") }))
        })).filter(q => q.question);
        return {
          include: true, type: type || "expense", typeKnown: !!type, amount, date, currency: cur,
          category: String(t.category || "") || (type === "income" ? "Salary" : "Other"), note: String(t.note || "").slice(0, 160),
          goalId: "", person: personFrom(t.person) || dv, ref: typeof t.ref === "string" ? t.ref.trim().slice(0, 40) : "", confidence: String(t.confidence || ""), questions: qs
        };
      });
      scanItems.forEach(it => { if (it.ref && state.entries.some(e => e.ref === it.ref)) it.include = false; });
      $("scanTitle").textContent = scanItems.length ? "Check what I found" : "Nothing to add";
      setScanStatus(esc((res && res.summary) || (scanItems.length ? "" : "I couldn't find a transaction in that image. Try a clearer photo, or add it by hand.")), false);
      renderScan();
    } catch (e) {
      if (scanAbort !== ctl) return;
      scanAbort = null;
      if (e && !e.code && e.message) e = { code: "http", message: e.message };
      const code = e && e.code;
      if (code === "cancelled") { $("scanPanel").hidden = true; return; }
      $("scanTitle").textContent = "Couldn't read that";
      const msg = {
        not_granted: "Scanning uses your Claude account, so it needs your permission. Tap scan again and choose Allow.",
        rate_limited: "Too many scans in a short time. Wait a minute and try again.",
        image_rejected: "That image couldn't be opened. Try a JPG or PNG photo or screenshot.",
        images_unavailable: "Scanning images isn't available here. You can still add entries by hand.",
        refused: "I couldn't read that image. Try a different photo, or add the entry by hand."
      }[code] || "Scanning didn't work this time. Try again, or add the entry by hand.";
      setScanStatus(esc(msg) + (e && e.message ? '<br><small class="muted">Details for troubleshooting: ' + esc(String(e.message).slice(0, 240)) + '</small>' : ""), false);
      $("scanFoot").hidden = false; $("scanAdd").hidden = true;
    }
  }

  function personFrom(name) {
    if (!name || typeof name !== "string") return null;
    const n = name.trim().toLowerCase();
    const hit = people().find(p => p.name.trim().toLowerCase() === n) || people().find(p => (p.bank || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean).includes(n));
    return hit ? hit.id : null;
  }
  function dupOf(it) {
    if (it.ref) { const same = state.entries.find(e => e.ref && e.ref === it.ref); if (same) return same; }
    if (!it.amount || !it.date) return null;
    return state.entries.find(e => e.date === it.date && Math.abs(+e.amount - it.amount) < 0.005 && e.type === it.type && e.person === it.person) || null;
  }
  function needs(it) {
    const miss = [];
    if (!(it.amount > 0)) miss.push("amount");
    if (!it.date || !ISO.test(it.date)) miss.push("date");
    if (it.currency && it.currency !== (state.settings.currency || "MVR") && !it.currencyOk) miss.push("amount");
    return miss;
  }

  function renderScan() {
    const cur = state.settings.currency || "MVR";
    const peopleOpts = sel => people().map(p => `<option value="${p.id}"${p.id === sel ? " selected" : ""}>${esc(p.name)}</option>`).join("");
    $("scanList").innerHTML = scanItems.map((it, i) => {
      const miss = needs(it);
      const goalMode = it.type === "save" || it.type === "withdraw";
      const foreign = it.currency && it.currency !== cur && !it.currencyOk;
      const dup = dupOf(it);
      const cats = [...new Set((it.type === "income" ? INC_CATS : EXP_CATS).concat(state.entries.filter(e => e.type === it.type && e.category).map(e => e.category)))];
      const qs = it.questions.map((q, qi) => `<div class="q${q.picked !== null ? " done" : ""}"><span>${esc(q.question)}</span>${q.options.length ? `<div class="opts">${q.options.map((o, oi) => `<button type="button" data-i="${i}" data-q="${qi}" data-o="${oi}" aria-pressed="${q.picked === oi}">${esc(o.label)}</button>`).join("")}</div>` : ""}</div>`).join("");
      return `<div class="scard${it.include ? "" : " off"}">
        <div class="scard-top"><label><input type="checkbox" data-i="${i}" data-k="include" ${it.include ? "checked" : ""}> Add this</label>${it.confidence === "low" || miss.length || it.questions.some(q => q.picked === null) ? '<span class="flag">Check this</span>' : ""}</div>
        ${qs}
        ${foreign ? `<div class="q"><span>The image shows ${esc(it.currency)} ${esc(String(it.amount ?? ""))}. Enter the amount in ${esc(cur)} below, then confirm.</span><div class="opts"><button type="button" data-i="${i}" data-k="currencyOk">Amount is in ${esc(cur)}</button></div></div>` : ""}
        ${isHouse() ? `<div class="field"><label for="sw${i}">Whose entry?</label><select id="sw${i}" data-i="${i}" data-k="person">${peopleOpts(it.person)}</select></div>` : ""}
        <div class="row2">
          <div class="field${it.typeKnown ? "" : " need"}"><label for="st${i}">Type</label><select id="st${i}" data-i="${i}" data-k="type">${TYPES.map(([v, l]) => `<option value="${v}"${v === it.type ? " selected" : ""}>${l}</option>`).join("")}</select></div>
          <div class="field${miss.includes("amount") ? " need" : ""}"><label for="sa${i}">Amount (${esc(cur)})</label><input id="sa${i}" class="num" type="number" inputmode="decimal" min="0" step="0.01" data-i="${i}" data-k="amount" value="${it.amount ?? ""}"></div>
          <div class="field${miss.includes("date") ? " need" : ""}"><label for="sd${i}">Date</label><input id="sd${i}" type="date" data-i="${i}" data-k="date" value="${it.date || ""}"></div>
          ${goalMode
            ? `<div class="field"><label for="sg${i}">Goal</label><select id="sg${i}" data-i="${i}" data-k="goalId"><option value="">General savings</option>${visibleGoals(it.person).map(g => `<option value="${g.id}"${g.id === it.goalId ? " selected" : ""}>${esc(g.name)}</option>`).join("")}</select></div>`
            : (() => { const opts = [...new Set(cats.concat(it.category && !it.catOther ? [it.category] : []))]; const other = it.catOther; return `<div class="field"><label for="sc${i}">Category</label><select id="sc${i}" data-i="${i}" data-k="catsel">${opts.map(c => `<option value="${esc(c)}"${!other && c === it.category ? " selected" : ""}>${esc(c)}</option>`).join("")}<option value="__other"${other ? " selected" : ""}>Other (type your own)…</option></select>${other ? `<input id="sco${i}" data-i="${i}" data-k="category" value="${esc(it.category)}" placeholder="Type a category" aria-label="Your own category" style="margin-top:6px">` : ""}</div>`; })()}
        </div>
        <div class="field"><label for="sn${i}">Note</label><input id="sn${i}" maxlength="160" data-i="${i}" data-k="note" value="${esc(it.note)}"></div>
        ${dup ? (it.ref && dup.ref === it.ref ? `<div class="dup">This transfer (${esc(it.ref)}) is already in Pocket Ledger, so it's unticked.</div>` : `<div class="dup">You already have ${esc(money(+dup.amount))} on this date${dup.note ? " (" + esc(dup.note) + ")" : ""}. Untick this if it's the same one.</div>`) : ""}
      </div>`;
    }).join("");
    const n = scanItems.filter(x => x.include).length;
    $("scanFoot").hidden = false;
    $("scanAdd").hidden = !scanItems.length;
    $("scanAdd").textContent = n === 1 ? "Add 1 entry" : "Add " + n + " entries";
    $("scanAdd").disabled = !n;
  }

  function applyAnswer(it, field, value) {
    if (field === "amount") { const v = num(value); if (v > 0) { it.amount = v; it.currencyOk = true; } }
    else if (field === "date") { if (ISO.test(value)) it.date = value; }
    else if (field === "type") { if (TYPES.some(t => t[0] === value)) { it.type = value; it.typeKnown = true; } }
    else if (field === "category") it.category = value;
    else if (field === "note") it.note = value.slice(0, 160);
  }

  $("scanList").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    const it = scanItems[+b.dataset.i]; if (!it) return;
    if (b.dataset.k === "currencyOk") { it.currencyOk = true; renderScan(); return; }
    const q = it.questions[+b.dataset.q]; if (!q) return;
    q.picked = +b.dataset.o; applyAnswer(it, q.field, q.options[q.picked].value);
    renderScan();
  });
  $("scanList").addEventListener("input", ev => {
    const el = ev.target, it = scanItems[+el.dataset.i]; if (!it || !el.dataset.k) return;
    const k = el.dataset.k;
    if (k === "amount") { it.amount = num(el.value) > 0 ? num(el.value) : null; it.currencyOk = true; }
    else if (k === "include") it.include = el.checked;
    else if (k === "catsel") { if (el.value === "__other") { it.catOther = true; it.category = ""; renderScan(); const o = $("sco" + el.dataset.i); if (o) o.focus(); } else { it.catOther = false; it.category = el.value; } return; }
    else it[k] = el.value;
    if (k === "type") it.typeKnown = true;
    if (k === "include" || k === "type" || k === "person") renderScan();
  });
  $("scanList").addEventListener("change", ev => {
    const k = ev.target.dataset.k;
    if (k === "amount" || k === "date") renderScan();
  });

  $("scanAdd").addEventListener("click", async () => {
    const chosen = scanItems.filter(x => x.include);
    const bad = chosen.filter(x => needs(x).length);
    if (bad.length) { $("scanErr").textContent = "Fill in the highlighted amount or date on " + (bad.length === 1 ? "1 entry" : bad.length + " entries") + " first."; $("scanErr").hidden = false; renderScan(); return; }
    $("scanErr").hidden = true; $("scanAdd").disabled = true;
    let added = 0;
    for (const it of chosen) {
      const e = { type: it.type, amount: it.amount, date: it.date, note: (it.note || "").trim(), created: Date.now() + added, person: it.person, source: "scan" };
      if (it.ref) e.ref = it.ref;
      if (it.type === "save" || it.type === "withdraw") { e.goalId = it.goalId || ""; e.category = "Savings"; }
      else e.category = (it.category || "").trim() || (it.type === "income" ? "Salary" : "Other");
      if (!(await run(backend.add(e)))) break;
      added++;
    }
    if (added) {
      toast(added === 1 ? "Added 1 entry" : "Added " + added + " entries");
      const m = chosen[0].date.slice(0, 7);
      if (m !== ui.month) { ui.month = m; render(); }
      scanItems = []; $("scanPanel").hidden = true;
    } else $("scanAdd").disabled = false;
  });
