'use strict';
const $ = (id) => document.getElementById(id);
const KEY = 'brokeblob.v1';
const EMOJI = { happy: '😎', okay: '😬', sick: '🤢', dead: '💀' };
const LABEL = { happy: 'Thriving', okay: 'Nervous', sick: 'Sick', dead: 'Dead' };

let state = load() || { start: 500, budget: 500, tx: [], day: null, days: 30 };
let replayTimer = null;
let shownState = null;
let lastMessage = '';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || !(s.start > 0) || !isFinite(s.budget) || !Array.isArray(s.tx)) return null;
    const tx = s.tx.filter(t => t && typeof t.name === 'string' && t.cost > 0)
                   .map(t => ({ name: t.name.slice(0, 40), cost: t.cost, category: t.category === 'need' ? 'need' : 'want', day: t.day || null }));
    return { start: s.start, budget: Math.min(Math.max(s.budget, 0), s.start), tx, day: s.day || null, days: s.days || 30 };
  } catch (e) { return null; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

let soundOn = false;
let audio = null;
function beep(freq, dur, delay) {
  if (!soundOn) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'square'; osc.frequency.value = freq; gain.gain.value = 0.05;
    osc.connect(gain); gain.connect(audio.destination);
    const t = audio.currentTime + (delay || 0);
    osc.start(t); osc.stop(t + dur);
  } catch (e) {}
}
function sfx(stateName) {
  if (stateName === 'dead') { beep(196, 0.35, 0); beep(147, 0.7, 0.45); }
  else if (stateName === 'sick') beep(220, 0.3, 0);
  else if (stateName === 'okay') beep(440, 0.12, 0);
  else beep(660, 0.1, 0);
}

function pickMessage(stateName, tx) {
  let pool = MESSAGES[stateName];
  if (tx && stateName !== 'dead') {
    if (tx.cost > state.start * 0.25) pool = BIG_SPEND;
    else if (tx.category === 'need') pool = NEED_MESSAGES;
  }
  if (!tx) pool = pool.filter(m => !m.includes('{'));
  let msg = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && msg === lastMessage) msg = pool[(pool.indexOf(msg) + 1) % pool.length];
  lastMessage = msg;
  return tx ? msg.replace(/{item}/g, tx.name).replace(/{cost}/g, Engine.money(tx.cost)) : msg;
}

function currentState() { return Engine.mood(state.budget, state.start, state.day, state.days); }

function setPet(s) {
  const img = $('pet-image'), emo = $('pet-emoji');
  img.alt = 'Your pet is ' + LABEL[s];
  img.hidden = false; emo.hidden = true;
  img.onerror = () => { img.hidden = true; emo.hidden = false; emo.textContent = EMOJI[s]; };
  img.src = 'assets/' + s + '.png';
}

function render(tx) {
  const s = currentState();
  document.body.dataset.state = s;
  if (s !== shownState) { if (shownState !== null) sfx(s); setPet(s); shownState = s; }
  $('state-label').textContent = LABEL[s];
  const pct = Math.max(0, Math.min(100, (state.budget / state.start) * 100));
  $('health-bar').style.width = pct + '%';
  $('bar-wrap').setAttribute('aria-valuenow', String(Math.round(pct)));
  $('budget-text').textContent = '$' + Engine.money(state.budget) + ' / $' + Engine.money(state.start);
  renderPace(); renderHistory(); renderChart();
  if (tx !== undefined) $('message-box').textContent = pickMessage(s, tx);
}

function renderPace() {
  const el = $('pace-text');
  if (!state.day) { el.textContent = ''; return; }
  const gap = Engine.paceGap(state.budget, state.start, state.day, state.days);
  const allow = Engine.allowance(state.budget, state.day, state.days);
  el.textContent = 'Day ' + state.day + ' of ' + state.days + ' • ' + (gap < 0 ? '$' + Engine.money(-gap) + ' behind pace' : '$' + Engine.money(gap) + ' ahead of pace') + ' • Safe to spend today: $' + Engine.money(allow);
}

function renderHistory() {
  const ul = $('history-list');
  ul.textContent = '';
  state.tx.slice(-8).reverse().forEach(t => {
    const li = document.createElement('li');
    const tag = document.createElement('span');
    tag.className = 'tag ' + t.category; tag.textContent = t.category;
    const label = document.createElement('span');
    label.textContent = ' ' + t.name + (t.day ? ' (Day ' + t.day + ')' : '') + ' • $' + Engine.money(t.cost);
    li.append(tag, label); ul.append(li);
  });
}

function renderChart() {
  let b = state.start; const vals = [b];
  state.tx.forEach(t => { b = Math.max(0, Engine.round2(b - t.cost)); vals.push(b); });
  const W = 300, H = 100;
  const pts = vals.map((v, i) => {
    const x = vals.length < 2 ? 0 : (i / (vals.length - 1)) * W;
    const y = H - Math.max(0, Math.min(1, v / state.start)) * H;
    return x.toFixed(1) + ',' + y.toFixed(1);
  });
  $('chart-line').setAttribute('points', pts.join(' '));
}

