/* Honey BD \u2014 browser UI. Depends on js/data.js (DATA), js/i18n.js (I18N)
 * and js/logic.js (L) loaded before this file.
 * State lives in localStorage under KEY; nothing leaves the device.
 * ?asof=YYYY-MM-DD overrides "today" (used by the smoke test). */
'use strict';

const KEY = 'honey-bd-v1';
const params = new URLSearchParams(location.search);
const ASOF = L.isValidDateStr(params.get('asof')) ? params.get('asof') : null;
const today = ASOF || L.todayISO();

let state = load();
let tab = 'dashboard';
let editingHiveId = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return L.emptyState();
    const parsed = JSON.parse(raw);
    if (L.validateState(parsed, today).length) return L.emptyState();
    return parsed;
  } catch { return L.emptyState(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function $(id) { return document.getElementById(id); }
function lang() { return state.lang; }
function txt(key) { return I18N.t(lang(), key); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showMsg(text) {
  const m = $('msg');
  m.textContent = text;
  m.hidden = false;
}
function hideMsg() { $('msg').hidden = true; }
function hiveName(id) {
  const h = state.hives.find((x) => x.id === id);
  return h ? h.name : '?';
}
function fillSelect(select, values, group) {
  select.innerHTML = values.map((v) =>
    '<option value="' + v + '">' + esc(I18N.optName(lang(), group, v)) + '</option>').join('');
}
function fillHiveSelects() {
  for (const id of ['inspHiveSelect', 'harvHiveSelect']) {
    const sel = $(id);
    sel.innerHTML = state.hives.map((h) =>
      '<option value="' + esc(h.id) + '">' + esc(h.name) + '</option>').join('');
  }
}

/* ---------- static text ---------- */
function renderStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = txt(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = txt(el.dataset.i18nPh); });
  $('appTitle').textContent = txt('appTitle');
  $('langBtn').textContent = txt('langBtn');
  fillSelect($('hiveTypeSelect'), DATA.HIVE_TYPES, 'type');
  fillSelect($('hiveStrengthSelect'), DATA.STRENGTHS, 'strength');
  fillSelect($('hiveStatusSelect'), DATA.STATUSES, 'status');
  fillSelect($('inspQueenSelect'), DATA.QUEEN, 'queen');
  fillSelect($('inspBroodSelect'), DATA.BROOD, 'brood');
  fillSelect($('inspStoresSelect'), DATA.STORES, 'stores');
  fillSelect($('inspTempSelect'), DATA.TEMPERAMENT, 'temp');
  fillSelect($('expCatSelect'), DATA.EXPENSE_CATEGORIES, 'cat');
  fillHiveSelects();
}

/* ---------- tabs ---------- */
function setTab(name) {
  tab = name;
  for (const t of ['dashboard', 'hives', 'inspections', 'harvest', 'expenses', 'data']) {
    $('sec' + t.charAt(0).toUpperCase() + t.slice(1)).hidden = t !== name;
    $('tab' + t.charAt(0).toUpperCase() + t.slice(1) + 'Btn').classList.toggle('active', t === name);
  }
  hideMsg();
  render();
}

/* ---------- dashboard ---------- */
function renderDashboard() {
  const s = L.computeStats(state, today);
  $('statHives').textContent = L.formatNum(s.totalHives, lang());
  $('statActive').textContent = L.formatNum(s.activeHives, lang());
  $('statKg').textContent = L.formatNum(s.totalKg, lang());
  $('statRevenue').textContent = L.formatMoney(s.totalRevenue, lang());
  $('statExpenses').textContent = L.formatMoney(s.totalExpenses, lang());
  $('statNet').textContent = L.formatMoney(s.net, lang());

  const due = L.inspectionsDue(state, today);
  const dl = $('dueList');
  if (!due.length) {
    dl.innerHTML = '<li class="empty">' + esc(txt('dueEmpty')) + '</li>';
  } else {
    dl.innerHTML = due.map((d) => {
      let when;
      if (d.neverInspected) when = esc(txt('dueNever'));
      else if (d.daysLeft === 0) when = esc(txt('dueToday'));
      else if (d.daysLeft < 0) when = esc(txt('dueOverdue').replace('{n}', L.formatNum(-d.daysLeft, lang())));
      else when = esc(txt('dueIn').replace('{n}', L.formatNum(d.daysLeft, lang())));
      const datePart = d.nextDue ? ' \u2014 ' + esc(d.nextDue) : '';
      return '<li><strong>' + esc(d.name) + '</strong> \u2014 ' + when + datePart + '</li>';
    }).join('');
  }

  const recent = L.recentHarvests(state, 5);
  const rl = $('recentList');
  if (!recent.length) {
    rl.innerHTML = '<li class="empty">' + esc(txt('recentEmpty')) + '</li>';
  } else {
    rl.innerHTML = recent.map((hv) =>
      '<li><strong>' + esc(hiveName(hv.hiveId)) + '</strong> \u2014 ' + esc(hv.date) + ' \u2014 ' +
      esc(L.formatNum(hv.kg, lang())) + ' kg \u2014 ' + esc(L.formatMoney(L.harvestRevenue(hv), lang())) +
      (hv.buyer ? ' \u2014 ' + esc(hv.buyer) : '') + '</li>').join('');
  }

  const yb = $('yieldBody');
  if (!s.perHive.length) {
    yb.innerHTML = '';
    $('yieldEmpty').hidden = false;
  } else {
    $('yieldEmpty').hidden = true;
    yb.innerHTML = s.perHive.map((p) =>
      '<tr><td>' + esc(p.name) + '</td><td>' + esc(L.formatNum(p.kg, lang())) +
      '</td><td>' + esc(L.formatMoney(p.revenue, lang())) + '</td><td>' +
      esc(L.formatNum(p.count, lang())) + '</td></tr>').join('');
  }
}

/* ---------- hives ---------- */
function resetHiveForm() {
  editingHiveId = null;
  $('hiveForm').reset();
  $('hiveStartedInput').value = today;
  $('hiveSaveBtn').textContent = txt('hiveAdd');
  $('hiveCancelBtn').hidden = true;
  $('hiveErr').hidden = true;
}
function renderHives() {
  const list = $('hiveList');
  $('hiveEmpty').hidden = state.hives.length > 0;
  list.innerHTML = state.hives.map((h) =>
    '<li class="card"><div><strong>' + esc(h.name) + '</strong> \u2014 ' +
    esc(I18N.optName(lang(), 'type', h.type)) + '<br><span class="muted">' +
    esc(I18N.optName(lang(), 'status', h.status)) + ' \u00b7 ' +
    esc(I18N.optName(lang(), 'strength', h.strength)) + ' \u00b7 ' +
    esc(txt('hiveStarted')) + ' ' + esc(h.started) +
    (h.location ? ' \u00b7 ' + esc(h.location) : '') +
    (h.note ? '<br>' + esc(h.note) : '') + '</span></div>' +
    '<div class="row"><button type="button" data-edit-hive="' + esc(h.id) + '">' + esc(txt('hiveEdit')) +
    '</button> <button type="button" data-del-hive="' + esc(h.id) + '">' + esc(txt('hiveDelete')) + '</button></div></li>'
  ).join('');
  list.querySelectorAll('[data-edit-hive]').forEach((b) => b.addEventListener('click', () => editHive(b.dataset.editHive)));
  list.querySelectorAll('[data-del-hive]').forEach((b) => b.addEventListener('click', () => deleteHive(b.dataset.delHive)));
}
function editHive(id) {
  const h = state.hives.find((x) => x.id === id);
  if (!h) return;
  editingHiveId = id;
  $('hiveNameInput').value = h.name;
  $('hiveTypeSelect').value = h.type;
  $('hiveLocationInput').value = h.location || '';
  $('hiveStartedInput').value = h.started;
  $('hiveStrengthSelect').value = h.strength;
  $('hiveStatusSelect').value = h.status;
  $('hiveNoteInput').value = h.note || '';
  $('hiveSaveBtn').textContent = txt('hiveSave');
  $('hiveCancelBtn').hidden = false;
  $('hiveForm').scrollIntoView();
}
function deleteHive(id) {
  if (!window.confirm(txt('hiveDeleteConfirm'))) return;
  state.hives = state.hives.filter((h) => h.id !== id);
  state.inspections = state.inspections.filter((i) => i.hiveId !== id);
  state.harvests = state.harvests.filter((hv) => hv.hiveId !== id);
  save();
  showMsg(txt('hiveDeleted'));
  render();
}
function submitHive(ev) {
  ev.preventDefault();
  const h = {
    id: editingHiveId || L.uid('h'),
    name: $('hiveNameInput').value.trim(),
    type: $('hiveTypeSelect').value,
    location: $('hiveLocationInput').value.trim(),
    started: $('hiveStartedInput').value,
    strength: $('hiveStrengthSelect').value,
    status: $('hiveStatusSelect').value,
    note: $('hiveNoteInput').value.trim(),
  };
  const errs = L.validateHive(h, today);
  const errEl = $('hiveErr');
  if (errs.length) {
    errEl.textContent = txt('formError');
    errEl.hidden = false;
    $('hiveNameInput').classList.toggle('invalid', !h.name || h.name.length > 60);
    $('hiveStartedInput').classList.toggle('invalid', !L.isValidDateStr(h.started) || L.isFuture(h.started, today));
    return;
  }
  errEl.hidden = true;
  if (editingHiveId) {
    const i = state.hives.findIndex((x) => x.id === editingHiveId);
    if (i >= 0) state.hives[i] = h;
    showMsg(txt('hiveSaved'));
  } else {
    state.hives.push(h);
    showMsg(txt('hiveAdded'));
  }
  save();
  resetHiveForm();
  render();
}

/* ---------- inspections ---------- */
function renderInspections() {
  const noHive = state.hives.length === 0;
  $('inspNoHive').hidden = !noHive;
  $('inspForm').style.display = noHive ? 'none' : '';
  fillHiveSelects();
  const list = $('inspList');
  const sorted = state.inspections.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  $('inspEmpty').hidden = sorted.length > 0;
  list.innerHTML = sorted.map((i) =>
    '<li class="card"><div><strong>' + esc(hiveName(i.hiveId)) + '</strong> \u2014 ' + esc(i.date) +
    '<br><span class="muted">' + esc(txt('inspQueen')) + ': ' + esc(I18N.optName(lang(), 'queen', i.queen)) +
    ' \u00b7 ' + esc(txt('inspBrood')) + ': ' + esc(I18N.optName(lang(), 'brood', i.brood)) +
    ' \u00b7 ' + esc(txt('inspStores')) + ': ' + esc(I18N.optName(lang(), 'stores', i.stores)) +
    ' \u00b7 ' + esc(txt('inspTemp')) + ': ' + esc(I18N.optName(lang(), 'temp', i.temperament)) +
    '<br>' + esc(txt('inspNextDue')) + ': ' + esc(i.nextDue) +
    (i.note ? '<br>' + esc(i.note) : '') + '</span></div>' +
    '<div class="row"><button type="button" data-del-insp="' + esc(i.id) + '">' + esc(txt('inspDelete')) + '</button></div></li>'
  ).join('');
  list.querySelectorAll('[data-del-insp]').forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm(txt('inspDeleteConfirm'))) return;
    state.inspections = state.inspections.filter((x) => x.id !== b.dataset.delInsp);
    save();
    showMsg(txt('inspDeleted'));
    render();
  }));
}
function submitInspection(ev) {
  ev.preventDefault();
  const ins = {
    id: L.uid('i'),
    hiveId: $('inspHiveSelect').value,
    date: $('inspDateInput').value,
    queen: $('inspQueenSelect').value,
    brood: $('inspBroodSelect').value,
    stores: $('inspStoresSelect').value,
    temperament: $('inspTempSelect').value,
    nextDue: $('inspNextDueInput').value,
    note: $('inspNoteInput').value.trim(),
  };
  const errs = L.validateInspection(ins, state.hives, today);
  const errEl = $('inspErr');
  if (errs.length) {
    errEl.textContent = txt('formError');
    errEl.hidden = false;
    $('inspDateInput').classList.toggle('invalid', !L.isValidDateStr(ins.date) || L.isFuture(ins.date, today));
    $('inspNextDueInput').classList.toggle('invalid', !L.isValidDateStr(ins.nextDue));
    return;
  }
  errEl.hidden = true;
  state.inspections.push(ins);
  save();
  $('inspForm').reset();
  $('inspDateInput').value = today;
  showMsg(txt('inspSaved'));
  render();
}

