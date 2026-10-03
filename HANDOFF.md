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
- Daily Firestore backups are scheduled (7 days kept; checked 3 Oct 2026). The command, for reference:
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
| `js/gemini.js`, `js/scan.js`, `js/chat.js` | Gemini calls (server function or key), receipt/screenshot scanning and bank statement imports, chat with voice + one-tap confirm. |
| `js/motion.js`, `js/dock.js`, `js/quick.js` | Motion springs (time-based, follow the screen's refresh rate), the phone dock + side-menu highlight + More page, and Quick add from the + (see Navigation). |
| `js/transfers.js` | Money sent between people in a shared group: send sheet, approval cards. |
| `js/lock.js`, `js/notify.js`, `js/backup.js`, `js/util.js` | App lock, push notifications + callable helper, backup/restore/reminder, small helpers. |
| `sw.js` | Service worker: network-first cache, share-target, push. **Bump `VERSION` (`pl-vNN`) on every release** and add any new file to `SHELL`. Latest: `pl-v24`. `index.html` loads `app.js?v=NN` and `css/app.css?v=NN`: bump those numbers too, so phones never mix a new page with old cached files (that caused a blank page after the first overhaul release). |
| `manifest.webmanifest`, `icons/` | PWA manifest (share_target, shortcuts) and icons. |
| `firestore.rules` | Security rules (see below). |
| `functions/` | Cloud Functions: `index.js`, `alerts.js`, `package.json` (Node 22, firebase-admin 13, firebase-functions 6). |
| `firebase.json`, `.firebaserc` | Firebase CLI config. |
| `tests/` | Playwright scenarios + Firebase mocks (see Testing). |

The old patch-on-patch build (`source/base`, `source/build`) was retired in the October 2026 overhaul; that folder can be deleted.

## Navigation

- **Phones (under 900px): a floating dock** (`js/dock.js`). The + sits in the middle; tabs are **always 4 or 6, never 5** (Faris's rule, for symmetry). 4 = three chosen pages + More (default Home, Entries | Bills, More); 6 = every page, no More. 6 is only offered when each tab still gets 46px (about 374px wide or more). Rounded corners only (squircle was tried and dropped).
- The dock's highlight is a liquid spring: tap, or hold and slide across to scrub. It tucks away slightly while scrolling down. Bills count / Settings dot show on the dock, or on More when that page is hidden there. More (`#more`) lists the pages not in the dock, plus Admin for admins.
- **The +:** tap = Quick add (`js/quick.js`): number pad, Spent/Income, most-used categories first, Today (tap to change the date), optional note, "More options" opens the full Entries form filled in. Adds as you, with Undo. Hold the + = Scan / Type it / Voice.
- **Wide screens (900px+):** side menu, with the same liquid highlight moving vertically. No dock.
- **Deleting** entries, reminders and goals is instant with an **Undo** button in the toast (no "Are you sure?"); Undo also removes the Recently deleted copy, and for goals puts the savings back on the goal. `toast(msg, {action, onAction})` in util.js.
- **Settings › Appearance holds all look-and-feel** (keep it that way): mode, theme, text size, AMOLED, motion preset (Calm / Lively default / Jelly), dock tabs (4/6 + which pages), little vibrations (default on), measured refresh rate. Motion settings are per device in localStorage `pl-motion`.
- **Smoothness rules:** animate transform/opacity only; springs run on real elapsed time in small fixed slices (`Spring.run(dt)`), so 60/90/120/144 Hz all look the same and use every frame; CSS transitions use the same spring as a `linear()` easing (`--spring-ease`, `--grow-dur`); scroll listeners are passive; `prefers-reduced-motion` keeps things short. Vibrations only fire after the user has touched the page.
- Header on each page: page title, month switcher (Home, Entries), space chips (Me / groups / dashboards shared with you), and in groups the "You / Sul / All of <group>" switch.
- The chat button floats on every page (above the dock on phones). Scan opens a sheet from Home, Entries, the + (hold), the share sheet or the icon shortcut.

## Data model (Firestore)

- `users/{uid}`: `personal` (id of their private space), `spaces[]` (group ids), `name`, `email`, `tokens[]` (FCM), `notify {bills, budgets, loans, transfers}`, `lastSeen`. Legacy: `household`.
- `households/{id}` = a **space**. `type: "personal" | "group"`, `owner`, `members[]`, `viewers[]` (people allowed to view a personal space), group `name`, `names {uid: name}`, `colors {uid: hex}`, `joinUntil` (ms; invite link open until), `settings {currency, opening, openingBy {uid}, people [...] (personal only), budgets {all|uid: {category: limit}}}`, `ai {server}`, `gemini {key}` (legacy), `alertState`. Legacy fields kept on the converted old household: `personOf {uid: "p1"|"p2"}`, `legacy` (old settings).
  - Subcollections: `entries`, `goals`, `loans`, `recurring`, `settlements`, `trash`; groups also have `transfers`, personal spaces `transfersSeen`. Every doc has `author` (uid of who added it).
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
- **Invite-only:** new accounts need an invite link (`?invite=CODE`, optional `&join=GROUP`), one use, 7 days, made by an admin in Settings. Existing users from before were let in automatically. Faris is admin. Admin page (side menu on wide screens, Settings › Account on phones) shows people, last active, Gemini use per day/person, daily AI limit, remove/restore access, delete accounts that signed up without an invite. It never shows money.
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
- `notifyTransfer` (callable): push to the receiver when someone records money sent to them; checks the caller is the sender and both are in the group.
- `testPush`, `gemini` (needs `access/{uid}`; daily per-person limit from `config/app.aiLimit` or 300; model chain gemini-3.8-flash → 3.7-flash → 3.5-flash → 3.5-flash-lite), `access` (invite redemption / grandfathering; refuses `revoked`), `admin` (overview, revoke, restore, makeAdmin, removeAdmin, deleteWaiting, setLimit).

## Testing

`tests/` has Playwright scenarios (`g1`–`g7`) and Firebase mocks (`tests/mockfb/`) served instead of the real gstatic SDK. The Firestore mock includes a small model of the security rules so tests catch writes the server would refuse. Each test prints ok/FAIL lines and exits non-zero on a failure.

    python3 -m http.server 8765          # in the repo root
    cd tests && NODE_PATH=$(npm root -g) node g1.js   # then g2 … g10, in order

`g1` seeds an old-style household and checks the migration; later tests chain on `pl_state*.json` in the temp folder. g1 migration · g2 second person, groups, view requests, view-only · g3 joining from a group link · g4 a new person through every page (entries, budgets, loans, bills, goals, settings, new group, wide/phone layout) · g5 invites · g6 admin · g7 trash, backup, CSV, backup reminder, chat confirm + Edit first, shortcuts · g8 bank statement import + Undo + bank accounts list (made-up data) · g9 money sent between people · g10 dock (4/6 tabs, scrub, More), Quick add + Undo, hold-the-+ shortcuts, goal Undo, Settings › Appearance, laptop side highlight.

## History

- October 2026: front-end overhaul. Same Firestore data, rules and functions; the single generated page became separate modules and pages with a side menu / tab bar. Behaviour changes worth knowing: in your own space and in groups you always add things as yourself (as before), the Gemini key/model now has its own Save button, and the old "top buttons show icons/words" setting went away with the top toolbar.
- October 2026 (pl-v24): the dock, Quick add, Undo instead of confirmations, motion settings in Appearance.

## Bank statements (added Oct 2026)

- Entries page › "Import a bank statement (PDF or CSV)", Settings › Backup, or share a PDF/CSV to the app (Android). Only in your own space (Me).
- BML CSV exports are read directly in `scan.js` (`bmlRows`), no Gemini. PDFs and other banks' CSVs go to Gemini (`statementPrompt`, PDF sent as `application/pdf`).
- Every row becomes Spent or Income straight away (no check screen, by Faris's choice). Skipped: rows already in Pocket Ledger (same bank reference, or same type + amount within 2 days, one-to-one) and moves between your own accounts (the name on your bank account, the statement holder's name, or the other side's account ending in one of your last-4 digits).
- Categories: your past choices for that shop first, then one Gemini call for the rest, then simple keyword rules.
- Imported entries carry `source: "statement"`, `importId`, `importLabel` and the bank `ref`; Undo (in the summary or Settings › Backup) deletes that batch for good.
- Settings › Your details has a list of bank accounts (bank, nickname, last 4). Stored as `people[0].accounts`; `acct` is kept as the comma list of last-4s for scanning.
- Tested by `tests/g8.js` with made-up data. Never commit a real statement: the repo is public.

## Money sent between people (added Oct 2026)

- Entries page › "Send money to someone in your group" (`js/transfers.js`). It only records a transfer; it doesn't move money.
- The sender writes `households/{group}/transfers/{id}` `{from, fromName, to, toName, amount, date, note, created, author}`. "On your side": not counted, or an expense in the sender's own space (`xfer-out-{group}-{id}`).
- The receiver's app finds transfers `to == me` in their groups and shows a card on every page: edit note, category (or "don't count it"), date, then Accept (income `xfer-{group}-{id}` in their own space) or Decline. Answers are kept in `transfersSeen/{group}_{id}` in their own space, so cards don't come back. Nothing is added to the group's own entries.
- Everyone in that group can read its transfers (amount and remark).
- Statement imports skip the bank's copy of an accepted transfer (same amount within 2 days).
- Push: `notifyTransfer`, per-person setting `notify.transfers` (Settings › Notifications › Money sent to you). Needs `firebase deploy --only functions` plus the one-time `add-iam-policy-binding notifytransfer …` command above (new callable).

## Ideas not done yet

- Deep links from notifications to the right page (the server sends `APP_URL`; the app supports `#bills`, `#loans`, … if the functions add them).
