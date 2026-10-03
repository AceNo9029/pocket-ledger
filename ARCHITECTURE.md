# Architecture

Short version: `ARCHITECTURE-ESSENTIALS.md`. Data model, server commands and product rules: `HANDOFF.md`.

## Principles
- **No build step.** Plain ES modules, loaded as they are by GitHub Pages. One job per file.
- **Offline first.** Firestore's persistent cache means writes land instantly and sync later; the service worker serves the shell network-first so updates arrive on the next open.
- **The server is small.** Everything that can run in the browser does. The server only holds what must be secret or trusted: the Gemini key, invite redemption, admin actions, scheduled alerts and push.
- **Security in rules, not in the UI.** `firestore.rules` enforces who can read a space and that only a doc's `author` can change it. The UI hides buttons, the rules make it true.

## Start-up
1. `index.html` applies the saved theme before paint (inline script: `plApplyTheme`), then loads `app.js?v=NN`.
2. `app.js` shows the gate: sign in, invite check (`access` function), one-time migration of the old household, then picks the space (Me, a group, or someone's dashboard you were allowed to view).
3. `js/main.js boot()` registers the pages, starts shell, dock, Quick add, scanning, statements, transfers, chat, lock and the backup reminder, then connects the live data and routes.

## Modules
| File | Responsibility |
|---|---|
| `js/store.js` | `ctx` (Firebase handles, profile, spaces), `state` (entries, goals, loans… for the open space), `ui` (month, view, filters). Live listeners, `rebuild()` (legacy ids, hiding others' private items), all money maths (month totals, savings, goals, loans, bills, who owes whom, budgets, categories) and writes (`db.add/update/saveDoc/removeDoc/restoreDoc/addMany/removeMany/saveSettings/replaceAll`). Deletes keep a copy in `trash` for 30 days. |
| `js/actions.js` | Shared actions used by forms, scanning and chat: loans and repayments, bills (create/pay/skip), settle up, budgets and budget alerts, `addEntries`, `removeWithUndo`. |
| `js/shell.js` | Hash router (`#page/anchor`), page title, month switcher, space chips, "whose money" switch, banners, `onRoute` hooks. |
| `js/pages/*.js` | One page each. `entries` has the form, the list with category picker and total line, CSV export; `home` the dashboard and category bars (tap → entries for that category); `settings` holds every section including Appearance. |
| `js/dock.js` | Phone dock: builds 4 or 6 tabs (+ More), the liquid highlight, scrub, badges, More page; side-menu highlight on wide screens; page slide-in. |
| `js/quick.js` | Quick add sheet that grows out of the +; number pad, most-used categories, date, note; hold the + for Scan / Type it / Voice. |
| `js/motion.js` | Spring physics on real time, presets (Calm/Lively/Jelly), CSS `linear()` easing from the spring, vibrations, refresh-rate measurement. Settings in localStorage `pl-motion`. |
| `js/scan.js` | Receipt and screenshot scanning (Gemini prompt + check-before-adding sheet) and bank statement import: BML CSV and MIB CSV parsed exactly, other CSVs and PDFs via Gemini; own-account detection, cross-checked duplicates, categorising, Undo. |
| `js/gemini.js` | Calls the `gemini` function (or a personal key), image compression, PDF inline data. |
| `js/chat.js` | Chat and voice: Gemini plans tool calls (look-ups or changes), changes need a one-tap confirm. |
| `js/transfers.js` | Money sent between people in a group: send sheet, approval cards, push via `notifyTransfer`. |
| `js/lock.js`, `js/notify.js`, `js/backup.js`, `js/util.js` | App lock (PIN/fingerprint), push setup and notification choices, backup/restore/reminder and import history, small helpers (`toast` with Undo, dates, money, storage). |
| `sw.js` | Cache `pl-vNN`, network-first with `no-cache`, share target (images, PDF, CSV), push display. |
| `functions/index.js`, `alerts.js` | `gemini`, `access`, `admin`, `dailyAlerts` (08:30 Maldives), `notifyTransfer`, `testPush`. |

## Statement import pipeline
`importStatement(file)` → parse (`mibRows` / `bmlRows` / Gemini `aiRows`) → `ownInfo` (your bank names and account last-4s, plus the account in an MIB file name) → per row: same reference twice in the file → skip; own account (account digits or name, initials allowed) → skip; already in the app (`dupOfRow`: same reference; or same type + amount within 2 days, not contradicted by a different reference, one match per entry, best by name then day) → skip; otherwise add → categorise (memory of past categories, then Gemini, then keyword fallback) → `db.addMany` with an `importId` so the whole batch can be undone.

## Motion and layout
- Dock tabs and highlights are positioned from layout values (`offsetLeft/Width`), never raw screen rects, because Settings › Text size zooms the body.
- Springs advance with real elapsed time in ≤2 ms slices; CSS transitions use the same spring as `linear()` easing (`--spring-ease`, `--grow-dur`).
- Breakpoint 900px: below it the dock and Quick add; above it the side menu.

## Tests
`tests/` runs Playwright against the real files with Firebase replaced by mocks (`tests/mockfb/`); the Firestore mock checks the security rules so a denied write fails the test. g1 migration · g2 sharing and view-only · g3 group link · g4 every page · g5 invites · g6 admin · g7 trash, backup, chat · g8 BML statement · g9 transfers · g10 dock, Quick add, Undo, Appearance, text sizes · g11 MIB statement and duplicate cross-checks · g12 category drill-down and totals.
