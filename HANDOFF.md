# Pocket Ledger: handoff notes

Read this first in a new conversation. It explains what the app is, how it's built, what's live, and what's next.

## Who and what

- Owner/admin: Faris (GitHub `Smilin-Assassin`), Maldives. His wife Sul uses it on an iPhone (installed via Safari > Add to Home Screen); Faris uses a Samsung S24 Ultra and a Windows laptop.
- Pocket Ledger is a personal and household money tracker: income, spending, what's left each month, savings and savings goals, loans, bills/reminders, budgets, a dashboard, receipt/bank-screenshot scanning with Gemini, and a Gemini chat (voice or text) that can look things up and prepare changes for one-tap confirmation.
- Live at https://smilin-assassin.github.io/pocket-ledger/ (GitHub Pages, from this repo's root). Installable PWA.
- Currency MVR. Dates on Maldivian receipts and bank screens are DD/MM/YYYY.

## Hosting and services

- **GitHub Pages** serves the static app. Faris pushes with GitHub Desktop from `C:\Users\Ahmed Faris\Documents\GitHub\pocket-ledger`.
- **Firebase project `pocket-ledger-3a340`** (Blaze / pay-as-you-go, region `asia-south1`): Email+password Auth, Firestore (persistent offline cache), Cloud Functions, FCM push.
- **Gemini** runs through the `gemini` Cloud Function with secret `GEMINI_KEY`. This is a FREE-tier key from an AI Studio project without billing (BML cards can't buy prepaid credit). Never ask for or paste the key in chat; Faris sets it in Cloud Shell with `firebase functions:secrets:set GEMINI_KEY`.
- The Firebase web config in `config.js` (apiKey `AIza…LxyV4`) is public by design; not a secret.
- Deploying server parts is done by Faris in Google Cloud Shell:
  `cd ~/pocket-ledger && git pull && firebase deploy --only functions,firestore:rules`
- If a newly created callable function says "not authenticated", fix with:
  `gcloud run services add-iam-policy-binding <name-lowercase> --region=asia-south1 --member=allUsers --role=roles/run.invoker --project=pocket-ledger-3a340`
- Suggested (may or may not have been run): daily Firestore backups
  `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d --project=pocket-ledger-3a340`

## Files (what's deployed)

No build step: GitHub Pages serves these files as they are. Plain ES modules, one job per file.

| File | What it is |
|---|---|
| `index.html` | The page shell: navigation, every page's markup, chat panel, scan sheet, lock screen, sign-in gate. |
| `css/app.css` | All styles: theme tokens (Lagoon/Atoll/Sandbank/Monsoon/Sunset, dark, AMOLED), the frame, each page. |
| `app.js` | Entry point: sign-in gate, invite-only check, migration of the old household, loading spaces, then `boot()` from `js/main.js`. |
| `config.js` | Firebase web config. |
| `js/main.js` | `boot()`: registers pages, starts shell, scan, chat, lock; share-target and icon shortcuts. |
| `js/store.js` | Data layer: live Firestore data for the open space, legacy p1/p2 mapping, hiding others' private things in groups, `canEdit`, all money maths (month totals, savings, goals, loans, bills, who-owes-whom, budgets), writes (deletes go to `trash`). |
| `js/actions.js` | Shared actions: loans, repayments, bills (create/pay/skip), settle up, budgets, budget alerts. |
| `js/shell.js` | Hash router (`#home`, `#entries`, `#loans`, `#bills`, `#goals`, `#settings/<section>`, `#admin`), page header (month, spaces, whose money), banners, bills badge. |
| `js/pages/*.js` | One file per page: `home`, `entries` (form + list, CSV), `loans`, `bills`, `goals`, `settings` (you, appearance, groups, privacy, invites, recently deleted), `admin`. |
| `js/gemini.js`, `js/scan.js`, `js/chat.js` | Gemini calls (server function or key), receipt/screenshot scanning sheet, chat with voice + one-tap confirm. |
| `js/lock.js`, `js/notify.js`, `js/backup.js`, `js/util.js` | App lock, push notifications + callable helper, backup/restore/reminder, small helpers. |
| `sw.js` | Service worker: network-first cache, share-target, push. **Bump `VERSION` (`pl-vNN`) on every release** and add any new file to `SHELL`. Latest: `pl-v21`. `index.html` loads `app.js?v=NN` and `css/app.css?v=NN`: bump those numbers too, so phones never mix a new page with old cached files (that caused a blank page after the first overhaul release). |
| `manifest.webmanifest`, `icons/` | PWA manifest (share_target, shortcuts) and icons. |
| `firestore.rules` | Security rules (see below). |
| `functions/` | Cloud Functions: `index.js`, `alerts.js`, `package.json` (Node 22, firebase-admin 13, firebase-functions 6). |
| `firebase.json`, `.firebaserc` | Firebase CLI config. |
| `tests/` | Playwright scenarios + Firebase mocks (see Testing). |

The old patch-on-patch build (`source/base`, `source/build`) was retired in the October 2026 overhaul; that folder can be deleted.

## Navigation

- Wide screens (900px+): vertical side menu. Phones: bottom tab bar (Home, Entries, Loans, Bills, Goals, Settings). Admin is in the side menu, and on phones under Settings › Account.
- Header on each page: page title, month switcher (Home, Entries), space chips (Me / groups / dashboards shared with you), and in groups the "You / Sul / All of <group>" switch.
- The chat button floats on every page. Scan opens a sheet from Home, Entries, the share sheet or the icon shortcut.

## Data model (Firestore)

- `users/{uid}`: `personal` (id of their private space), `spaces[]` (group ids), `name`, `email`, `tokens[]` (FCM), `notify {bills, budgets, loans}`, `lastSeen`. Legacy: `household`.
- `households/{id}` = a **space**. `type: "personal" | "group"`, `owner`, `members[]`, `viewers[]` (people allowed to view a personal space), group `name`, `names {uid: name}`, `colors {uid: hex}`, `joinUntil` (ms; invite link open until), `settings {currency, opening, openingBy {uid}, people [...] (personal only), budgets {all|uid: {category: limit}}}`, `ai {server}`, `gemini {key}` (legacy), `alertState`. Legacy fields kept on the converted old household: `personOf {uid: "p1"|"p2"}`, `legacy` (old settings).
  - Subcollections: `entries`, `goals`, `loans`, `recurring`, `settlements`, `trash`. Every doc has `author` (uid of who added it).
  - Entry: `type` (expense|income|save|withdraw), `amount`, `date` (YYYY-MM-DD), `category`, `note` (≤160), `person` (uid), `created`, optional `goalId`, `split {with, share}`, `countMonth` (YYYY-MM it counts for), `loanId`/`loanRole`, `recurringId`, `ref` (bank ref), `source`.
  - Goal: `name`, `target`, `by` (target month YYYY-MM — note `by` means deadline, NOT creator), `owner` (uid or "shared").
  - Recurring (bills/reminders): `type, amount, category, note, person, day, remindDays, startMonth, skips[], paused`. Paying creates entry id `rec-{rid}-{YYYY-MM}`. Never auto-added.
  - Loans: `direction` (lent|borrowed), `counterparty`, `amount`, `date`, `due`, `inMonth` (count in monthly money; default off), `person`. Repayments are entries with `loanId`.
  - Trash: `{col, docId, data, deletedAt, author}`; kept 30 days.
- `access/{uid}`: invite-only gate, written only by the server. `{ok, email, admin, how: existing|invite|restored, since, invite, invitedBy}`.
- `revoked/{uid}`: people the admin removed (server only).
- `invites/{code}`: `{by, note, group, created, expires, max: 1, used[], usedBy[]}`; created by admins in the app, used up by the `access` function.
- `viewRequests/{id}`: "can I see your dashboard" `{from, fromName, to, toName, status: pending|accepted|declined|revoked, space, group, created, answered}`.
- `aiUsage/{uid}_{day}` `{n, uid, day}` and `config/app {aiLimit}`: server only.

## Product rules decided with Faris (keep these)

- **Privacy:** everyone has a private space ("Me"). Groups (renameable, one person can be in several) hold shared things. Group entries are visible to all members but **only the person who added something can edit/delete it** (enforced by rules via `author`). Only the group owner renames it or opens invitations.
- Someone can **ask to see** another member's own dashboard; the owner allows/declines; viewers are read-only; it can be revoked in Settings › Privacy.
- **Invite-only:** new accounts need an invite link (`?invite=CODE`, optional `&join=GROUP`), one use, 7 days, made by an admin in Settings. Existing users from before were let in automatically. Faris is admin. Admin dashboard (shield button) shows people, last active, Gemini use per day/person, daily AI limit, remove/restore access, delete accounts that signed up without an invite. It never shows money.
- Use "your" on the user's own dashboard; use the person's name only when viewing someone else's.
- Save type has an "Other" option with a box below for the purpose. Income has "Counts for: this month / next month" (default this month).
- Repeating items are reminders only (green → amber → red bar as the due day nears), never auto-added.
- Loans are separate from "left to spend" unless ticked; repayments in increments with a progress bar.
- Category is a dropdown (not a typed field) to avoid the keyboard autocorrect bar.
- BML transfer scanning: account last-4 digits decide direction (Faris is "Quraan sir" in other people's contacts; his account ends 5369). Receipts/tax invoices are one expense for the Grand Total; shop bank details on a receipt are not a transfer; notes list every item.
- Notifications (FCM) for bills, budgets, loans; chosen per person in Settings.
- Backups: Recently deleted (30 days); Back up button shares one JSON file (pick Drive on Android, Files on iPhone); reminder after 14 days. Restore replaces only the personal space.
- Sul is on iPhone: no share-target, no icon shortcuts, push only when installed to home screen (iOS 16.4+).

## Server functions (`functions/index.js`, region asia-south1)

- `dailyAlerts` (08:30 Indian/Maldives): bills/budgets/loans alerts via FCM (`alerts.js`).
- `testPush`, `gemini` (needs `access/{uid}`; daily per-person limit from `config/app.aiLimit` or 300; model chain gemini-3.8-flash → 3.7-flash → 3.5-flash → 3.5-flash-lite), `access` (invite redemption / grandfathering; refuses `revoked`), `admin` (overview, revoke, restore, makeAdmin, removeAdmin, deleteWaiting, setLimit).

## Testing

`tests/` has Playwright scenarios (`g1`–`g7`) and Firebase mocks (`tests/mockfb/`) served instead of the real gstatic SDK. The Firestore mock includes a small model of the security rules so tests catch writes the server would refuse. Each test prints ok/FAIL lines and exits non-zero on a failure.

    python3 -m http.server 8765          # in the repo root
    cd tests && NODE_PATH=$(npm root -g) node g1.js   # then g2 … g7, in order

`g1` seeds an old-style household and checks the migration; later tests chain on `pl_state*.json` in the temp folder. g1 migration · g2 second person, groups, view requests, view-only · g3 joining from a group link · g4 a new person through every page (entries, budgets, loans, bills, goals, settings, new group, wide/phone layout) · g5 invites · g6 admin · g7 trash, backup, CSV, backup reminder, chat confirm + Edit first, shortcuts.

## History

- October 2026: front-end overhaul. Same Firestore data, rules and functions; the single generated page became separate modules and pages with a side menu / tab bar. Behaviour changes worth knowing: in your own space and in groups you always add things as yourself (as before), the Gemini key/model now has its own Save button, and the old "top buttons show icons/words" setting went away with the top toolbar.

## Ideas not done yet

- Deep links from notifications to the right page (the server sends `APP_URL`; the app supports `#bills`, `#loans`, … if the functions add them).
