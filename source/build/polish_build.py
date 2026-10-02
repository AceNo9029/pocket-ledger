# ================= polish: markup + CSS =================
# entry rows: id + open state; clearer delete label
rep('html += `<li class="tx"><span class="dot"', 'html += `<li class="tx${ui.openRow === e.id ? " open" : ""}" data-id="${e.id}"><span class="dot"')
rep('aria-label="Delete entry">✕</button>', 'aria-label="Delete entry">Delete</button>')
# category hint under the category field
rep('<input id="fCat" list="catList" autocomplete="off" placeholder="Pick or type"><datalist id="catList"></datalist></div>',
    '<input id="fCat" list="catList" autocomplete="off" placeholder="Pick or type"><datalist id="catList"></datalist><small class="cat-hint" id="catHint" hidden></small></div>')
rep('<p class="hint" style="margin:0" id="trendNote"></p>', '<div class="trend-detail" id="trendDetail" hidden></div>\n        <p class="hint" style="margin:0" id="trendNote"></p>')
# shortcut landing sheet
rep('<div class="lock" id="lock" hidden>', '''<div class="quick" id="quick" hidden>
  <div class="quick-card">
    <h2 id="quickTitle">Quick action</h2>
    <p class="muted" id="quickSub"></p>
    <button class="primary" type="button" id="quickGo">Go</button>
    <button class="linkish" type="button" id="quickX">Not now</button>
  </div>
</div>
<div class="lock" id="lock" hidden>''')
rep('* { box-sizing: border-box; }', '''.cat-hint { color: var(--accent); font-size: .76rem; }
.tx { transition: transform .15s ease; touch-action: pan-y; }
.tx .acts .icon-btn { padding: 6px 9px; }
@media (hover: none) {
  .tx .acts { display: none; }
  .tx.open .acts { display: flex; grid-column: 1 / -1; gap: 8px; }
  .tx.open .acts .icon-btn { flex: 1; padding: 11px 12px; font-size: .9rem; border: 1px solid var(--line); background: var(--surface); border-radius: 10px; color: var(--ink); }
  .tx.open .acts .icon-btn.danger, .tx.open .acts [data-ask] { color: var(--neg); }
  .tx { cursor: pointer; }
}
.tx.open { background: var(--sunk); border-radius: 10px; padding-inline: 8px; }
.trend .mon.sel .hit { fill: var(--sunk); stroke: var(--accent); stroke-width: 1.5; }
.trend-detail { border: 1px solid var(--line); border-radius: var(--r); padding: 10px 12px; display: grid; gap: 6px; font-size: .88rem; }
.td-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.td-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; color: var(--ink-2); }
.td-grid b { display: block; color: var(--ink); }
@media (max-width: 420px) { .td-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.trend-detail small { color: var(--ink-3); }
.chips.follow { margin-top: 2px; }
.chips.follow .chipq { background: var(--surface); font-size: .8rem; padding: 6px 10px; }
.quick { position: fixed; inset: 0; z-index: 35; background: rgba(0,0,0,.45); display: grid; align-items: end; justify-items: center; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
.quick-card { width: min(100%, 440px); background: var(--surface); border-radius: 18px; padding: 20px; display: grid; gap: 10px; }
.quick-card h2 { font-size: 1.2rem; }
.quick-card p { margin: 0; }
.quick-card .primary { padding: 14px; font-size: 1rem; }
.quick-card .linkish { justify-self: center; }
* { box-sizing: border-box; }''')
rep('placeholder="Ask, or tap the mic and just say it"', 'placeholder="Ask, or tap the mic"')
rep('.cat-hint { color: var(--accent); font-size: .76rem; }', '.cat-hint { color: var(--accent); font-size: .76rem; }\n.chat-head .row-btns { flex-wrap: nowrap; }\n.chat-head h2 { white-space: nowrap; }')
