// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'witch_whiskers_v1';
let data = null;

function fresh() {
  return {
    v: 1, coins: 800, gems: 30, treats: 6, crystals: 0,
    witch: 'luna', witches: { luna: 1 },
    cats: { cheese: 1 }, equip: ['cheese', null], adopt: 'tuxedo', paws: {},
    boosters: { dash: false, shield: false },
    best: 0, bestDist: 0, weekly: { week: '', best: 0 },
    totals: { runs: 0, dist: 0, kills: 0, bosses: 0, coins: 0, sRank: 0, items: 0 },
    missions: { date: '', list: [] }, daily: { last: '', streak: 0 }, ach: {},
    walk: { cat: null, until: 0 },
    sfx: true, music: true, tutorial: false, tips: {}, createdAt: Date.now(),
  };
}

export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  for (const k of Object.keys(f.totals)) if (data.totals[k] === undefined) data.totals[k] = 0;
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* 저장 공간 없음 */ } }
export function reset() { data = fresh(); save(); }
export function todayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
export function weekKey(d = new Date()) { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return todayKey(t); }
