// Scan a receipt, bill or bank screenshot: Gemini reads it, you check, then add.
import { $, esc, money, num, todayISO, toast, ISO } from "./util.js";
import { state, ui, meId, people, pname, visibleGoals, catOptions, guessCategory, EXP_CATS, INC_CATS, TYPE_LABEL, changed, db } from "./store.js";
import { budgetCheck } from "./actions.js";
import { aiReady, geminiJson } from "./gemini.js";
import { go } from "./shell.js";

let scanAbort = null, items = [];
const TYPES = Object.entries(TYPE_LABEL);
const open = () => { $("scanWrap").hidden = false; document.body.classList.add("sheet-open"); };
export function closeScan() { if (scanAbort) scanAbort.abort(); scanAbort = null; items = []; $("scanWrap").hidden = true; document.body.classList.remove("sheet-open"); }
const status = (html, busy) => { $("scanStatus").innerHTML = (busy ? '<span class="spin" aria-hidden="true"></span>' : "") + html; };

export function openScanPicker() {
  if (state.readOnly) return toast("You can't add entries here.");
  if (!aiReady()) { go("settings", "ai"); toast("Set up Gemini first (Settings › Gemini)."); return; }
  $("scanFile").click();
}

function scanPrompt(n) {
  const st = state.settings, cur = st.currency || "MVR", ps = people(), me = pname(meId());
  const goals = visibleGoals(meId()).map(g => g.name);
  return [
    "You are reading " + (n === 1 ? "a photo or screenshot" : n + " photos or screenshots") + " for a personal money tracker. Find each money transaction shown and reply with JSON only.",
    "",
    "Context:",
    "- Today is " + todayISO() + ". The tracker's currency is " + cur + ".",
    "- People in the tracker: " + ps.map(p => p.name).join(", ") + ". The person adding this is " + me + ".",
    "- Names on their bank accounts: " + ps.map(p => p.name + ": " + ((p.bank || "").trim() || "not set")).join("; ") + ".",
    "- Their bank account numbers end in: " + ps.map(p => p.name + ": " + ((p.acct || "").trim() || "not set")).join("; ") + ".",
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
    "- If the amount is in a different currency from " + cur + ", put the original amount in amount, set currency to that code, and ask how much to record in " + cur + ".",
    "- category must be one of the categories above when one fits, otherwise \"Other\".",
    "- Ask at most 2 short, plain questions per transaction, only when something is really unclear. Give 2-4 answer options when you can. Each option is {\"label\": what the button says, \"value\": the value to put in the field}. For type, values are expense, income, save or withdraw. For amount, values are plain numbers. For date, values are YYYY-MM-DD.",
    "- confidence is high when everything is clearly readable, medium if you inferred something, low if the image is hard to read.",
    "",
    "Reply with exactly this JSON shape:",
    '{"summary": "one short sentence on what you found", "transactions": [{"type": "expense" | "income" | "save" | "withdraw" | null, "amount": number | null, "currency": "MVR", "date": "YYYY-MM-DD" | null, "category": "...", "note": "...", "person": "name" | null, "ref": "..." | null, "confidence": "high" | "medium" | "low", "questions": [{"field": "amount" | "date" | "type" | "category" | "note", "question": "...", "options": [{"label": "...", "value": "..."}]}]}]}',
    "If there are no transactions in the image, return an empty transactions list and say why in summary."
  ].join("\n");
}

export async function startScan(files) {
  if (scanAbort) scanAbort.abort();
  const ctl = new AbortController(); scanAbort = ctl; items = [];
  open(); $("scanTitle").textContent = "Reading your image…";
  $("scanList").innerHTML = ""; $("scanFoot").hidden = true; $("scanErr").hidden = true;
  status("Looking for amounts, dates and shop names. This takes a few seconds.", true);
  try {
    const res = await geminiJson(scanPrompt(files.length), files, ctl.signal);
    if (scanAbort !== ctl) return;
    scanAbort = null;
    const cur0 = state.settings.currency || "MVR";
    items = (Array.isArray(res && res.transactions) ? res.transactions : []).map(t => {
      const type = TYPES.some(x => x[0] === t.type) ? t.type : null;
      const amount = typeof t.amount === "number" && isFinite(t.amount) && t.amount > 0 ? Math.round(t.amount * 100) / 100 : null;
      const qs = (Array.isArray(t.questions) ? t.questions : []).slice(0, 3).map(q => ({
        field: String(q.field || ""), question: String(q.question || ""), picked: null,
        options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(o => ({ label: String(o.label ?? o.value ?? ""), value: String(o.value ?? o.label ?? "") }))
      })).filter(q => q.question);
      return { include: true, type: type || "expense", typeKnown: !!type, amount, date: typeof t.date === "string" && ISO.test(t.date) ? t.date : null,
        currency: String(t.currency || cur0).toUpperCase().slice(0, 3), category: String(t.category || "") || (type === "income" ? "Salary" : "Other"),
        note: String(t.note || "").slice(0, 160), goalId: "", ref: typeof t.ref === "string" ? t.ref.trim().slice(0, 40) : "", confidence: String(t.confidence || ""), questions: qs, src: "scan" };
    });
    items.forEach(it => { if (it.ref && state.entries.some(e => e.ref === it.ref)) it.include = false; });
    $("scanTitle").textContent = items.length ? "Check what I found" : "Nothing to add";
    status(esc((res && res.summary) || (items.length ? "" : "I couldn't find a transaction in that image. Try a clearer photo, or add it by hand.")), false);
    render();
  } catch (e) {
    if (scanAbort !== ctl) return;
    scanAbort = null;
    if (e && !e.code && e.message) e = { code: "http", message: e.message };
    const code = e && e.code;
    if (code === "cancelled") { closeScan(); return; }
    $("scanTitle").textContent = "Couldn't read that";
    const msg = {
      no_key: "Set up Gemini in Settings to use scanning.",
      bad_key: "Google didn't accept the Gemini key. Check it in Settings › Gemini.",
      offline: "Scanning needs an internet connection. You can add the entry by hand and it will sync later.",
      rate_limited: "Gemini's limit was reached for now. Wait a minute and try again, or add it by hand.",
      image_rejected: "That image couldn't be opened. Try a JPG or PNG photo or screenshot.",
      refused: "I couldn't read that image. Try a different photo, or add the entry by hand."
    }[code] || "Scanning didn't work this time. Try again, or add the entry by hand.";
    status(esc(msg) + (e && e.message ? '<br><small class="muted">Details for troubleshooting: ' + esc(String(e.message).slice(0, 240)) + "</small>" : ""), false);
    $("scanFoot").hidden = false; $("scanAdd").hidden = true;
  }
}

