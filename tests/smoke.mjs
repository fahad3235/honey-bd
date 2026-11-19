/* Honey BD \u2014 headless-Chrome smoke test (raw CDP, no deps).
 * Run: node tests/smoke.mjs  (from the honey-bd folder)
 * Loads index.html over file:// with ?asof=2026-11-19, drives the real UI,
 * collects console/page errors, asserts visible state at 1440px and 390px.
 * All source in this file is ASCII; Bengali is detected by Unicode
 * code-point range (U+0980-U+09FF), never by literal characters. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const BASE = 'file:///home/hatch/workspace/muse-project-factory/builds/honey-bd/index.html';
const PORT = 9231;

let pass = 0, fail = 0;
const errors = [];
const netReqs = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' \u2014 ' + extra : '')); }
}

const chrome = spawn(SHELL, ['--headless', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('headless_shell did not start');
}

let msgId = 0;
const pending = new Map();
let ws;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}
async function nav(url) {
  await send('Page.navigate', { url });
  await sleep(1200);
}
async function clickTab(name) {
  await evalJs(`document.querySelector('#tab${name}Btn').click()`);
  await sleep(300);
}
const HAS_BN = `(s) => [...String(s)].some((c) => { const n = c.codePointAt(0); return n >= 0x0980 && n <= 0x09FF; })`;
async function importJson(jsonText) {
  await evalJs(`(() => {
    const dt = new DataTransfer();
    const file = new File([\`${jsonText.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`], 'backup.json', { type: 'application/json' });
    dt.items.add(file);
    const input = document.querySelector('#importFile');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true; })()`);
  await sleep(500);
}

try {
  const wsUrl = await getWsUrl();
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE.ERROR: ' + JSON.stringify(m.params.args).slice(0, 300));
    if (m.method === 'Network.requestWillBeSent') netReqs.push(m.params.request.url);
  };
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  /* ---- Pass 1: fresh load, empty state ---- */
  await nav(BASE + '?asof=2026-11-19');
  check('title renders', (await evalJs(`document.title`)).includes('Honey BD'));
  check('h1 renders', (await evalJs(`document.querySelector('h1').textContent`)).includes('Honey BD'));
  check('stat hives = 0', await evalJs(`document.querySelector('#statHives').textContent`) === '0');
  check('stat revenue = 0', await evalJs(`document.querySelector('#statRevenue').textContent`) === '\u09f30.00');
  check('due list empty message', await evalJs(`document.querySelector('#dueList').textContent.includes('No inspections due')`));
  check('recent empty message', await evalJs(`document.querySelector('#recentList').textContent.includes('No harvests recorded')`));
  check('yield empty message', await evalJs(`!document.querySelector('#yieldEmpty').hidden`));

  /* ---- Pass 2: hive validation \u2014 empty name rejected ---- */
  await clickTab('Hives');
  check('hives empty message', await evalJs(`!document.querySelector('#hiveEmpty').hidden`));
  await evalJs(`(() => { document.querySelector('#hiveNameInput').value = ''; document.querySelector('#hiveStartedInput').value = '2026-09-01'; return true; })()`);
  await evalJs(`document.querySelector('#hiveSaveBtn').click()`);
  await sleep(300);
  check('empty name rejected, error shown', await evalJs(`!document.querySelector('#hiveErr').hidden`));
  check('name field marked invalid', await evalJs(`document.querySelector('#hiveNameInput').classList.contains('invalid')`));
  check('still 0 hives after rejected add', await evalJs(`document.querySelector('#statHives').textContent`) === '0');

  /* ---- Pass 3: add hive Box 1 ---- */
  await evalJs(`(() => {
    document.querySelector('#hiveNameInput').value = 'Box 1';
    document.querySelector('#hiveTypeSelect').value = 'box';
    document.querySelector('#hiveLocationInput').value = 'Home yard';
    document.querySelector('#hiveStartedInput').value = '2026-09-01';
    document.querySelector('#hiveStrengthSelect').value = 'strong';
    document.querySelector('#hiveStatusSelect').value = 'active';
    return true; })()`);
  await evalJs(`document.querySelector('#hiveSaveBtn').click()`);
  await sleep(300);
  check('hive added message', await evalJs(`document.querySelector('#msg').textContent.includes('added')`));
  check('hive list shows Box 1', await evalJs(`document.querySelector('#hiveList').textContent.includes('Box 1')`));
  check('hive list shows Box hive', await evalJs(`document.querySelector('#hiveList').textContent.includes('Box hive')`));
  await clickTab('Dashboard');
  check('stat hives = 1', await evalJs(`document.querySelector('#statHives').textContent`) === '1');
  check('stat active = 1', await evalJs(`document.querySelector('#statActive').textContent`) === '1');
  check('due list flags never inspected', await evalJs(`document.querySelector('#dueList').textContent.includes('Never inspected')`));

  /* ---- Pass 4: add inspection, due clears ---- */
  await clickTab('Inspections');
  await evalJs(`(() => {
    document.querySelector('#inspHiveSelect').value = document.querySelector('#inspHiveSelect').options[0].value;
    document.querySelector('#inspDateInput').value = '2026-11-15';
    document.querySelector('#inspQueenSelect').value = 'seen';
    document.querySelector('#inspBroodSelect').value = 'good';
    document.querySelector('#inspStoresSelect').value = 'full';
    document.querySelector('#inspTempSelect').value = 'calm';
    document.querySelector('#inspNextDueInput').value = '2026-11-29';
    return true; })()`);
  await evalJs(`document.querySelector('#inspSaveBtn').click()`);
  await sleep(300);
  check('inspection saved message', await evalJs(`document.querySelector('#msg').textContent.includes('saved')`));
  check('inspection list shows Box 1', await evalJs(`document.querySelector('#inspList').textContent.includes('Box 1')`));
  check('inspection shows next due 2026-11-29', await evalJs(`document.querySelector('#inspList').textContent.includes('2026-11-29')`));
  await clickTab('Dashboard');
  check('due list empty after inspection', await evalJs(`document.querySelector('#dueList').textContent.includes('No inspections due')`));

  /* ---- Pass 5: add harvest 12.5 kg @ 850 ---- */
  await clickTab('Harvest');
  await evalJs(`(() => {
    document.querySelector('#harvHiveSelect').value = document.querySelector('#harvHiveSelect').options[0].value;
    document.querySelector('#harvDateInput').value = '2026-11-10';
    document.querySelector('#harvKgInput').value = '12.5';
    document.querySelector('#harvPriceInput').value = '850';
    document.querySelector('#harvBuyerInput').value = 'Local market';
    return true; })()`);
  await evalJs(`document.querySelector('#harvSaveBtn').click()`);
  await sleep(300);
  check('harvest saved message', await evalJs(`document.querySelector('#msg').textContent.includes('saved')`));
  check('harvest list shows 12.5 kg', await evalJs(`document.querySelector('#harvList').textContent.includes('12.5 kg')`));
  check('harvest list shows revenue 10625', await evalJs(`document.querySelector('#harvList').textContent.includes('10,625.00')`));
  check('harvest totals show 12.5', await evalJs(`document.querySelector('#harvTotals').textContent.includes('12.5')`));
  await clickTab('Dashboard');
  check('stat kg = 12.5', await evalJs(`document.querySelector('#statKg').textContent`) === '12.5');
  check('stat revenue = 10625', await evalJs(`document.querySelector('#statRevenue').textContent`) === '\u09f310,625.00');
  check('yield table has Box 1', await evalJs(`document.querySelector('#yieldBody').textContent.includes('Box 1')`));
  check('recent harvests shows Box 1', await evalJs(`document.querySelector('#recentList').textContent.includes('Box 1')`));

  /* ---- Pass 6: add expense 1200 feed ---- */
  await clickTab('Expenses');
  await evalJs(`(() => {
    document.querySelector('#expDateInput').value = '2026-11-05';
    document.querySelector('#expCatSelect').value = 'feed';
    document.querySelector('#expAmountInput').value = '1200';
    document.querySelector('#expNoteInput').value = 'sugar';
    return true; })()`);
  await evalJs(`document.querySelector('#expSaveBtn').click()`);
  await sleep(300);
  check('expense saved message', await evalJs(`document.querySelector('#msg').textContent.includes('saved')`));
  check('expense list shows 1200', await evalJs(`document.querySelector('#expList').textContent.includes('1,200.00')`));
  check('expense totals show 1200', await evalJs(`document.querySelector('#expTotals').textContent.includes('1,200.00')`));
  await clickTab('Dashboard');
  check('stat expenses = 1200', await evalJs(`document.querySelector('#statExpenses').textContent`) === '\u09f31,200.00');
  check('stat net = 9425', await evalJs(`document.querySelector('#statNet').textContent`) === '\u09f39,425.00');

  /* ---- Pass 7: BN toggle + persistence ---- */
  await evalJs(`document.querySelector('#langBtn').click()`);
  await sleep(300);
  check('BN: h1 has Bengali', await evalJs(`(${HAS_BN})(document.querySelector('h1').textContent)`));
  check('BN: stat hives Bengali 1', await evalJs(`document.querySelector('#statHives').textContent`) === '\u09e7');
  check('BN: revenue has Bengali digits', await evalJs(`(${HAS_BN})(document.querySelector('#statRevenue').textContent)`));
  await nav(BASE + '?asof=2026-11-19');
  check('BN persists across reload', await evalJs(`(${HAS_BN})(document.querySelector('h1').textContent)`));
  check('hive persists (Box 1)', await evalJs(`document.querySelector('#statHives').textContent`) === '\u09e7');
  await evalJs(`document.querySelector('#langBtn').click()`);
  await sleep(300);

  /* ---- Pass 8: data tab \u2014 bad import, good import, erase ---- */
  await clickTab('Data');
  await importJson('{"v":9}');
  check('bad import rejected', await evalJs(`document.querySelector('#msg').textContent.includes('not a valid')`));
  check('data intact after bad import', await evalJs(`JSON.parse(localStorage.getItem('honey-bd-v1')).harvests.length === 1`));
  await evalJs(`document.querySelector('#exportBtn').click()`);
  await sleep(300);
  check('export shows backup', await evalJs(`!document.querySelector('#exportOut').hidden && document.querySelector('#exportOut').value.includes('Box 1')`));
  await importJson(JSON.stringify({ v: 1, lang: 'en', hives: [{ id: 'h9', name: 'Log 2', type: 'log', location: '', started: '2026-10-01', strength: 'moderate', status: 'active', note: '' }], inspections: [], harvests: [], expenses: [] }));
  check('good import accepted', await evalJs(`document.querySelector('#msg').textContent.includes('imported')`));
  check('imported hive shows Log 2', await evalJs(`document.querySelector('#statHives').textContent`) === '1');
  await clickTab('Hives');
  check('imported hive list shows Log 2', await evalJs(`document.querySelector('#hiveList').textContent.includes('Log 2')`));
  await clickTab('Data');
  await evalJs(`window.prompt = () => 'DELETE'`);
  await evalJs(`document.querySelector('#eraseBtn').click()`);
  await sleep(400);
  check('erase message shown', await evalJs(`document.querySelector('#msg').textContent.includes('erased')`));
  check('erase restores 0 hives', await evalJs(`document.querySelector('#statHives').textContent`) === '0');

  /* ---- Pass 9: 390px mobile, no horizontal overflow ---- */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(400);
  await clickTab('Dashboard');
  check('390px dashboard no overflow', await evalJs(`document.documentElement.scrollWidth <= 390`));
  await clickTab('Hives');
  check('390px hives no overflow', await evalJs(`document.documentElement.scrollWidth <= 390`));
  await clickTab('Inspections');
  check('390px inspections no overflow', await evalJs(`document.documentElement.scrollWidth <= 390`));
  await clickTab('Harvest');
  check('390px harvest no overflow', await evalJs(`document.documentElement.scrollWidth <= 390`));
  await clickTab('Expenses');
  check('390px expenses no overflow', await evalJs(`document.documentElement.scrollWidth <= 390`));
  await clickTab('Data');
  check('390px data no overflow', await evalJs(`document.documentElement.scrollWidth <= 390`));

  /* ---- Pass 10: errors + network ---- */
  check('0 console/page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  const badNet = netReqs.filter((u) => !u.startsWith('file://') && !u.startsWith('data:') && u !== 'about:blank');
  check('0 non-file network requests', badNet.length === 0, badNet.join(', ').slice(0, 200));
} catch (e) {
  console.log('SMOKE ERROR: ' + (e && e.message ? e.message : e));
  fail++;
} finally {
  try { await send('Page.close'); } catch { /* already closed */ }
  chrome.kill();
}

console.log('\n' + pass + ' passed, ' + fail + ' failed.');
process.exit(fail || errors.length ? 1 : 0);