/* ---------- harvest ---------- */
function renderHarvest() {
  const noHive = state.hives.length === 0;
  $('harvNoHive').hidden = !noHive;
  $('harvForm').style.display = noHive ? 'none' : '';
  fillHiveSelects();
  const s = L.computeStats(state, today);
  $('harvTotals').textContent = txt('harvTotalKg') + ': ' + L.formatNum(s.totalKg, lang()) +
    '  \u00b7  ' + txt('harvTotalRevenue') + ': ' + L.formatMoney(s.totalRevenue, lang());
  const list = $('harvList');
  const sorted = state.harvests.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  $('harvEmpty').hidden = sorted.length > 0;
  list.innerHTML = sorted.map((hv) =>
    '<li class="card"><div><strong>' + esc(hiveName(hv.hiveId)) + '</strong> \u2014 ' + esc(hv.date) +
    '<br><span class="muted">' + esc(L.formatNum(hv.kg, lang())) + ' kg \u00d7 ' +
    esc(L.formatMoney(hv.pricePerKg, lang())) + ' = <strong>' +
    esc(L.formatMoney(L.harvestRevenue(hv), lang())) + '</strong>' +
    (hv.buyer ? ' \u00b7 ' + esc(hv.buyer) : '') + '</span></div>' +
    '<div class="row"><button type="button" data-del-harv="' + esc(hv.id) + '">' + esc(txt('harvDelete')) + '</button></div></li>'
  ).join('');
  list.querySelectorAll('[data-del-harv]').forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm(txt('harvDeleteConfirm'))) return;
    state.harvests = state.harvests.filter((x) => x.id !== b.dataset.delHarv);
    save();
    showMsg(txt('harvDeleted'));
    render();
  }));
}
function submitHarvest(ev) {
  ev.preventDefault();
  const hv = {
    id: L.uid('v'),
    hiveId: $('harvHiveSelect').value,
    date: $('harvDateInput').value,
    kg: parseFloat($('harvKgInput').value),
    pricePerKg: parseFloat($('harvPriceInput').value),
    buyer: $('harvBuyerInput').value.trim(),
  };
  const errs = L.validateHarvest(hv, state.hives, today);
  const errEl = $('harvErr');
  if (errs.length) {
    errEl.textContent = txt('formError');
    errEl.hidden = false;
    $('harvDateInput').classList.toggle('invalid', !L.isValidDateStr(hv.date) || L.isFuture(hv.date, today));
    $('harvKgInput').classList.toggle('invalid', !(hv.kg > 0 && hv.kg <= 500));
    $('harvPriceInput').classList.toggle('invalid', !(hv.pricePerKg >= 0 && hv.pricePerKg <= 100000));
    return;
  }
  errEl.hidden = true;
  state.harvests.push(hv);
  save();
  $('harvForm').reset();
  $('harvDateInput').value = today;
  showMsg(txt('harvSaved'));
  render();
}

