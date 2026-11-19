# Test results — Honey BD (2026-11-19, ?asof=2026-11-19)

## Unit tests — `node tests/test.js`
**122 passed, 0 failed.**

- Option lists: 3 hive types, 3 strengths, 3 statuses, 3 queen / 4 brood / 3 stores /
  3 temperament options, 5 expense categories.
- Dates: invalid dates rejected (2026-02-30, garbage, short year); leap day accepted;
  daysBetween/addDays/suggestNextDue (+14 days) verified, including month rollover.
- Formatting: Bengali digits (12345 → ১২৩৪৫), money ৳10,625.00 / ৳১০,৬২৫.০০,
  negative money, round2.
- Validation: hive (name/type/started/strength/status/location/note), inspection
  (missing hive, future date, before hive start, each enum, nextDue before date and
  >90 days out), harvest (missing hive, future date, kg 0/negative/>500, price
  negative, long buyer), expense (future date, bad category, amount 0/negative/>cap).
- Stats on a 3-hive fixture: 24.75 kg total, ৳20,850.00 revenue, ৳5,500.00 expenses,
  net ৳15,350.00; per-hive yield sorted (Box 1: 20.5 kg, ৳17,025.00, 2 harvests).
- Inspections due: overdue Log 1 (nextDue 2026-11-18, −1 day) flagged; Box 1
  (nextDue 2026-11-29) excluded in the 7-day window, included in the 14-day window;
  inactive hives excluded; never-inspected hive flagged with nextDue null.
- i18n: EN/BN key parity, no empty strings, fallback to key, optName mapping for
  type/queen/category/stores/temperament in both languages.
- State: valid + empty states pass; 9 bad states rejected (bad version, lang, array
  types, invalid hive, duplicate hive id, dangling inspection/harvest/expense refs);
  extra keys tolerated.

## Headless-Chrome smoke test — `node tests/smoke.mjs`
**55 passed, 0 failed. 0 console/page errors. 0 non-file network requests.**
(raw CDP, headless_shell-1187, file://, ?asof=2026-11-19; 1440px and 390px)

Hand-verified scenario in the real UI:
- Fresh load: dashboard zeros, empty-state messages, yield table empty.
- Empty hive name rejected: error shown, field marked invalid, still 0 hives.
- Added hive "Box 1" (box, Home yard, started 2026-09-01, strong, active):
  stats hives 1, active 1; dashboard flags "Never inspected — due now".
- Added inspection 2026-11-15 (queen seen, brood good, stores full, calm,
  next due 2026-11-29): due list clears.
- Added harvest 2026-11-10: 12.5 kg × ৳850 = ৳10,625.00 (list shows "10,625.00");
  stats kg 12.5, revenue ৳10,625.00; yield table shows Box 1.
- Added expense 2026-11-05: feed ৳1,200.00; stats expenses ৳1,200.00,
  net ৳9,425.00.
- বাংলা toggle: h1 + stats render in Bengali digits (hives ১); persists across reload;
  hive data persists; toggled back to English.
- Data tab: bad import ({"v":9}) rejected, harvest data intact; export shows backup
  containing "Box 1"; good import replaces state with "Log 2" hive; typed-DELETE
  erase restores 0 hives.
- 390px: no horizontal overflow on Dashboard, Hives, Inspections, Harvest,
  Expenses or Data tabs.

## Repairs during this run
- 1 test-expectation bug (recent-harvest order: v3 precedes v2 by date) — fixed in
  the test, not the app.
- 1 test-index bug (extra-key state is index 10, not 9) — fixed in the test.
- No app bugs found by either suite.
