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

## Files in the repo root (what's deployed)

| File | What it is |
|---|---|
| `index.html` | The whole app UI and logic (one big classic script). **Generated** by the build in `source/` — don't hand-edit. |
| `app.js` | ES module: sign-in gate, invite-only check, migration, spaces/groups loading, then calls `window.PL.boot(...)`. |
| `config.js` | Firebase web config. |
| `sw.js` | Service worker: network-first cache, share-target, push. **Bump `VERSION` (`pl-vNN`) on every release.** Latest: `pl-v19`. |
| `manifest.webmanifest`, `icons/` | PWA manifest (share_target, shortcuts) and icons. |
| `firestore.rules` | Security rules (see below). |
| `functions/` | Cloud Functions: `index.js`, `alerts.js`, `package.json` (Node 22, firebase-admin 13, firebase-functions 6). |
| `firebase.json`, `.firebaserc` | Firebase CLI config. |

## How `index.html` is built (current, to be replaced by the overhaul)

The app started as a Windows desktop app. `source/base/index.html` is that original page. `source/build/build.py` reads it, applies many exact-string replacements (`rep()` asserts each match occurs once), injects the JS modules below, then runs the `*_build.py` patch files in order. It writes `index.html`.

- Injected JS, in order: `gemini.js`, `scan.js` (from `source/base/`, with `srep` patches), `features.js`, `chat.js`, `polish.js`, `v10.js`, `notify.js`, `groups.js`, `admin.js`, `backup.js`, `boot.js`. `backend.js` replaces the old file backend.
- Patch files run in order: `themes_build.py`, `chat_build.py`, `features_build.py`, `polish_build.py`, `v10_build.py`, `notify_build.py`, `groups_build.py`, `admin_build.py`, `backup_build.py`.
- `build.py` uses absolute paths from the old workspace (`/home/claude/app/web/index.html`, `/home/claude/web2/scan.js`, `/home/claude/pl-app/...`). Adjust paths if you need to run it.
- Many functions are reassigned to wrap behaviour (`render = (o => function(){...})(render)`, same for `renderLedger`, `normalize`, `renderFormBits`, etc.). This layering is why an overhaul is planned.

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

`source/tests/` has Playwright scripts (`g1`–`g7`) and Firebase mocks (`mockfb/`) that are served instead of the real gstatic SDK. The Firestore mock includes a small model of the security rules so tests catch writes the server would refuse. Run a local server on port 8765 in the repo root, then `NODE_PATH=$(npm root -g) node g1.js` etc. `g1` seeds an old-style household and checks the migration; later tests chain on `/tmp/g_state*.json` produced by earlier ones.

## Next: the overhaul (agreed plan)

Rebuild the front end cleanly, keeping the same Firestore data, rules and functions so nobody loses anything.

- Split the single long page into pages: **Home** (dashboard), **Entries**, **Loans**, **Bills**, **Goals**, **Settings** (with Groups, Privacy, Invites, Recently deleted inside), plus the admin page for admins. The chat button floats on every page.
- Navigation: a **vertical side menu on wide screens** (laptop) and a **bottom tab bar on phones**.
- Replace the patch-on-patch build with proper separate source files (plain JS modules are fine; keep it a static site on GitHub Pages).
- Keep every feature and rule listed above; re-run the scenarios in `source/tests` against the new UI.
- Ship carefully: bump `sw.js` VERSION; Faris and Sul should close and reopen the app after each release.
