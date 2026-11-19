# Honey BD — Beekeeping Tracker

Offline, bilingual (English / বাংলা) beekeeping tracker for Bangladesh. Keep your hives,
inspections, honey harvests and expenses in one private place — no account, no server,
nothing leaves your device.

## Problem

Small beekeepers in Bangladesh track hives in notebooks or memory: which hive was
inspected, whether the queen was seen, how much honey each hive gave, and what the
feed and equipment cost. Lost notes mean missed inspections, weak colonies and
unexplained losses. Honey BD is a simple offline record book for that daily work.

## Features

- **Hives** — add, edit and delete hives: name, type (box / log / top-bar), location,
  start date, colony strength (weak / moderate / strong), status (active / queenless /
  inactive) and notes. Deleting a hive also removes its inspections and harvests.
- **Inspections** — per-hive log: date, queen seen (seen / not seen / not sure), brood
  level, honey stores, temperament, note and next-inspection due date (auto-suggested
  14 days after the inspection date).
- **Harvests** — per-hive honey log: date, kg harvested, price per kg (৳, entered by
  you), buyer; revenue is calculated automatically (kg × price).
- **Expenses** — date, category (feed/sugar, equipment, medicine, transport, other),
  amount (৳), note; totals by category.
- **Dashboard** — total hives, active hives, total honey (kg), total revenue, total
  expenses, net; inspections due within 7 days (including overdue and never-inspected
  hives); recent harvests; yield per hive (kg, revenue, harvest count).
- **Bilingual** — full English / বাংলা interface with Bengali digits, persisted
  across reloads.
- **Data** — JSON export (backup), strict JSON import (invalid files are rejected
  with your data intact), erase-all with typed `DELETE` confirmation.
- **Validation** — future dates rejected, harvest dates cannot predate the hive start,
  kg / price / amount ranges enforced, names length-limited.
- **Offline & private** — localStorage only; zero network requests.

## What it is not

- It ships **empty**: no hive, price or harvest data is included. Every number is
  yours, entered by you.
- It is a record book, not market advice: prices you enter are your own records.
- It does not identify bees, diagnose disease or replace an experienced beekeeper's
  judgement. Inspection labels (brood, stores, temperament) are your own observations.

## Stack

- Plain HTML + CSS + JavaScript (no framework, no build step, no dependencies)
- `localStorage` for persistence
- Node.js (tests only)

## Prerequisites

- Any modern browser (open `index.html`, or serve the folder with any static server)
- Node.js 18+ (only to run the tests)

## Install

```bash
git clone https://github.com/fahad3235/honey-bd.git
cd honey-bd
# no install step — open index.html in a browser
```

Or serve locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Usage

1. **Hives** tab — add each hive (name, type, start date, strength, status).
2. **Inspections** tab — after checking a hive, log what you saw; the next due date
   is suggested 14 days ahead.
3. **Harvest** tab — when you extract honey, log kg and the price per kg you got.
4. **Expenses** tab — log feed, equipment, medicine and transport costs.
5. **Dashboard** — see totals, which hives need inspecting, and which hive yields most.
6. **Data** tab — export a JSON backup regularly; import it to restore.

## Testing

```bash
node tests/test.js    # unit tests (logic, validation, stats, i18n)
node tests/smoke.mjs  # headless-Chrome UI smoke test (real browser, file://)
```

Results (2026-11-19): **122/122 unit tests pass, 55/55 smoke checks pass**,
0 console/page errors, 0 non-file network requests. See `TEST_RESULTS.md` for the
hand-verified scenario (Box 1: 12.5 kg × ৳850 = ৳10,625.00 revenue; ৳1,200.00 feed
expense; net ৳9,425.00).

## Deployment

Static site — any static host works. GitHub Pages: enable Pages on the `main`
branch (root) in the repository settings.

## Limitations

- Single device only: data lives in that browser's localStorage; use Export to move
  it to another device.
- No reminders/notifications: "due soon" is shown when you open the app.
- No cloud sync, no multi-user support.
- Amounts are stored as entered; currency is taka (৳) throughout.

## Status

Complete MVP (factory run #384, 2026-11-19). Working offline app with tests green.
