# ================= themes & person colours =================
import sys; sys.path.insert(0, '/home/claude/pl-app/src')
from themes import css as theme_css, PRESETS
rep('<meta name="theme-color" content="#0B5F57">', """<meta name="theme-color" content="#0B5F57">
<script>
(function () {
  var d = document.documentElement, g = function (k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  window.plApplyTheme = function () {
    var mode = g("pl-mode") || "auto", preset = g("pl-preset") || "lagoon";
    var dark = mode === "dark" || (mode === "auto" && mq && mq.matches);
    d.setAttribute("data-theme", dark ? "dark" : "light");
    if (preset && preset !== "lagoon") d.setAttribute("data-preset", preset); else d.removeAttribute("data-preset");
    if (g("pl-amoled") === "1") d.setAttribute("data-amoled", ""); else d.removeAttribute("data-amoled");
    var m = document.querySelector('meta[name="theme-color"]');
    if (m && document.body) m.setAttribute("content", getComputedStyle(document.body).backgroundColor);
  };
  window.plApplyTheme();
  if (mq && mq.addEventListener) mq.addEventListener("change", window.plApplyTheme);
  document.addEventListener("DOMContentLoaded", window.plApplyTheme);
})();
</script>""")
rep('* { box-sizing: border-box; }', theme_css() + """
.modeseg { display: grid; grid-template-columns: repeat(3, 1fr); background: var(--sunk); border-radius: 10px; padding: 3px; gap: 3px; }
.modeseg button { border: 0; background: transparent; border-radius: 8px; padding: 7px 4px; font-size: .85rem; font-weight: 600; color: var(--ink-2); }
.modeseg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
.theme-sw { display: grid; justify-items: center; gap: 6px; border: 1.5px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 6px; font-size: .8rem; font-weight: 600; color: var(--ink-2); }
.theme-sw[aria-pressed="true"] { border-color: var(--accent); color: var(--ink); box-shadow: 0 0 0 1px var(--accent) inset; }
.theme-sw .chip { width: 44px; height: 28px; border-radius: 8px; display: flex; overflow: hidden; border: 1px solid rgba(127,127,127,.25); }
.theme-sw .chip i { flex: 1; }
.check { display: flex; gap: 10px; align-items: flex-start; font-size: .9rem; }
.check input { margin-top: 4px; width: 18px; height: 18px; accent-color: var(--accent); }
.check small { display: block; color: var(--ink-3); font-size: .8rem; }
.pcolors { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pcolors span { font-size: .85rem; color: var(--ink-2); min-width: 7em; }
.pcolors button { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--line); padding: 0; }
.pcolors button[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--ink); }
.pdot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
* { box-sizing: border-box; }""")
_lag = ("lagoon", {"name": "Lagoon", "light": {"bg": "#F3F6F5", "accent": "#0B5F57"}, "dark": {"bg": "#0F1716"}})
chips = "".join(
  '<button class="theme-sw" type="button" data-preset="%s"><span class="chip"><i style="background:%s"></i><i style="background:%s"></i><i style="background:%s"></i></span>%s</button>'
  % (k, p["light"]["bg"], p["light"]["accent"], p["dark"]["bg"], p["name"]) for k, p in [_lag] + list(PRESETS.items()))
rep('<div class="panel-head"><h2>Settings</h2><button class="icon-btn" id="closeSettings">Close</button></div>',
'<div class="panel-head"><h2>Settings</h2><button class="icon-btn" id="closeSettings">Close</button></div>\n'
'    <div class="setsec" style="border-top:0;padding-top:0">\n'
'      <h3>Appearance on this device</h3>\n'
'      <div class="modeseg" role="group" aria-label="Light or dark"><button type="button" data-mode="auto">Automatic</button><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button></div>\n'
'      <div class="themes" role="group" aria-label="Theme">' + chips + '</div>\n'
'      <label class="check"><input type="checkbox" id="setAmoled"><span>Pure black in dark mode<small>Deeper blacks that save battery on AMOLED screens like the S24 Ultra.</small></span></label>\n'
'    </div>\n'
'    <h3 style="font-size:.95rem">Shared with your household</h3>')
rep('    <p class="hint" style="margin:0">These help scanning tell whose transfer it is',
    '    <div class="pcolors" id="pcol1"></div>\n    <div class="pcolors" id="pcol2"></div>\n    <p class="hint" style="margin:0">These help scanning tell whose transfer it is')
rep('bank: $("setBank1").value.trim(), acct: last4($("setAcct1").value) }', 'bank: $("setBank1").value.trim(), acct: last4($("setAcct1").value), color: pickColor.p1 || pcolor("p1") }')
rep('bank: $("setBank2").value.trim(), acct: last4($("setAcct2").value) }', 'bank: $("setBank2").value.trim(), acct: last4($("setAcct2").value), color: pickColor.p2 || pcolor("p2") }')
rep('  const isHouse = () => ui.view === "all";', '''  const isHouse = () => ui.view === "all";
  const PCOLORS = ["#2F6FD6", "#9B4F96", "#0E8A7D", "#C9821B", "#4C9A2A", "#D0526E"];
  const pcolor = id => (people().find(p => p.id === id) || {}).color || (id === "p2" ? PCOLORS[1] : PCOLORS[0]);
  const pickColor = { p1: null, p2: null };''')
rep('aria-pressed="${ui.view === x.id}">${esc(x.name)}</button>', 'aria-pressed="${ui.view === x.id}"><i class="pdot" style="background:${pcolor(x.id)}"></i>${esc(x.name)}</button>')
rep('<small>${esc([e.note || (e.type === "expense" ? "Spent" : e.type === "income" ? "Income" : ""), isHouse() ? pname(e.person) : ""].filter(Boolean).join(" · "))}</small>',
    '<small>${isHouse() ? `<i class="pdot" style="background:${pcolor(e.person)}"></i>` : ""}${esc([isHouse() ? pname(e.person) : "", e.note || (e.type === "expense" ? "Spent" : e.type === "income" ? "Income" : "")].filter(Boolean).join(" · "))}</small>')
# tooltips only on devices with a real mouse (they stick after a tap on phones)
rep('.tool:hover::after, .tool:focus-visible::after { opacity: 1; }', '@media (hover: hover) { .tool:hover::after { opacity: 1; } }\n.tool:focus-visible::after { opacity: 1; }')
