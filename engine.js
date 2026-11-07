const Engine = (() => {
  const ORDER = ['happy', 'okay', 'sick', 'dead'];
  const NEED_RE = /\b(rent|groceries|grocery|electric|electricity|water|bill|internet|bus|transit|gas|tuition|textbooks?|pharmacy|insurance|phone bill)\b/i;
  const round2 = n => Math.round(n * 100) / 100;
  const money = n => n.toFixed(2);

  function stateFor(budget, start) {
    if (budget <= 0) return 'dead';
    const pct = budget / start;
    return pct > 0.5 ? 'happy' : pct > 0.2 ? 'okay' : 'sick';
  }

  function paceState(budget, start, day, days) {
    if (budget <= 0) return 'dead';
    const expected = start * (1 - day / days);
    const ratio = budget / Math.max(expected, 1);
    return ratio >= 0.9 ? 'happy' : ratio >= 0.6 ? 'okay' : 'sick';
  }

  function worst(a, b) {
    return ORDER[Math.max(ORDER.indexOf(a), ORDER.indexOf(b))];
  }

  function mood(budget, start, day, days) {
    const base = stateFor(budget, start);
    if (!day || base === 'dead') return base;
    return worst(base, paceState(budget, start, day, days));
  }

  function paceGap(budget, start, day, days) {
    return round2(budget - start * (1 - day / days));
  }

  function allowance(budget, day, days) {
    const left = Math.max(days - day + 1, 1);
    return Math.max(budget, 0) / left;
  }

  function categorize(name) {
    return NEED_RE.test(name) ? 'need' : 'want';
  }

  function parseCSV(text) {
    const rows = [], errors = [];
    let first = true;
    String(text).split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      if (first && /date/i.test(line)) { first = false; return; }
      first = false;
      const parts = line.split(',').map(s => s.trim());
      const date = new Date(parts[0]);
      const name = parts[1];
      const cost = parseFloat(String(parts[2] || '').replace(/[^\d.]/g, ''));
      if (!name || isNaN(cost) || cost <= 0 || isNaN(date.getTime())) { errors.push(i + 1); return; }
      rows.push({ date, name: name.slice(0, 40), cost: round2(cost) });
    });
    return { rows, errors };
  }

  function toDays(rows) {
    const sorted = rows.slice().sort((a, b) => a.date - b.date);
    if (!sorted.length) return { list: [], days: 30 };
    const t0 = sorted[0].date.getTime();
    const list = sorted.map(r => ({
      name: r.name, cost: r.cost,
      day: Math.floor((r.date.getTime() - t0) / 86400000) + 1
    }));
    return { list, days: Math.max(30, list[list.length - 1].day) };
  }

  const VERDICTS = {
    'natural': 'Natural causes. Needs outweighed wants, so this one is not your fault.',
    'one-big': 'Death by one big decision.',
    'paper-cuts': 'Death by a thousand paper cuts.',
    'lifestyle': 'Death by lifestyle. Wants outran needs.'
  };

  function autopsy(tx, start) {
    const sum = list => round2(list.reduce((s, t) => s + t.cost, 0));
    const total = sum(tx);
    const needs = sum(tx.filter(t => t.category === 'need'));
    const wants = round2(total - needs);
    const small = tx.filter(t => t.cost <= 15);
    const smallTotal = sum(small);
    
    let biggest = null;
    tx.forEach(t => { if (!biggest || t.cost > biggest.cost) biggest = t; });
    const weapon = tx.length ? tx[tx.length - 1] : null;
    const suspects = tx.slice().sort((x, y) => y.cost - x.cost).slice(0, 3);
    const biggestShare = biggest ? biggest.cost / start : 0;
    const smallShare = total ? smallTotal / total : 0;
    
    let verdictKey;
    if (needs > wants) verdictKey = 'natural';
    else if (biggestShare > 0.4) verdictKey = 'one-big';
    else if (small.length > 3 && smallShare > 0.2) verdictKey = 'paper-cuts';
    else verdictKey = 'lifestyle';
    
    return {
      total, needs, wants,
      wantsPct: total ? Math.round((wants / total) * 100) : 0,
      smallCount: small.length, smallTotal,
      biggest, weapon, suspects,
      verdictKey, verdict: VERDICTS[verdictKey],
      overspent: Math.max(0, round2(total - start)),
      caseNo: 1000 + Math.round((total % 100) * 90)
    };
  }

  return {
    ORDER, round2, money, stateFor, paceState, worst, mood, paceGap, allowance,
    categorize, parseCSV, toDays, autopsy
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;