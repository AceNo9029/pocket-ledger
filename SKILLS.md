# Skills & Plugins — Pocket Ledger

Skills loaded for this project session.

## 🔌 Plugins (5)

| Plugin | Version | Source | Use for |
|---|---|---|---|
| `impeccable` | 4.4.0 | pbakaus/impeccable | Frontend design fluency — `/impeccable` commands for craft, audit, polish, animate, typeset, layout |
| `taste-skill` | 1.0.0 | Leonxlnx/taste-skill | Anti-slop frontend design rules — typography, color, layout discipline, motion, pre-flight checks |
| `static-analysis` | 1.5.0 | trailofbits/skills | Semgrep + CodeQL security scanning |
| `humanizer` | 6.1.0 | chi-feng/humanizer | Remove AI-writing patterns from copy and docs |

## 🧠 Available Commands

### Design (`impeccable`)
`craft` · `shape` · `init` · `document` · `extract` · `critique` · `audit` · `polish` · `bolder` · `quieter` · `distill` · `harden` · `onboard` · `animate` · `colorize` · `typeset` · `layout` · `delight` · `overdrive` · `clarify` · `adapt` · `optimize` · `live` · `generate`

### Security (`static-analysis`)
- `/static-analysis:semgrep-scan` — Run Semgrep end-to-end
- `/static-analysis:codeql-build` — Build CodeQL database

### Copy (`humanizer`)
- `/humanizer` — Rewrite text to remove AI tells
- `/humanizer --audit` — Show diff of what changed

## Project Context

Pocket Ledger is a vanilla-JS PWA (no React, no build step). Skills that assume a React/Tailwind/Next.js stack (e.g. taste-skill's default block library) are used for design direction and review only — implementation stays native JS + CSS.
