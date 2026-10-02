# ================= Ask Gemini chat =================
bubble = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12.5a7.5 7.5 0 0 1-11.2 6.5L4 20l1.1-4.3A7.5 7.5 0 1 1 20 12.5z"/><path d="M9 11h6M9 14h4"/></svg>'
rep('<button class="tool" id="scanBtn"', '<button class="tool" id="chatBtn" title="Ask about your money" aria-label="Ask about your money">' + bubble + '</button>\n      <button class="tool" id="scanBtn"')
# settings: Gemini section
rep('''      <h3>Scanning on this device</h3>
      <div class="field"><label for="setKey">Gemini API key</label><input id="setKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key from Google AI Studio"></div>
      <p class="hint" style="margin:0">Kept on this device only, never in the shared data. Get a free key at aistudio.google.com, then Get API key.</p>
      <details class="box"><summary>Advanced</summary><div><div class="field"><label for="setModel">Gemini model</label>''',
'''      <h3>Gemini (scanning and chat)</h3>
      <div class="field"><label for="setHKey">Gemini key for the household</label><input id="setHKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key from Google AI Studio"></div>
      <p class="hint" style="margin:0">Saved with your household's data, so everyone in the household can scan and chat without their own key. Everyone in the household can see it. Get one at aistudio.google.com, then Get API key.</p>
      <details class="box"><summary>Advanced</summary><div><div class="field"><label for="setKey">Use a different key on this device (optional)</label><input id="setKey" type="password" autocomplete="off" spellcheck="false" placeholder="Leave empty to use the household key"></div><div class="field"><label for="setModel">Gemini model</label>''')
# chat panel + floating button
rep('<div class="toast" id="toast" hidden></div>', '''<button class="fab" id="chatFab" aria-label="Ask about your money">''' + bubble.replace('width="18" height="18"', 'width="24" height="24"') + '''</button>
<section class="chat" id="chatPanel" hidden aria-label="Ask about your money">
  <div class="chat-head"><h2>Ask about your money</h2><span><button class="icon-btn" id="chatClear" type="button">New chat</button><button class="icon-btn" id="chatClose" type="button">Close</button></span></div>
  <div class="chat-msgs" id="chatMsgs" aria-live="polite"></div>
  <form class="chat-form" id="chatForm"><textarea id="chatInput" rows="1" placeholder="e.g. How much did I spend on eating out this month?" aria-label="Your question"></textarea><button class="primary" id="chatSend" type="submit">Ask</button><button class="ghost" id="chatStop" type="button" hidden>Stop</button></form>
</section>
<div class="toast" id="toast" hidden></div>''')
rep('* { box-sizing: border-box; }', '''.fab { position: fixed; right: 16px; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 12; width: 56px; height: 56px; border-radius: 18px; border: 0; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; box-shadow: 0 6px 18px rgba(0,0,0,.22); }
body.chat-open .fab { display: none; }
.chat { position: fixed; z-index: 16; right: 16px; bottom: 16px; width: min(440px, calc(100% - 32px)); height: min(680px, calc(100% - 32px)); background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,.25); display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; }
.chat[hidden] { display: none; }
@media (max-width: 560px) { .chat { inset: 0; width: 100%; height: 100%; border-radius: 0; border: 0; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } }
.chat-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.chat-head h2 { font-size: 1.05rem; }
.chat-msgs { overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
.msg { max-width: 88%; padding: 10px 12px; border-radius: 14px; font-size: .93rem; line-height: 1.45; overflow-wrap: anywhere; display: grid; gap: 6px; }
.msg.me { align-self: flex-end; background: var(--accent); color: var(--accent-ink); border-bottom-right-radius: 4px; }
.msg.ai { align-self: flex-start; background: var(--sunk); color: var(--ink); border-bottom-left-radius: 4px; }
.msg.ai.err { background: var(--warn-bg); color: var(--warn-ink); }
.msg small { color: var(--ink-3); font-size: .75rem; }
.msg .li { display: block; padding-left: 14px; position: relative; }
.msg .li::before { content: "•"; position: absolute; left: 2px; }
.msg .ghost { justify-self: start; }
.chat-empty { color: var(--ink-2); font-size: .92rem; display: grid; gap: 12px; }
.chat-empty p { margin: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chipq { border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 999px; padding: 7px 12px; font-size: .85rem; text-align: left; }
.chat-form { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--line); align-items: flex-end; }
.chat-form textarea { flex: 1; min-width: 0; resize: none; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 12px; padding: 10px 12px; font: inherit; max-height: 120px; }
.chat-form textarea:focus { outline: none; border-color: var(--accent); }
body .wrap { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
* { box-sizing: border-box; }''')
