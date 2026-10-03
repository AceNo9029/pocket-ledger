# Claude: Pocket Ledger

@AGENTS.md

## Claude-specific
- Start every session by reading `HANDOFF.md`. It is the source of truth for what's live and what's next.
- Design and copy skills: see `SKILLS.md` for which skill to use when. Design skills give direction; the code stays vanilla JS + CSS (no React, Tailwind or build step).
- In Cowork (cloud session linked to Faris's laptop): edit in the cloud workspace, run the tests there, write the changed files into the repo folder on the laptop, then commit and push through GitHub Desktop. Check sizes on the laptop after writing (writes have gone stale before), and click History → Changes in GitHub Desktop if it shows no changes.
- After pushing, confirm the live `sw.js` shows the new `pl-vNN` at https://smilin-assassin.github.io/pocket-ledger/sw.js.
