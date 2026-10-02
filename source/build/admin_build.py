# Admin dashboard: toolbar button, panel, styles.
shield = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>'
rep('      <button class="tool" id="settingsBtn"', '      <button class="tool" id="adminBtn" title="Admin" aria-label="Admin dashboard" hidden>' + shield + '</button>\n      <button class="tool" id="settingsBtn"')
rep('  <section class="panel" id="settingsPanel" hidden>', '''  <section class="panel" id="adminPanel" hidden>
    <div class="panel-head"><h2>Admin</h2><span class="row-btns"><button class="icon-btn" id="adminRefresh" type="button">Refresh</button><button class="icon-btn" id="adminClose" type="button">Close</button></span></div>
    <div id="adminBody" class="ad-body"></div>
  </section>

  <section class="panel" id="settingsPanel" hidden>''')
rep('* { box-sizing: border-box; }', '''* { box-sizing: border-box; }
.ad-body { display: grid; gap: 12px; }
.ad-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 700px) { .ad-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.ad-tile { border: 1px solid var(--line, #ccc); border-radius: 12px; padding: 12px; display: grid; gap: 2px; }
.ad-tile span { font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; opacity: .7; }
.ad-tile b { font-size: 1.5rem; } .ad-tile small { opacity: .7; }
.ad-card { border: 1px solid var(--line, #ccc); border-radius: 12px; padding: 12px; display: grid; gap: 8px; }
.ad-head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; align-items: baseline; } .ad-head small { opacity: .75; }
.ad-chart { width: 100%; height: auto; display: block; }
.ad-bar { fill: var(--accent, #0B5F57); }
.ad-hit { fill: transparent; cursor: pointer; } .ad-hit:hover, .ad-hit.on { fill: currentColor; fill-opacity: .07; }
.ad-grid { stroke: currentColor; stroke-opacity: .12; stroke-width: 1; }
.ad-ax { fill: currentColor; fill-opacity: .6; font-size: 11px; }
.ad-h { margin: 6px 0 0; font-size: .95rem; }
.ad-badge { font-size: .7rem; font-weight: 600; border: 1px solid var(--line, #ccc); border-radius: 999px; padding: 1px 8px; margin-left: 4px; vertical-align: middle; }
.ad-body .formfoot .hint { flex-basis: 100%; }''')