// entries prepared in the chat, opened here to check and change before adding
export function showProposals(list) {
  items = list.map(e => ({ include: true, type: e.type, typeKnown: true, amount: e.amount, date: e.date, currency: state.settings.currency || "MVR", currencyOk: true,
    category: e.category, note: e.note, goalId: e.goalId || "", split: e.split, ref: "", confidence: "high", questions: [], src: "chat" }));
  if (!items.length) return false;
  open(); $("scanTitle").textContent = "Check before adding";
  status("From your chat. Change anything that's not right, then add.", false);
  $("scanErr").hidden = true; render();
  return true;
}

function dupOf(it) {
  if (it.ref) { const same = state.entries.find(e => e.ref && e.ref === it.ref); if (same) return same; }
  if (!it.amount || !it.date) return null;
  return state.entries.find(e => e.date === it.date && Math.abs(+e.amount - it.amount) < 0.005 && e.type === it.type && e.person === meId()) || null;
}
function needs(it) {
  const miss = [];
  if (!(it.amount > 0)) miss.push("amount");
  if (!it.date || !ISO.test(it.date)) miss.push("date");
  if (it.currency && it.currency !== (state.settings.currency || "MVR") && !it.currencyOk) miss.push("amount");
  return miss;
}
function render() {
  const cur = state.settings.currency || "MVR";
  // category memory: if Gemini said "Other" but you've used something for this shop before
  items.forEach(it => { if ((!it.category || it.category === "Other") && it.note && !it.catOther) { const c = guessCategory(it.note, it.type); if (c) it.category = c; } });
  $("scanList").innerHTML = items.map((it, i) => {
    const miss = needs(it), goalMode = it.type === "save" || it.type === "withdraw", foreign = it.currency && it.currency !== cur && !it.currencyOk, dup = dupOf(it);
    const qs = it.questions.map((q, qi) => `<div class="q${q.picked !== null ? " done" : ""}"><span>${esc(q.question)}</span>${q.options.length ? `<div class="opts">${q.options.map((o, oi) => `<button type="button" data-i="${i}" data-q="${qi}" data-o="${oi}" aria-pressed="${q.picked === oi}">${esc(o.label)}</button>`).join("")}</div>` : ""}</div>`).join("");
    const opts = [...new Set(catOptions(it.type).concat(it.category && !it.catOther ? [it.category] : []))];
    return `<div class="scard${it.include ? "" : " off"}">
      <div class="scard-top"><label><input type="checkbox" data-i="${i}" data-k="include" ${it.include ? "checked" : ""}> Add this</label>${it.confidence === "low" || miss.length || it.questions.some(q => q.picked === null) ? '<span class="flag">Check this</span>' : ""}</div>
      ${qs}
      ${foreign ? `<div class="q"><span>The image shows ${esc(it.currency)} ${esc(String(it.amount ?? ""))}. Enter the amount in ${esc(cur)} below, then confirm.</span><div class="opts"><button type="button" data-i="${i}" data-k="currencyOk">Amount is in ${esc(cur)}</button></div></div>` : ""}
      <div class="row2">
        <div class="field${it.typeKnown ? "" : " need"}"><label for="st${i}">Type</label><select id="st${i}" data-i="${i}" data-k="type">${TYPES.map(([v, l]) => `<option value="${v}"${v === it.type ? " selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field${miss.includes("amount") ? " need" : ""}"><label for="sa${i}">Amount (${esc(cur)})</label><input id="sa${i}" class="num" type="number" inputmode="decimal" min="0" step="0.01" data-i="${i}" data-k="amount" value="${it.amount ?? ""}"></div>
        <div class="field${miss.includes("date") ? " need" : ""}"><label for="sd${i}">Date</label><input id="sd${i}" type="date" data-i="${i}" data-k="date" value="${it.date || ""}"></div>
        ${goalMode
          ? `<div class="field"><label for="sg${i}">Goal</label><select id="sg${i}" data-i="${i}" data-k="goalId"><option value="">General savings</option>${visibleGoals(meId()).map(g => `<option value="${g.id}"${g.id === it.goalId ? " selected" : ""}>${esc(g.name)}</option>`).join("")}</select></div>`
          : `<div class="field"><label for="sc${i}">Category</label><select id="sc${i}" data-i="${i}" data-k="catsel">${opts.map(c => `<option value="${esc(c)}"${!it.catOther && c === it.category ? " selected" : ""}>${esc(c)}</option>`).join("")}<option value="__other"${it.catOther ? " selected" : ""}>Other (type your own)…</option></select>${it.catOther ? `<input id="sco${i}" data-i="${i}" data-k="category" value="${esc(it.category)}" placeholder="Type a category" aria-label="Your own category" class="mt6">` : ""}</div>`}
      </div>
      <div class="field"><label for="sn${i}">Note</label><input id="sn${i}" maxlength="160" data-i="${i}" data-k="note" value="${esc(it.note)}"></div>
      ${dup ? (it.ref && dup.ref === it.ref ? `<div class="dup">This transfer (${esc(it.ref)}) is already in Pocket Ledger, so it's unticked.</div>` : `<div class="dup">You already have ${esc(money(+dup.amount))} on this date${dup.note ? " (" + esc(dup.note) + ")" : ""}. Untick this if it's the same one.</div>`) : ""}
    </div>`;
  }).join("");
  const n = items.filter(x => x.include).length;
  $("scanFoot").hidden = false; $("scanAdd").hidden = !items.length;
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

export function initScan() {
  $("scanFile").addEventListener("change", ev => {
    const files = Array.from(ev.target.files || []); ev.target.value = "";
    if (!files.length) return;
    if (files.length > 4) toast("Reading the first 4 images");
    startScan(files.slice(0, 4));
  });
  document.addEventListener("click", ev => { if (ev.target.closest("[data-scan]")) openScanPicker(); });
  $("scanMore").addEventListener("click", openScanPicker);
  $("scanClose").addEventListener("click", closeScan);
  $("scanWrap").addEventListener("click", ev => { if (ev.target === $("scanWrap")) closeScan(); });
  $("scanList").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    const it = items[+b.dataset.i]; if (!it) return;
    if (b.dataset.k === "currencyOk") { it.currencyOk = true; render(); return; }
    const q = it.questions[+b.dataset.q]; if (!q) return;
    q.picked = +b.dataset.o; applyAnswer(it, q.field, q.options[q.picked].value);
    render();
  });
  $("scanList").addEventListener("input", ev => {
    const el = ev.target, it = items[+el.dataset.i], k = el.dataset.k; if (!it || !k) return;
    if (k === "amount") { it.amount = num(el.value) > 0 ? num(el.value) : null; it.currencyOk = true; }
    else if (k === "include") it.include = el.checked;
    else if (k === "catsel") { if (el.value === "__other") { it.catOther = true; it.category = ""; render(); const o = $("sco" + el.dataset.i); if (o) o.focus(); } else { it.catOther = false; it.category = el.value; } return; }
    else it[k] = el.value;
    if (k === "type") it.typeKnown = true;
    if (k === "include" || k === "type") render();
  });
  $("scanList").addEventListener("change", ev => { const k = ev.target.dataset.k; if (k === "amount" || k === "date") render(); });
  $("scanAdd").addEventListener("click", () => {
    const chosen = items.filter(x => x.include), bad = chosen.filter(x => needs(x).length);
    if (bad.length) { $("scanErr").textContent = "Fill in the highlighted amount or date on " + (bad.length === 1 ? "1 entry" : bad.length + " entries") + " first."; $("scanErr").hidden = false; render(); return; }
    $("scanErr").hidden = true;
    chosen.forEach((it, i) => {
      const e = { type: it.type, amount: it.amount, date: it.date, note: (it.note || "").trim(), created: Date.now() + i, person: meId(), source: it.src || "scan" };
      if (it.ref) e.ref = it.ref;
      if (it.type === "save" || it.type === "withdraw") { e.goalId = it.goalId || ""; e.category = "Savings"; }
      else e.category = (it.category || "").trim() || (it.type === "income" ? "Salary" : "Other");
      if (it.split && it.type === "expense") e.split = it.split;
      db.add(e); budgetCheck(e);
    });
    toast(chosen.length === 1 ? "Added 1 entry" : "Added " + chosen.length + " entries");
    const m = chosen[0].date.slice(0, 7);
    closeScan();
    if (m !== ui.month) { ui.month = m; changed(); }
  });
}
