# Subscription Tracker

A small, single-page web app to track how much you spend each month on
recurring subscriptions. No backend, no install — your data lives in your
browser's `localStorage`.

## Run it

Open `index.html` in any modern browser. That's it.

If you want a local server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Features

- Add subscriptions with name, amount, billing cycle (weekly / monthly /
  quarterly / yearly), category, and next billing date.
- Live totals: monthly cost, yearly cost, active count, and what's due in
  the next 30 days.
- Per-category breakdown bar chart.
- Search, filter by category, and sort by name / monthly cost / next billing.
- Currency selector (USD, EUR, GBP, JPY, AUD, CAD, INR).
- Edit and delete entries.
- Export / Import your data as JSON (handy for backups or moving browsers).
- Past `nextDate` values are auto-rolled forward by one cycle on load.

## Files

- `index.html` — markup
- `styles.css` — dark theme styling
- `app.js` — all logic + `localStorage` persistence
