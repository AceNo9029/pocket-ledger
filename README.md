# Pocket Ledger

A household money tracker for two people: monthly income, spending, what's left, savings and savings goals, plus scanning of receipts and bank screenshots.

- Installs on Android, iPhone and computers from the browser (Install app).
- Works offline. Changes sync when you're back online.
- Data is stored in your own Firebase project and shared only with the people in your household.
- Scanning uses your own Gemini API key, which stays on each device.

## Files

| File | What it is |
|---|---|
| `index.html` | The app screens |
| `app.js` | Sign-in, household set-up and the connection to Firebase |
| `config.js` | Your Firebase project settings (not secret) |
| `sw.js`, `manifest.webmanifest`, `icons/` | What makes it installable and work offline |
| `firestore.rules` | Security rules to paste into Firebase › Firestore › Rules |

## Updating

Upload the changed files to this repository again. Open apps pick up the new version the next time they're opened with an internet connection.
