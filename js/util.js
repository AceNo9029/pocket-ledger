// Small helpers shared by every part of the app.
export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const num = v => { const n = parseFloat(v); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; };
export const r2 = n => Math.round((+n || 0) * 100) / 100;
export const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
export const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const isoOk = d => ISO.test(String(d || ""));
export const MONTH = /^\d{4}-\d{2}$/;

// ---------- dates ----------
export function monthKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
export function todayISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
export function shiftMonth(k, n) { const [y, m] = k.split("-").map(Number); return monthKey(new Date(y, m - 1 + n, 1)); }
export function monthName(k, short) { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: short ? "short" : "long", year: "numeric" }); }
export function monthsBetween(a, b) { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1); }
export const daysIn = k => { const [y, m] = k.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export const dateIn = (k, day) => k + "-" + String(Math.min(Math.max(1, +day || 1), daysIn(k))).padStart(2, "0");
export const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);
export const fmtDate = d => { try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };
export const dShort = k => new Date(k + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
export function ago(t) {
  if (!t) return "never";
  const ms = Date.now() - (typeof t === "string" ? Date.parse(t) : t); if (!(ms >= 0)) return "—";
  const m = Math.round(ms / 60e3); if (m < 2) return "just now"; if (m < 60) return m + " min ago";
  const h = Math.round(m / 60); if (h < 24) return h + " h ago";
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : d < 45 ? d + " days ago" : new Date(Date.now() - ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ---------- money ----------
let currency = "MVR", fmtCache = {};
export function setCurrency(c) { c = c || "MVR"; if (c !== currency) { currency = c; fmtCache = {}; } }
export const getCurrency = () => currency;
export function money(n, opts) {
  const whole = !!(opts && opts.whole), key = currency + (whole ? "w" : "");
  if (!fmtCache[key]) {
    try { fmtCache[key] = new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }); }
    catch { fmtCache[key] = { format: v => currency + " " + v.toFixed(whole ? 0 : 2) }; }
  }
  return fmtCache[key].format(+n || 0).replace(/ /g, " ");
}

// ---------- this device ----------
export const lsGet = k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
export const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
export const lsJson = (k, dflt) => { try { const v = JSON.parse(lsGet(k) || "null"); return v ?? dflt; } catch { return dflt; } };

// ---------- feedback ----------
let toastT = null;
// a short message; with opts.action (e.g. "Undo") it carries a button and stays a little longer
export function toast(msg, opts) {
  const t = $("toast"); if (!t) return;
  opts = opts || {};
  t.innerHTML = "";
  const span = document.createElement("span"); span.textContent = msg; t.appendChild(span);
  if (opts.action) {
    const b = document.createElement("button"); b.type = "button"; b.className = "toast-act"; b.textContent = opts.action;
    b.addEventListener("click", () => { clearTimeout(toastT); t.classList.remove("show"); t.hidden = true; try { opts.onAction && opts.onAction(); } catch (e) { console.error(e); } }, { once: true });
    t.appendChild(b);
  }
  t.classList.toggle("has-act", !!opts.action);
  t.hidden = false; requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("show"); setTimeout(() => { if (!t.classList.contains("show")) t.hidden = true; }, 300); }, opts.ms || (opts.action ? 5000 : 2600));
}
export function saveFile(name, content, okLabel) {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: name.endsWith(".csv") ? "text/csv" : name.endsWith(".ics") ? "text/calendar" : "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (okLabel) toast(okLabel + " as " + name);
  } catch { toast("The file wasn't saved. Try again."); }
}
export function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (label) { if (on) { btn.dataset.l = btn.textContent; btn.textContent = label; } else if (btn.dataset.l) btn.textContent = btn.dataset.l; }
}
export function showErr(id, text) { const el = $(id); if (!el) return; el.textContent = text || ""; el.hidden = !text; }
export const plural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));
export const canHover = () => !!(window.matchMedia && matchMedia("(hover: hover)").matches);

// fill a <select> while keeping what was picked, if it still exists
export function fillSelect(sel, options, keep) {
  if (!sel) return;
  const cur = keep !== undefined ? keep : sel.value;
  sel.innerHTML = options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
