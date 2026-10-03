# Pocket Ledger: product requirements

## Why it exists
A household in the Maldives wants to know, at any moment, **how much is left to spend this month**, where the money went, and what's coming up, without the chore of typing everything in. Bank apps show transactions, not budgets; spreadsheets are too slow on a phone.

## Who it's for
- **Faris** (admin, Samsung S24 Ultra, Windows laptop) and **Sul** (iPhone, installed from Safari). They share some costs, keep some money private, and pass money between each other often (school fees from parents arrive in Sul's account).
- A few invited friends or family later. Invite-only.

## What good looks like
- Logging a payment takes **under 5 seconds** (Quick add from the +), or none (scan a slip, import a statement).
- Home answers "how much is left this month?" at a glance.
- Nothing is counted twice and nothing real is dropped: own-account moves are skipped, genuine repeats are kept.
- Feels alive and smooth on a 120 Hz phone; works offline; never loses data (Undo, Recently deleted, daily server backups, file backups).
- Private by default: your space is yours; groups share only what's put in them; only the person who added something can change it.

## Features (live)
- **Money:** income, spending, savings and withdrawals, savings goals, loans (lent/borrowed, repayments), bills and reminders (never auto-added), budgets with alerts, a dashboard with "left to spend", category breakdown (tap a category to see its entries and total).
- **Getting data in:** Quick add (number pad, most-used categories); scanning receipts, bank slips and screenshots with Gemini (check before adding); BML and MIB CSV statements read exactly; PDF statements via Gemini; Gemini chat by text or voice with one-tap confirm; share-to-app on Android.
- **Together:** private space plus groups; ask to view someone's dashboard; money sent between people with an approval card and a push notification; who-owes-whom and settle up.
- **Safety:** invite-only accounts, admin page (never shows money), app lock, Undo on deletes, Recently deleted (30 days), backups and restore.
- **Look and feel:** themes, light/dark/AMOLED, text size, motion presets, a floating dock with 4 or 6 tabs, vibrations; all in Settings › Appearance.
- **Alerts:** bills, budgets, loans, money sent to you (FCM push, per-person choices).

## Rules (decided with Faris)
See "Product rules" in `HANDOFF.md`. Highlights: dock is 4 or 6 tabs, never 5; repeating items are reminders only; loans stay out of "left to spend" unless ticked; category is a dropdown; dates are DD/MM/YYYY; never store more than the last 4 digits of an account.

## Not doing (for now)
- Connecting directly to bank accounts (no open-banking APIs in the Maldives).
- Multiple currencies per space beyond asking how much to record.
- Investment tracking or financial advice.

## Next
1. Notifications open the right page (bills, transfer card).
2. Month and year comparisons (last 3 months, the year so far).
3. Offline check on real phones.
4. Android app: a thin installable wrapper first; reading bank SMS only if it's worth Google's review.