function showReport() {
  if (!state.tx.length) return;
  const a = Engine.autopsy(state.tx, state.start);
  const dead = state.budget <= 0;
  $('report-title').textContent = 'Case File #' + a.caseNo;
  $('report-epitaph').textContent = dead ? 'Victim: your budget ($' + Engine.money(state.start) + '). Status: deceased.' : 'Victim: your budget. Status: still alive, but suspicious activity detected.';
  const rows = [];
  if (dead && a.weapon) {
    rows.push(['Time of death', a.weapon.day ? 'Day ' + a.weapon.day : 'Purchase #' + state.tx.length]);
    rows.push(['Murder weapon', a.weapon.name + ' ($' + Engine.money(a.weapon.cost) + ')']);
  }
  rows.push(['Prime suspects', a.suspects.map(t => t.name + ' ($' + Engine.money(t.cost) + ')').join(', ')]);
  rows.push(['Accomplices (under $15)', a.smallCount + ' small purchases, $' + Engine.money(a.smallTotal)]);
  rows.push(['Motive', 'Needs ($' + Engine.money(a.needs) + ') vs wants ($' + Engine.money(a.wants) + ') (' + a.wantsPct + '% wants)']);
  if (a.overspent > 0) rows.push(['Overspent by', '$' + Engine.money(a.overspent)]);
  rows.push(['Verdict', dead ? a.verdict : 'Case still open. Keep an eye on your wallet.']);
  
  const list = $('report-list'); list.textContent = '';
  rows.forEach(([k, v]) => {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k; dd.textContent = v;
    list.append(dt, dd);
  });
  $('report').hidden = false;
}

function fail(msg) { $('form-error').textContent = msg; return { ok: false, error: msg }; }

function applyPurchase(rawName, rawCost, day) {
  const name = String(rawName || '').trim().slice(0, 40);
  const cost = Engine.round2(Number(rawCost));
  if (!name) return fail('Give the item a name.');
  if (!(cost > 0)) return fail('Enter a cost above $0.');
  if (cost > 1000000) return fail('That cost is too large to be real.');
  if (state.budget <= 0) return fail('Your pet is gone. Press Restart.');
  
  state.day = day || null;
  const tx = { name, cost, category: Engine.categorize(name), day: day || null };
  state.tx.push(tx);
  state.budget = Math.max(0, Engine.round2(state.budget - cost));
  $('form-error').textContent = '';
  save(); render(tx);
  if (state.budget <= 0) setTimeout(showReport, 900);
  return { ok: true };
}

function setBusy(busy) { ['buy-btn', 'coffee-btn', 'replay-btn', 'import-btn', 'budget-set-btn'].forEach(id => { $(id).disabled = busy; }); }

function stopReplay() {
  if (replayTimer) clearInterval(replayTimer);
  replayTimer = null; setBusy(false);
}

function resetGame() {
  stopReplay();
  state.budget = state.start; state.tx = []; state.day = null; state.days = 30;
  $('report').hidden = true; $('form-error').textContent = '';
  save(); render(null);
}

function startReplay(list, days) {
  resetGame(); state.days = days; setBusy(true);
  let i = 0;
  replayTimer = setInterval(() => {
    if (i >= list.length || state.budget <= 0) { stopReplay(); if (state.tx.length) showReport(); return; }
    const t = list[i++]; applyPurchase(t.name, t.cost, t.day);
  }, 700);
}

$('buy-form').addEventListener('submit', e => {
  e.preventDefault();
  const r = applyPurchase($('item-name').value, $('item-cost').value, null);
  if (r.ok) { $('buy-form').reset(); $('item-name').focus(); }
});
$('coffee-btn').addEventListener('click', () => applyPurchase('Iced coffee', 400, null));
$('replay-btn').addEventListener('click', () => startReplay(SAMPLE_MONTH, 30));
$('reset-btn').addEventListener('click', resetGame);
$('report-btn').addEventListener('click', showReport);
$('report-close').addEventListener('click', () => { $('report').hidden = true; });
$('sound-btn').addEventListener('click', () => {
  soundOn = !soundOn; $('sound-btn').textContent = 'Sound: ' + (soundOn ? 'on' : 'off');
  $('sound-btn').setAttribute('aria-pressed', String(soundOn));
  if (soundOn) sfx('happy');
});
$('budget-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = Engine.round2(Number($('budget-input').value));
  if (!(v >= 10 && v <= 100000)) { fail('Pick a budget between $10 and $100,000.'); return; }
  state.start = v; resetGame();
});
$('import-btn').addEventListener('click', () => {
  const { rows, errors } = Engine.parseCSV($('csv-input').value);
  const status = $('import-status');
  if (!rows.length) { status.textContent = 'No valid rows found. Use date, name, amount.'; return; }
  status.textContent = rows.length + ' rows imported' + (errors.length ? ', ' + errors.length + ' skipped.' : '');
  const { list, days } = Engine.toDays(rows);
  startReplay(list, days);
});

/* Accessibility & View Controls */
let fontSize = 20;
$('theme-toggle').addEventListener('click', (e) => {
    document.body.classList.toggle('light-mode');
    e.target.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
});

function updateFont(change) {
    fontSize = Math.max(10, Math.min(90, fontSize + change));
    $('font-size-display').textContent = fontSize;
    document.body.style.fontSize = fontSize + 'px';
}

$('font-minus').addEventListener('click', () => updateFont(-2));
$('font-plus').addEventListener('click', () => updateFont(2));

$('fullscreen-btn').addEventListener('click', (e) => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
        e.target.textContent = '🔳';
    } else {
        document.exitFullscreen();
        e.target.textContent = '🔲';
    }
});

$('budget-input').value = state.start;
render(null);