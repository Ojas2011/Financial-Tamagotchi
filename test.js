const out = [];
function check(name, ok) { out.push((ok ? 'PASS ' : 'FAIL ') + name); }

check('500 of 500 is happy', Engine.stateFor(500, 500) === 'happy');
check('just above 50% is happy', Engine.stateFor(251, 500) === 'happy');
check('exactly 50% is okay', Engine.stateFor(250, 500) === 'okay');
check('just above 20% is okay', Engine.stateFor(101, 500) === 'okay');
check('exactly 20% is sick', Engine.stateFor(100, 500) === 'sick');
check('$0.01 left is sick', Engine.stateFor(0.01, 500) === 'sick');
check('$0 is dead', Engine.stateFor(0, 500) === 'dead');

check('on pace is happy', Engine.paceState(500, 500, 1, 30) === 'happy');
check('behind pace is okay', Engine.paceState(250, 500, 10, 30) === 'okay');
check('far behind pace is sick', Engine.paceState(100, 500, 10, 30) === 'sick');
check('mood uses the worse state', Engine.mood(280, 500, 10, 30) === 'okay');
check('mood without a day uses percent', Engine.mood(300, 500, null, 30) === 'okay');
check('paceGap is negative when behind', Engine.paceGap(250, 500, 10, 30) < 0);
check('allowance is budget / days left', Math.abs(Engine.allowance(300, 21, 30) - 30) < 0.001);

check('Groceries is a need', Engine.categorize('Groceries') === 'need');
check('Bus pass is a need', Engine.categorize('Bus pass') === 'need');
check('Vegas trip is a want', Engine.categorize('Vegas trip') === 'want');
check('Business cards is a want', Engine.categorize('Business cards') === 'want');

const r = Engine.parseCSV("date,name,amount\n2026-11-03,Coffee, 4.50\nbad line\n2026-11-05, Groceries, $40");
check('CSV keeps 2 good rows', r.rows.length === 2);
check('CSV reports 1 bad line (3)', r.errors.length === 1 && r.errors[0] === 3);
check('CSV strips a $ sign', r.rows[1].cost === 40);

const d = Engine.toDays(r.rows);
check('toDays: day numbers', d.list[0].day === 1 && d.list[1].day === 3);
check('toDays: at least 30 days', d.days === 30);

const a = Engine.autopsy([
  { name: 'Rent', cost: 300, category: 'need' },
  { name: 'Coffee', cost: 5, category: 'want' },
  { name: 'Snack', cost: 10, category: 'want' }
], 500);
check('autopsy total', a.total === 315);
check('autopsy needs and wants', a.needs === 300 && a.wants === 15);
check('autopsy biggest', a.biggest.name === 'Rent');
check('autopsy small regrets', a.smallCount === 2 && a.smallTotal === 15);
check('autopsy overspent = 0', a.overspent === 0);
check('autopsy: weapon is the last purchase', a.weapon.name === 'Snack');
check('autopsy: suspects are the 3 biggest', a.suspects.map(x => x.name).join(', ') === 'Rent, Snack, Coffee');
check('verdict: needs outweigh wants = natural causes', a.verdictKey === 'natural');

const big = Engine.autopsy([
  { name: 'Iced coffee', cost: 400, category: 'want' }, 
  { name: 'Burger', cost: 70, category: 'want' }
], 500);
check('verdict: one big decision', big.verdictKey === 'one-big');

const cuts = Engine.autopsy([1,2,3,4,5,6].map(i => ({ name: 'Snack', cost: 10, category: 'want' })).concat([{ name: 'Shoes', cost: 60, category: 'want' }, { name: 'Concert', cost: 85, category: 'want' }]), 500);
check('verdict: thousand paper cuts', cuts.verdictKey === 'paper-cuts');

const life = Engine.autopsy([
  { name: 'Sneakers', cost: 100, category: 'want' },
  { name: 'Takeout', cost: 31.4, category: 'want' }
], 500);
check('verdict: lifestyle', life.verdictKey === 'lifestyle');
check('case number is 4 digits', String(a.caseNo).length === 4);

out.push('');
out.push(out.filter(l => l.startsWith('FAIL')).length === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
if (typeof document !== 'undefined') document.getElementById('out').textContent = out.join('\n');
else console.log(out.join('\n'));