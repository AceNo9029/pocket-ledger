# Backups: recently deleted section, backup reminder banner.
rep('<div class="banner info" id="reqBar" hidden></div>', '<div class="banner info" id="reqBar" hidden></div>\n  <div class="banner info" id="backupNag" hidden></div>')
rep('''    <div class="setsec" id="privSec">''', '''    <div class="setsec" id="trashSec">
      <h3>Recently deleted</h3>
      <p class="hint" style="margin:0">Things you deleted here in the last 30 days. Tap Restore to bring one back.</p>
      <div id="trashList" class="grp-list"></div>
    </div>
    <div class="setsec" id="privSec">''')
rep('#reqBar { display: flex;', '#backupNag { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }\n#reqBar { display: flex;')
rep('" goals, and will replace everything currently in Pocket Ledger."', '" goals, and will replace everything in " + (spaceMode() ? "your own space (Me). Groups aren\'t changed." : "Pocket Ledger.")')
rep('id="fNote" maxlength="80"', 'id="fNote" maxlength="160"')
