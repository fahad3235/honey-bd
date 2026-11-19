/* Honey BD \u2014 pure logic (no DOM). Node-testable.
 * All date math is UTC calendar math on YYYY-MM-DD strings so results
 * do not depend on the viewer's timezone. Money is integer paisa-free
 * taka with up to 2 decimals; kg allows up to 2 decimals. */
'use strict';

const MAX_NAME_LEN = 60;
const MAX_NOTE_LEN = 200;
const MAX_LOCATION_LEN = 80;
const MAX_ITEMS = 500;          /* import cap per collection */
const MAX_KG = 500;             /* single harvest, kg */
const MAX_PRICE_PER_KG = 100000; /* taka per kg */
const MAX_AMOUNT = 10000000;    /* single expense, taka */
const INSPECTION_INTERVAL_DAYS = 14; /* suggested gap between inspections */
const DUE_WINDOW_DAYS = 7;      /* "due soon" window for dashboard */
const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/* ---------- dates ---------- */
function parseISODate(s) {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
function isValidDateStr(s) { return parseISODate(s) !== null; }
function todayISO(asof) {
  if (asof && isValidDateStr(asof)) return asof;
  const n = new Date();
  return n.getUTCFullYear() + '-' + String(n.getUTCMonth() + 1).padStart(2, '0') + '-' + String(n.getUTCDate()).padStart(2, '0');
}
function toISODate(dt) {
  return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
}
function daysBetween(a, b) {
  const da = parseISODate(a), db = parseISODate(b);
  if (!da || !db) return null;
  return Math.round((db - da) / 86400000);
}
function addDays(dateStr, n) {
  const d = parseISODate(dateStr);
  if (!d) return null;
  return toISODate(new Date(d.getTime() + n * 86400000));
}
function isFuture(dateStr, asOf) {
  const d = daysBetween(asOf, dateStr);
  return d !== null && d > 0;
}

/* ---------- numbers / formatting ---------- */
function toBnDigits(s) {
  return String(s).replace(/[0-9]/g, (c) => BN_DIGITS[+c]);
}
function formatNum(n, lang) {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  const s = String(Math.round(n * 100) / 100);
  return lang === 'bn' ? toBnDigits(s) : s;
}
function groupThousands(intPart) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function formatMoney(n, lang) {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  const fixed = (Math.round(n * 100) / 100).toFixed(2);
  const parts = fixed.split('.');
  const grouped = groupThousands(parts[0]) + '.' + parts[1];
  const out = '\u09f3' + grouped;
  return lang === 'bn' ? toBnDigits(out) : out;
}
function round2(n) { return Math.round(n * 100) / 100; }

/* ---------- ids ---------- */
function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
}

