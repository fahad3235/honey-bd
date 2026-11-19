/* Honey BD \u2014 node unit tests. Run: node tests/test.js */
'use strict';
const L = require('../js/logic.js');
const DATA = require('../js/data.js');
const I18N = require('../js/i18n.js');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' \u2014 ' + extra : '')); }
}
function eq(name, a, b) { check(name, a === b, 'got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b)); }

/* ---- option lists ---- */
eq('3 hive types', DATA.HIVE_TYPES.length, 3);
eq('3 strengths', DATA.STRENGTHS.length, 3);
eq('3 statuses', DATA.STATUSES.length, 3);
eq('3 queen options', DATA.QUEEN.length, 3);
eq('4 brood options', DATA.BROOD.length, 4);
eq('3 stores options', DATA.STORES.length, 3);
eq('3 temperament options', DATA.TEMPERAMENT.length, 3);
eq('5 expense categories', DATA.EXPENSE_CATEGORIES.length, 5);

/* ---- dates ---- */
check('parse rejects 2026-02-30', L.parseISODate('2026-02-30') === null);
check('parse rejects garbage', L.parseISODate('tomorrow') === null);
check('parse rejects short year', L.parseISODate('26-11-19') === null);
check('parse accepts leap day', L.parseISODate('2028-02-29') !== null);
eq('daysBetween 6', L.daysBetween('2026-11-19', '2026-11-25'), 6);
eq('daysBetween negative', L.daysBetween('2026-11-25', '2026-11-19'), -6);
eq('daysBetween bad = null', L.daysBetween('2026-02-30', '2026-11-19'), null);
eq('addDays +14', L.addDays('2026-11-15', 14), '2026-11-29');
eq('addDays month rollover', L.addDays('2026-11-25', 14), '2026-12-09');
eq('addDays negative', L.addDays('2026-11-19', -7), '2026-11-12');
eq('addDays bad = null', L.addDays('junk', 14), null);
eq('suggestNextDue', L.suggestNextDue('2026-11-15'), '2026-11-29');
check('isFuture true', L.isFuture('2026-11-20', '2026-11-19'));
check('isFuture false same day', !L.isFuture('2026-11-19', '2026-11-19'));
check('isFuture false past', !L.isFuture('2026-11-18', '2026-11-19'));

/* ---- formatting ---- */
eq('formatNum bn', L.formatNum(12345, 'bn'), '\u09e7\u09e8\u09e9\u09ea\u09eb');
eq('formatNum en', L.formatNum(12345, 'en'), '12345');
eq('formatNum kg decimal', L.formatNum(12.5, 'en'), '12.5');
eq('formatNum kg bn decimal', L.formatNum(12.5, 'bn'), '\u09e7\u09e8.\u09eb');
eq('formatMoney en', L.formatMoney(10625, 'en'), '\u09f310,625.00');
eq('formatMoney en small', L.formatMoney(850.5, 'en'), '\u09f3850.50');
eq('formatMoney bn', L.formatMoney(10625, 'bn'), '\u09f3\u09e7\u09e6,\u09ec\u09e8\u09eb.\u09e6\u09e6');
eq('formatMoney zero', L.formatMoney(0, 'en'), '\u09f30.00');
eq('formatMoney negative', L.formatMoney(-9425, 'en'), '\u09f3-9,425.00');
eq('toBnDigits', L.toBnDigits('2026-11-19'), '\u09e8\u09e6\u09e8\u09ec-\u09e7\u09e7-\u09e7\u09ef');
eq('round2', L.round2(10.625), 10.63);
check('uid has prefix', L.uid('h').startsWith('h-'));

/* ---- fixture ---- */
const HIVES = [
  { id: 'h1', name: 'Box 1', type: 'box', location: 'Home yard', started: '2026-09-01', strength: 'strong', status: 'active', note: '' },
  { id: 'h2', name: 'Log 1', type: 'log', location: '', started: '2026-10-01', strength: 'moderate', status: 'queenless', note: '' },
  { id: 'h3', name: 'Top-bar 1', type: 'topbar', location: '', started: '2026-10-15', strength: 'weak', status: 'inactive', note: '' },
];
const ASOF = '2026-11-19';
const fixture = {
  v: 1, lang: 'en', hives: HIVES,
  inspections: [
    { id: 'i1', hiveId: 'h1', date: '2026-11-15', queen: 'seen', brood: 'good', stores: 'full', temperament: 'calm', nextDue: '2026-11-29', note: '' },
    { id: 'i2', hiveId: 'h2', date: '2026-11-10', queen: 'not-seen', brood: 'low', stores: 'low', temperament: 'normal', nextDue: '2026-11-18', note: 'no queen' },
  ],
  harvests: [
    { id: 'v1', hiveId: 'h1', date: '2026-11-10', kg: 12.5, pricePerKg: 850, buyer: 'Local market' },
    { id: 'v2', hiveId: 'h1', date: '2026-10-20', kg: 8, pricePerKg: 800, buyer: '' },
    { id: 'v3', hiveId: 'h2', date: '2026-11-05', kg: 4.25, pricePerKg: 900, buyer: 'Neighbour' },
  ],
  expenses: [
    { id: 'e1', date: '2026-11-05', category: 'feed', amount: 1200, note: 'sugar' },
    { id: 'e2', date: '2026-11-12', category: 'equipment', amount: 3500, note: 'smoker' },
    { id: 'e3', date: '2026-11-15', category: 'feed', amount: 800, note: '' },
  ],
};

/* ---- hive validation ---- */
check('hive ok', L.validateHive(HIVES[0], ASOF).length === 0);
check('hive empty name', L.validateHive({ ...HIVES[0], name: '  ' }, ASOF).length === 1);
check('hive long name', L.validateHive({ ...HIVES[0], name: 'x'.repeat(61) }, ASOF).length === 1);
check('hive bad type', L.validateHive({ ...HIVES[0], type: 'skep' }, ASOF).length === 1);
check('hive future started', L.validateHive({ ...HIVES[0], started: '2026-11-20' }, ASOF).length === 1);
check('hive bad started', L.validateHive({ ...HIVES[0], started: '2026-02-30' }, ASOF).length === 1);
check('hive bad strength', L.validateHive({ ...HIVES[0], strength: 'huge' }, ASOF).length === 1);
check('hive bad status', L.validateHive({ ...HIVES[0], status: 'lost' }, ASOF).length === 1);
check('hive long location', L.validateHive({ ...HIVES[0], location: 'x'.repeat(81) }, ASOF).length === 1);
check('hive long note', L.validateHive({ ...HIVES[0], note: 'x'.repeat(201) }, ASOF).length === 1);
check('hive non-object', L.validateHive(null, ASOF).length === 1);

/* ---- inspection validation ---- */
const goodInsp = { id: 'i9', hiveId: 'h1', date: '2026-11-15', queen: 'seen', brood: 'good', stores: 'ok', temperament: 'calm', nextDue: '2026-11-29', note: '' };
check('inspection ok', L.validateInspection(goodInsp, HIVES, ASOF).length === 0);
check('inspection missing hive', L.validateInspection({ ...goodInsp, hiveId: 'h9' }, HIVES, ASOF).length === 1);
check('inspection future date', L.validateInspection({ ...goodInsp, date: '2026-11-20' }, HIVES, ASOF).length === 1);
check('inspection before hive start', L.validateInspection({ ...goodInsp, date: '2026-08-31' }, HIVES, ASOF).length === 1);
check('inspection bad queen', L.validateInspection({ ...goodInsp, queen: 'maybe' }, HIVES, ASOF).length === 1);
check('inspection bad brood', L.validateInspection({ ...goodInsp, brood: 'tons' }, HIVES, ASOF).length === 1);
check('inspection bad stores', L.validateInspection({ ...goodInsp, stores: 'empty' }, HIVES, ASOF).length === 1);
check('inspection bad temp', L.validateInspection({ ...goodInsp, temperament: 'wild' }, HIVES, ASOF).length === 1);
check('inspection nextDue before date', L.validateInspection({ ...goodInsp, nextDue: '2026-11-14' }, HIVES, ASOF).length === 1);
check('inspection nextDue too far', L.validateInspection({ ...goodInsp, nextDue: '2027-03-01' }, HIVES, ASOF).length === 1);
check('inspection nextDue same day ok', L.validateInspection({ ...goodInsp, nextDue: '2026-11-15' }, HIVES, ASOF).length === 0);

/* ---- harvest validation ---- */
const goodHarv = { id: 'v9', hiveId: 'h1', date: '2026-11-10', kg: 12.5, pricePerKg: 850, buyer: '' };
check('harvest ok', L.validateHarvest(goodHarv, HIVES, ASOF).length === 0);
check('harvest missing hive', L.validateHarvest({ ...goodHarv, hiveId: 'h9' }, HIVES, ASOF).length === 1);
check('harvest future date', L.validateHarvest({ ...goodHarv, date: '2026-11-20' }, HIVES, ASOF).length === 1);
check('harvest zero kg', L.validateHarvest({ ...goodHarv, kg: 0 }, HIVES, ASOF).length === 1);
check('harvest negative kg', L.validateHarvest({ ...goodHarv, kg: -2 }, HIVES, ASOF).length === 1);
check('harvest kg over cap', L.validateHarvest({ ...goodHarv, kg: 501 }, HIVES, ASOF).length === 1);
check('harvest kg at cap ok', L.validateHarvest({ ...goodHarv, kg: 500 }, HIVES, ASOF).length === 0);
check('harvest negative price', L.validateHarvest({ ...goodHarv, pricePerKg: -1 }, HIVES, ASOF).length === 1);
check('harvest free price ok', L.validateHarvest({ ...goodHarv, pricePerKg: 0 }, HIVES, ASOF).length === 0);
check('harvest long buyer', L.validateHarvest({ ...goodHarv, buyer: 'x'.repeat(61) }, HIVES, ASOF).length === 1);

/* ---- expense validation ---- */
const goodExp = { id: 'e9', date: '2026-11-05', category: 'feed', amount: 1200, note: '' };
check('expense ok', L.validateExpense(goodExp, ASOF).length === 0);
check('expense future date', L.validateExpense({ ...goodExp, date: '2026-11-20' }, ASOF).length === 1);
check('expense bad category', L.validateExpense({ ...goodExp, category: 'rent' }, ASOF).length === 1);
check('expense zero amount', L.validateExpense({ ...goodExp, amount: 0 }, ASOF).length === 1);
check('expense negative amount', L.validateExpense({ ...goodExp, amount: -5 }, ASOF).length === 1);
check('expense over cap', L.validateExpense({ ...goodExp, amount: 10000001 }, ASOF).length === 1);
check('expense bad date', L.validateExpense({ ...goodExp, date: 'soon' }, ASOF).length === 1);

/* ---- stats ---- */
const stats = L.computeStats(fixture, ASOF);
eq('stats totalHives', stats.totalHives, 3);
eq('stats activeHives', stats.activeHives, 1);
eq('stats totalKg', stats.totalKg, 24.75);
eq('stats totalRevenue', stats.totalRevenue, 20850);
eq('stats totalExpenses', stats.totalExpenses, 5500);
eq('stats net', stats.net, 15350);
eq('stats feed total', stats.byCategory.feed, 2000);
eq('stats equipment total', stats.byCategory.equipment, 3500);
eq('perHive length', stats.perHive.length, 3);
eq('perHive first is Box 1', stats.perHive[0].name, 'Box 1');
eq('perHive Box 1 kg', stats.perHive[0].kg, 20.5);
eq('perHive Box 1 revenue', stats.perHive[0].revenue, 17025);
eq('perHive Box 1 count', stats.perHive[0].count, 2);
eq('perHive Log 1 kg', stats.perHive[1].kg, 4.25);
eq('perHive Top-bar kg', stats.perHive[2].kg, 0);
eq('harvestRevenue 12.5x850', L.harvestRevenue({ kg: 12.5, pricePerKg: 850 }), 10625);
eq('harvestRevenue rounding', L.harvestRevenue({ kg: 0.1, pricePerKg: 333.33 }), 33.33);

const emptyStats = L.computeStats(L.emptyState(), ASOF);
eq('empty stats totalKg', emptyStats.totalKg, 0);
eq('empty stats net', emptyStats.net, 0);
eq('empty stats perHive', emptyStats.perHive.length, 0);

/* ---- inspections due ---- */
const due = L.inspectionsDue(fixture, ASOF);
eq('due count', due.length, 1);
eq('due first is Log 1 (overdue)', due[0].name, 'Log 1');
eq('due Log 1 daysLeft', due[0].daysLeft, -1);
check('due excludes Box 1 (nextDue 11-29)', !due.some((d) => d.name === 'Box 1'));
check('due excludes inactive Top-bar 1', !due.some((d) => d.name === 'Top-bar 1'));
const dueWide = L.inspectionsDue(fixture, ASOF, 14);
eq('due wide count', dueWide.length, 2);
eq('due wide first overdue', dueWide[0].name, 'Log 1');
const neverState = { ...L.emptyState(), hives: [HIVES[0]] };
const dueNever = L.inspectionsDue(neverState, ASOF);
eq('never-inspected due count', dueNever.length, 1);
check('never-inspected flag', dueNever[0].neverInspected === true);
eq('never-inspected nextDue null', dueNever[0].nextDue, null);
eq('empty due count', L.inspectionsDue(L.emptyState(), ASOF).length, 0);

/* ---- recent harvests ---- */
const recent = L.recentHarvests(fixture, 2);
eq('recent length', recent.length, 2);
eq('recent newest first', recent[0].id, 'v1');
eq('recent second', recent[1].id, 'v3');

/* ---- i18n parity ---- */
const enKeys = Object.keys(I18N.I18N.en).sort();
const bnKeys = Object.keys(I18N.I18N.bn).sort();
eq('i18n key parity', JSON.stringify(bnKeys), JSON.stringify(enKeys));
check('no empty strings', enKeys.every((k) => I18N.I18N.en[k].length > 0) && bnKeys.every((k) => I18N.I18N.bn[k].length > 0));
check('t falls back to key', I18N.t('bn', 'nonexistent-key-xyz') === 'nonexistent-key-xyz');
eq('optName typeBox en', I18N.optName('en', 'type', 'box'), 'Box hive');
eq('optName typeBox bn', I18N.optName('bn', 'type', 'box'), '\u09ac\u09be\u0995\u09cd\u09b8 \u09ae\u09cc\u099a\u09be\u0995');
eq('optName queenNotSeen en', I18N.optName('en', 'queen', 'not-seen'), 'Not seen');
eq('optName catFeed bn', I18N.optName('bn', 'cat', 'feed'), '\u0996\u09be\u09ac\u09be\u09b0 / \u099a\u09bf\u09a8\u09bf');
eq('optName storesOk en', I18N.optName('en', 'stores', 'ok'), 'OK');
eq('optName tempAggressive bn', I18N.optName('bn', 'temp', 'aggressive'), '\u0986\u0995\u09cd\u09b0\u09ae\u09a3\u09be\u09a4\u09cd\u09ae\u0995');
check('bn appTitle is Bengali', I18N.I18N.bn.appTitle === '\u09b9\u09be\u09a8\u09bf \u09ac\u09bf\u09a1\u09bf');

/* ---- state validation ---- */
check('valid state passes', L.validateState(fixture, ASOF).length === 0);
check('empty state passes', L.validateState(L.emptyState(), ASOF).length === 0);
const badStates = [
  null, [], { v: 2 }, { v: 1, lang: 'fr', hives: [], inspections: [], harvests: [], expenses: [] },
  { v: 1, lang: 'en', hives: 'x', inspections: [], harvests: [], expenses: [] },
  { v: 1, lang: 'en', hives: [{ ...HIVES[0], type: 'skep' }], inspections: [], harvests: [], expenses: [] },
  { v: 1, lang: 'en', hives: [HIVES[0], { ...HIVES[0] }], inspections: [], harvests: [], expenses: [] },
  { v: 1, lang: 'en', hives: HIVES, inspections: [{ ...goodInsp, hiveId: 'h9' }], harvests: [], expenses: [] },
  { v: 1, lang: 'en', hives: HIVES, inspections: [], harvests: [{ ...goodHarv, kg: 0 }], expenses: [] },
  { v: 1, lang: 'en', hives: HIVES, inspections: [], harvests: [], expenses: [{ ...goodExp, amount: -1 }] },
  { v: 1, lang: 'en', hives: HIVES, inspections: [], harvests: [], expenses: [], extra: 1 },
];
check('9 bad states rejected', badStates.slice(0, 9).every((s) => L.validateState(s, ASOF).length > 0));
check('extra key tolerated', L.validateState(badStates[10], ASOF).length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed.');
process.exit(fail ? 1 : 0);