/* ---------- expenses ---------- */
function renderExpenses() {
  const s = L.computeStats(state, today);
  $('expTotals').textContent = txt('expTotal') + ': ' + L.formatMoney(s.totalExpenses, lang());
  const list = $('expList');
  const sorted = state.expenses.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  $('expEmpty').hidden = sorted.length > 0;
  list.innerHTML = sorted.map((ex) =>
    '<li class="card"><div><strong>' + esc(L.formatMoney(ex.amount, lang())) + '</strong> \u2014 ' +
    esc(I18N.optName(lang(), 'cat', ex.category)) + ' \u2014 ' + esc(ex.date) +
    (ex.note ? '<br><span class="muted">' + esc(ex.note) + '</span>' : '') + '</div>' +
    '<div class="row"><button type="button" data-del-exp="' + esc(ex.id) + '">' + esc(txt('expDelete')) + '</button></div></li>'
  ).join('');
  list.querySelectorAll('[data-del-exp]').forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm(txt('expDeleteConfirm'))) return;
    state.expenses = state.expenses.filter((x) => x.id !== b.dataset.delExp);
    save();
    showMsg(txt('expDeleted'));
    render();
  }));
}
function submitExpense(ev) {
  ev.preventDefault();
  const ex = {
    id: L.uid('e'),
    date: $('expDateInput').value,
    category: $('expCatSelect').value,
    amount: parseFloat($('expAmountInput').value),
    note: $('expNoteInput').value.trim(),
  };
  const errs = L.validateExpense(ex, today);
  const errEl = $('expErr');
  if (errs.length) {
    errEl.textContent = txt('formError');
    errEl.hidden = false;
    $('expDateInput').classList.toggle('invalid', !L.isValidDateStr(ex.date) || L.isFuture(ex.date, today));
    $('expAmountInput').classList.toggle('invalid', !(ex.amount > 0 && ex.amount <= 10000000));
    return;
  }
  errEl.hidden = true;
  state.expenses.push(ex);
  save();
  $('expForm').reset();
  $('expDateInput').value = today;
  showMsg(txt('expSaved'));
  render();
}