/* ---------- validation ---------- */
function checkName(v, errors) {
  if (typeof v !== 'string' || v.trim().length === 0) errors.push('name-required');
  else if (v.trim().length > MAX_NAME_LEN) errors.push('name-too-long');
}
function checkDateField(v, asOf, errors, codeBad, codeFuture) {
  if (!isValidDateStr(v)) errors.push(codeBad);
  else if (isFuture(v, asOf)) errors.push(codeFuture);
}
function validateHive(h, asOf) {
  const errors = [];
  if (!isPlainObject(h)) return ['not-object'];
  checkName(h.name, errors);
  if (!['box', 'log', 'topbar'].includes(h.type)) errors.push('type-invalid');
  if (typeof h.location !== 'string' || h.location.length > MAX_LOCATION_LEN) errors.push('location-too-long');
  checkDateField(h.started, asOf, errors, 'started-invalid', 'started-future');
  if (!['weak', 'moderate', 'strong'].includes(h.strength)) errors.push('strength-invalid');
  if (!['active', 'queenless', 'inactive'].includes(h.status)) errors.push('status-invalid');
  if (typeof h.note !== 'string' || h.note.length > MAX_NOTE_LEN) errors.push('note-too-long');
  return errors;
}
function validateInspection(ins, hives, asOf) {
  const errors = [];
  if (!isPlainObject(ins)) return ['not-object'];
  const hive = Array.isArray(hives) ? hives.find((x) => x.id === ins.hiveId) : null;
  if (!hive) errors.push('hive-missing');
  checkDateField(ins.date, asOf, errors, 'date-invalid', 'date-future');
  if (hive && isValidDateStr(ins.date) && daysBetween(hive.started, ins.date) < 0) errors.push('date-before-hive-start');
  if (!['seen', 'not-seen', 'unsure'].includes(ins.queen)) errors.push('queen-invalid');
  if (!['none', 'low', 'good', 'full'].includes(ins.brood)) errors.push('brood-invalid');
  if (!['low', 'ok', 'full'].includes(ins.stores)) errors.push('stores-invalid');
  if (!['calm', 'normal', 'aggressive'].includes(ins.temperament)) errors.push('temperament-invalid');
  if (!isValidDateStr(ins.nextDue)) errors.push('nextDue-invalid');
  else if (isValidDateStr(ins.date) && daysBetween(ins.date, ins.nextDue) < 0) errors.push('nextDue-before-date');
  else if (isValidDateStr(ins.date) && daysBetween(ins.date, ins.nextDue) > 90) errors.push('nextDue-too-far');
  if (typeof ins.note !== 'string' || ins.note.length > MAX_NOTE_LEN) errors.push('note-too-long');
  return errors;
}
function validateHarvest(hv, hives, asOf) {
  const errors = [];
  if (!isPlainObject(hv)) return ['not-object'];
  const hive = Array.isArray(hives) ? hives.find((x) => x.id === hv.hiveId) : null;
  if (!hive) errors.push('hive-missing');
  checkDateField(hv.date, asOf, errors, 'date-invalid', 'date-future');
  if (hive && isValidDateStr(hv.date) && daysBetween(hive.started, hv.date) < 0) errors.push('date-before-hive-start');
  if (typeof hv.kg !== 'number' || !isFinite(hv.kg) || hv.kg <= 0 || hv.kg > MAX_KG) errors.push('kg-invalid');
  if (typeof hv.pricePerKg !== 'number' || !isFinite(hv.pricePerKg) || hv.pricePerKg < 0 || hv.pricePerKg > MAX_PRICE_PER_KG) errors.push('price-invalid');
  if (typeof hv.buyer !== 'string' || hv.buyer.length > MAX_NAME_LEN) errors.push('buyer-too-long');
  return errors;
}
function validateExpense(ex, asOf) {
  const errors = [];
  if (!isPlainObject(ex)) return ['not-object'];
  checkDateField(ex.date, asOf, errors, 'date-invalid', 'date-future');
  if (!['feed', 'equipment', 'medicine', 'transport', 'other'].includes(ex.category)) errors.push('category-invalid');
  if (typeof ex.amount !== 'number' || !isFinite(ex.amount) || ex.amount <= 0 || ex.amount > MAX_AMOUNT) errors.push('amount-invalid');
  if (typeof ex.note !== 'string' || ex.note.length > MAX_NOTE_LEN) errors.push('note-too-long');
  return errors;
}

/* ---------- stats ---------- */
function harvestRevenue(hv) { return round2(hv.kg * hv.pricePerKg); }
function computeStats(state, asOf) {
  const totalHives = state.hives.length;
  const activeHives = state.hives.filter((h) => h.status === 'active').length;
  let totalKg = 0, totalRevenue = 0;
  for (const hv of state.harvests) { totalKg = round2(totalKg + hv.kg); totalRevenue = round2(totalRevenue + harvestRevenue(hv)); }
  let totalExpenses = 0;
  const byCategory = {};
  for (const ex of state.expenses) {
    totalExpenses = round2(totalExpenses + ex.amount);
    byCategory[ex.category] = round2((byCategory[ex.category] || 0) + ex.amount);
  }
  const perHive = state.hives.map((h) => {
    let kg = 0, revenue = 0, count = 0;
    for (const hv of state.harvests) {
      if (hv.hiveId === h.id) { kg = round2(kg + hv.kg); revenue = round2(revenue + harvestRevenue(hv)); count++; }
    }
    return { hiveId: h.id, name: h.name, status: h.status, kg, revenue, count };
  }).sort((a, b) => b.kg - a.kg || a.name.localeCompare(b.name));
  return {
    totalHives, activeHives, totalKg, totalRevenue,
    totalExpenses, net: round2(totalRevenue - totalExpenses),
    byCategory, perHive,
  };
}
/* Hives whose next inspection is due within the window (or overdue),
 * plus hives never inspected. One entry per hive, earliest due first. */
