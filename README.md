# Pocket Ledger

A personal and household money tracker: monthly income, spending, what's left, savings and goals, loans, bills and reminders, budgets, receipt and bank-screenshot scanning, and a chat (typing or voice) that looks things up and prepares changes for you to confirm.

- Your own entries are private ("Me"). Groups hold shared costs; only the person who added something can change it.
- Installs on Android, iPhone and computers from the browser. Works offline; changes sync when you're back online.
- Invite-only. Data lives in Firebase (Auth, Firestore, Cloud Functions, push).

## Files

| Path | What it is |
|---|---|
| `index.html`, `css/app.css` | The page shell and styles |
| `app.js` | Sign-in, invite check, spaces, then starts the app |
| `js/` | The app, one module per job; `js/pages/` has one file per page |
| `config.js` | Firebase web settings (not secret) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable app, offline, share target, push |
| `firestore.rules`, `functions/`, `firebase.json` | Server side (deploy from Cloud Shell) |
| `tests/` | Browser tests with Firebase mocks |

More: `PRD.md` (what it's for, rules, what's next), `ARCHITECTURE.md` (how it's built), `AGENTS.md` (for AI agents).

## Updating

Bump `VERSION` in `sw.js` and the `?v=` numbers in `index.html` (see `AGENTS.md`), push with GitHub Desktop, then close and reopen the app on each phone.