/* ---------- render all ---------- */
function render() {
  renderStatic();
  renderDashboard();
  renderHives();
  renderInspections();
  renderHarvest();
  renderExpenses();
}

/* ---------- data tab ---------- */
function doExport() {
  const out = $('exportOut');
  out.value = JSON.stringify(state, null, 2);
  out.hidden = false;
  showMsg(txt('exportDone'));
}
function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (L.validateState(parsed, today).length) { showMsg(txt('importBad')); return; }
      state = parsed;
      save();
      editingHiveId = null;
      showMsg(txt('importOk'));
      render();
    } catch { showMsg(txt('importBad')); }
  };
  reader.readAsText(file);
}
function doErase() {
  const answer = window.prompt(txt('erasePrompt'));
  if (answer === null) { showMsg(txt('eraseCancel')); return; }
  if (answer.trim() !== 'DELETE') { showMsg(txt('eraseCancel')); return; }
  state = L.emptyState();
  save();
  editingHiveId = null;
  $('exportOut').hidden = true;
  $('exportOut').value = '';
  showMsg(txt('eraseDone'));
  render();
}

/* ---------- wire up ---------- */
document.querySelectorAll('#tabs button').forEach((b) =>
  b.addEventListener('click', () => setTab(b.dataset.tab)));
$('langBtn').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'bn' : 'en';
  save();
  render();
});
$('hiveForm').addEventListener('submit', submitHive);
$('hiveCancelBtn').addEventListener('click', resetHiveForm);
$('inspForm').addEventListener('submit', submitInspection);
$('inspDateInput').addEventListener('change', () => {
  const d = $('inspDateInput').value;
  if (L.isValidDateStr(d) && !$('inspNextDueInput').value) {
    $('inspNextDueInput').value = L.suggestNextDue(d);
  }
});
$('harvForm').addEventListener('submit', submitHarvest);
$('expForm').addEventListener('submit', submitExpense);
$('exportBtn').addEventListener('click', doExport);
$('importFile').addEventListener('change', (ev) => {
  if (ev.target.files && ev.target.files[0]) doImport(ev.target.files[0]);
  ev.target.value = '';
});
$('eraseBtn').addEventListener('click', doErase);

/* defaults for date inputs */
$('hiveStartedInput').value = today;
$('inspDateInput').value = today;
$('harvDateInput').value = today;
$('expDateInput').value = today;
if (L.isValidDateStr(today)) $('inspNextDueInput').value = L.suggestNextDue(today);

render();