function inspectionsDue(state, asOf, withinDays) {
  const win = typeof withinDays === 'number' ? withinDays : DUE_WINDOW_DAYS;
  const limit = addDays(asOf, win);
  const out = [];
  for (const h of state.hives) {
    if (h.status === 'inactive') continue;
    const insps = state.inspections.filter((i) => i.hiveId === h.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (insps.length === 0) {
      out.push({ hiveId: h.id, name: h.name, nextDue: null, daysLeft: null, neverInspected: true });
    } else if (insps[0].nextDue <= limit) {
      out.push({ hiveId: h.id, name: h.name, nextDue: insps[0].nextDue, daysLeft: daysBetween(asOf, insps[0].nextDue), neverInspected: false });
    }
  }
  out.sort((a, b) => {
    if (a.nextDue === null) return -1;
    if (b.nextDue === null) return 1;
    return a.nextDue < b.nextDue ? -1 : 1;
  });
  return out;
}
function recentHarvests(state, n) {
  return state.harvests.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n || 5);
}
function suggestNextDue(dateStr) { return addDays(dateStr, INSPECTION_INTERVAL_DAYS); }

/* ---------- state ---------- */
function emptyState() {
  return { v: 1, lang: 'en', hives: [], inspections: [], harvests: [], expenses: [] };
}
function validateState(s, asOf) {
  const errors = [];
  if (!isPlainObject(s)) return ['not-object'];
  if (s.v !== 1) errors.push('version');
  if (s.lang !== 'en' && s.lang !== 'bn') errors.push('lang');
  for (const key of ['hives', 'inspections', 'harvests', 'expenses']) {
    if (!Array.isArray(s[key])) errors.push(key + '-not-array');
    else if (s[key].length > MAX_ITEMS) errors.push(key + '-too-many');
  }
  if (errors.length) return errors;
  const hiveIds = new Set();
  for (const h of s.hives) {
    if (typeof h.id !== 'string' || !h.id) errors.push('hive-id');
    else if (hiveIds.has(h.id)) errors.push('hive-id-dup');
    else hiveIds.add(h.id);
    if (validateHive(h, asOf).length) errors.push('hive-invalid');
  }
  const seen = { inspections: new Set(), harvests: new Set(), expenses: new Set() };
  for (const i of s.inspections) {
    if (typeof i.id !== 'string' || !i.id || seen.inspections.has(i.id)) errors.push('inspection-id');
    else seen.inspections.add(i.id);
    if (validateInspection(i, s.hives, asOf).length) errors.push('inspection-invalid');
  }
  for (const hv of s.harvests) {
    if (typeof hv.id !== 'string' || !hv.id || seen.harvests.has(hv.id)) errors.push('harvest-id');
    else seen.harvests.add(hv.id);
    if (validateHarvest(hv, s.hives, asOf).length) errors.push('harvest-invalid');
  }
  for (const ex of s.expenses) {
    if (typeof ex.id !== 'string' || !ex.id || seen.expenses.has(ex.id)) errors.push('expense-id');
    else seen.expenses.add(ex.id);
    if (validateExpense(ex, asOf).length) errors.push('expense-invalid');
  }
  return errors;
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseISODate, isValidDateStr, todayISO, toISODate, daysBetween, addDays,
    isFuture, toBnDigits, formatNum, formatMoney, round2, uid,
    validateHive, validateInspection, validateHarvest, validateExpense,
    harvestRevenue, computeStats, inspectionsDue, recentHarvests, suggestNextDue,
    emptyState, validateState,
    MAX_NAME_LEN, MAX_NOTE_LEN, MAX_LOCATION_LEN, MAX_ITEMS,
    MAX_KG, MAX_PRICE_PER_KG, MAX_AMOUNT,
    INSPECTION_INTERVAL_DAYS, DUE_WINDOW_DAYS,
  };
}

/* Browser global: app.js calls L.* (classic scripts share the global scope). */
var L = {
  parseISODate, isValidDateStr, todayISO, toISODate, daysBetween, addDays,
  isFuture, toBnDigits, formatNum, formatMoney, round2, uid,
  validateHive, validateInspection, validateHarvest, validateExpense,
  harvestRevenue, computeStats, inspectionsDue, recentHarvests, suggestNextDue,
  emptyState, validateState,
};
