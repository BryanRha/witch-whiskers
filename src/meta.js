// 게임 밖 성장: 마녀 강화 · 고양이 입양/성장 · 미션 · 출석 · 업적 · 산책 · 상점 · 주간 랭킹
// 확률형 뽑기 없음 — 고양이는 비행 중 모은 발바닥 도장으로 "정해 둔 고양이"를 입양한다.
import { load, save, todayKey, weekKey } from './save.js';

export const WITCH_INFO = {
  luna: { name: '루나', title: '별빛 마녀', desc: '별빛 마법탄 · 코인 +10%', unlock: null, color: 0xB89AFF },
  pia: { name: '피아', title: '불꽃 마녀', desc: '불꽃탄 · 처치 시 양옆에 불똥', unlock: { coins: 15000 }, color: 0xFF7A8A },
  ciel: { name: '시엘', title: '얼음 마녀', desc: '얼음탄 · 5발마다 빙결 (피해 1.5배)', unlock: { gems: 120 }, color: 0x7AD8FF },
  volt: { name: '볼트', title: '번개 마녀', desc: '번개탄 · 3발마다 옆 칸 연쇄', unlock: { crystals: 30 }, color: 0xFFE14D },
};
export const WITCH_ORDER = ['luna', 'pia', 'ciel', 'volt'];
export const WITCH_MAX = 30;
// 마법탄 단계 (마녀 레벨 5·10·20·30 에서 진화)
export const SHOT_TIERS = [5, 10, 20, 30];
export const shotTier = lv => SHOT_TIERS.filter(v => lv >= v).length + 1;
export const witchUpCost = lv => Math.round(300 * Math.pow(1.19, lv - 1) / 10) * 10;

export const CAT_INFO = {
  cheese: { name: '치즈', paws: 0, desc: '털뭉치 공격' },
  tuxedo: { name: '턱시도', paws: 12, desc: '털뭉치 공격' },
  tabby: { name: '고등어', paws: 16, desc: '털뭉치 공격' },
  calico: { name: '삼색이', paws: 22, desc: '털뭉치 공격' },
  russian: { name: '러시안블루', paws: 18, desc: '아이템·코인 끌어당기기' },
  persian: { name: '페르시안', paws: 26, desc: '주기적으로 보호막' },
  munchkin: { name: '먼치킨', paws: 20, desc: '코인 획득 +10%' },
  ragdoll: { name: '랙돌', paws: 32, desc: '주기적으로 보호막' },
  mainecoon: { name: '메인쿤', paws: 28, desc: '간식 발견 · 산책 보상↑' },
  siamese: { name: '샴', paws: 24, desc: '간식 발견 · 산책 보상↑' },
  scottish: { name: '스코티시', paws: 30, desc: '간식 발견 · 산책 보상↑' },
  sphynx: { name: '스핑크스', paws: 40, desc: '간식 발견 · 산책 보상↑' },
};
export const CAT_ORDER = Object.keys(CAT_INFO);
export const CAT_MAX = 20;
export const catUpCost = lv => ({ treats: 1 + Math.floor(lv * 0.8), coins: 200 * lv });
export const ROLE_NAME = { attack: '공격', support: '지원', explore: '탐험' };

export const BOOSTERS = { dash: { name: '출발 대시', cost: 400, desc: '시작하자마자 혜성 대시' }, shield: { name: '보호막', cost: 250, desc: '한 번 막아 주는 보호막' } };
export const REVIVE_COST = [5, 10, 20];

export const ZONES = ['별빛 마을', '속삭이는 숲', '구름 바다', '호박 언덕', '달빛 성'];
export const BOSS_NAME = { ghostship: '유령 해적선', moonrabbit: '달토끼 대장', rival: '라이벌 마녀 노아' };
export const ITEM_NAME = { twin: '쌍둥이 마법!', magnet: '방울 자석!', star: '별가루 ×2!', dash: '혜성 대시!' };

// ── 마녀 ──────────────────────────────────────────────
export function witchLevel(id) { return load().witches[id] || 0; }
export function canAfford(cost) { const d = load(); return Object.entries(cost).every(([k, v]) => (d[k] || 0) >= v); }
export function pay(cost) { const d = load(); if (!canAfford(cost)) return false; for (const [k, v] of Object.entries(cost)) d[k] -= v; save(); return true; }
export function unlockWitch(id) { const d = load(); if (d.witches[id] || !pay(WITCH_INFO[id].unlock)) return false; d.witches[id] = 1; d.witch = id; save(); return true; }
export function upgradeWitch(id) {
  const d = load(), lv = d.witches[id];
  if (!lv || lv >= WITCH_MAX || !pay({ coins: witchUpCost(lv) })) return false;
  d.witches[id] = lv + 1; save(); return true;
}

// ── 고양이 ────────────────────────────────────────────
export function catLevel(id) { return load().cats[id] || 0; }
export function setAdopt(id) { const d = load(); if (d.cats[id]) return; d.adopt = id; save(); }
export function addPaws(n) {
  const d = load();
  if (!d.adopt || !n) return null;
  d.paws[d.adopt] = (d.paws[d.adopt] || 0) + n;
  save();
  return d.adopt;
}
export function canAdopt(id) { const d = load(); return !d.cats[id] && (d.paws[id] || 0) >= CAT_INFO[id].paws; }
export function adopt(id) {
  const d = load();
  if (!canAdopt(id)) return false;
  d.cats[id] = 1; d.paws[id] = 0;
  if (!d.equip[1]) d.equip[1] = id; else if (!d.equip[0]) d.equip[0] = id;
  d.adopt = CAT_ORDER.find(c => !d.cats[c]) || null;
  save(); return true;
}
export function upgradeCat(id) {
  const d = load(), lv = d.cats[id];
  if (!lv || lv >= CAT_MAX || !pay(catUpCost(lv))) return false;
  d.cats[id] = lv + 1; save(); return true;
}
export function toggleEquip(id) {
  const d = load();
  if (!d.cats[id]) return;
  const i = d.equip.indexOf(id);
  if (i >= 0) d.equip[i] = null;
  else { const free = d.equip.indexOf(null); d.equip[free >= 0 ? free : 1] = id; }
  if (d.walk.cat === id) d.walk = { cat: null, until: 0 };
  save();
}

// ── 산책 (탐험): 고양이 한 마리를 보내면 일정 시간 뒤 보상 ──────────
export const WALK_MIN = 30;
export function walkReward(id) {
  const lv = catLevel(id), explorer = ['mainecoon', 'siamese', 'scottish', 'sphynx'].includes(id);
  return { coins: 300 + lv * 60 + (explorer ? 300 : 0), treats: 1 + Math.floor(lv / 5) + (explorer ? 2 : 0) };
}
export function startWalk(id) { const d = load(); if (d.walk.cat || !d.cats[id] || d.equip.includes(id)) return false; d.walk = { cat: id, until: Date.now() + WALK_MIN * 60000 }; save(); return true; }
export function walkLeft() { const d = load(); return d.walk.cat ? Math.max(0, d.walk.until - Date.now()) : 0; }
export function finishWalk(skipWithGems = false) {
  const d = load();
  if (!d.walk.cat) return null;
  if (walkLeft() > 0) { if (!skipWithGems || !pay({ gems: 5 })) return null; }
  const r = walkReward(d.walk.cat);
  d.coins += r.coins; d.treats += r.treats; d.walk = { cat: null, until: 0 };
  save(); return r;
}

// ── 일일 미션 (날마다 3개) ─────────────────────────────
const MISSION_POOL = [
  { id: 'dist1', kind: 'runDist', goal: 1000, text: '한 번에 1,000m 날기', reward: { gems: 3 } },
  { id: 'dist2', kind: 'runDist', goal: 2500, text: '한 번에 2,500m 날기', reward: { gems: 6 } },
  { id: 'kills', kind: 'kills', goal: 300, text: '몬스터 300마리 물리치기', reward: { coins: 600 } },
  { id: 'kills2', kind: 'kills', goal: 800, text: '몬스터 800마리 물리치기', reward: { gems: 5 } },
  { id: 'coins', kind: 'coins', goal: 400, text: '코인 400개 모으기', reward: { treats: 2 } },
  { id: 'boss', kind: 'bosses', goal: 1, text: '보스 1마리 물리치기', reward: { gems: 4 } },
  { id: 'boss3', kind: 'bosses', goal: 3, text: '보스 3마리 물리치기', reward: { crystals: 3 } },
  { id: 'items', kind: 'items', goal: 5, text: '마법 아이템 5개 줍기', reward: { coins: 500 } },
  { id: 'runs', kind: 'runs', goal: 5, text: '5번 비행하기', reward: { treats: 2 } },
];
export function missions() {
  const d = load(), day = todayKey();
  if (d.missions.date !== day) {
    let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const pool = MISSION_POOL.slice(), list = [];
    while (list.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const m = pool.splice(h % pool.length, 1)[0]; if (!list.some(x => x.kind === m.kind)) list.push({ id: m.id, prog: 0, claimed: false }); }
    d.missions = { date: day, list };
    save();
  }
  return d.missions.list.map(m => ({ ...MISSION_POOL.find(p => p.id === m.id), ...m, done: m.prog >= MISSION_POOL.find(p => p.id === m.id).goal }));
}
export function claimMission(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = MISSION_POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return null;
  m.claimed = true; for (const [k, v] of Object.entries(def.reward)) d[k] += v; save(); return def.reward;
}

// ── 업적 (단계별) ─────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'best', text: '최고 거리 {g}m', stat: () => load().bestDist, goals: [1000, 3000, 6000, 10000, 20000], reward: [5, 10, 20, 30, 50] },
  { id: 'kills', text: '몬스터 {g}마리 처치', stat: () => load().totals.kills, goals: [500, 3000, 10000, 30000, 100000], reward: [5, 10, 15, 25, 40] },
  { id: 'bosses', text: '보스 {g}마리 처치', stat: () => load().totals.bosses, goals: [1, 10, 30, 100, 300], reward: [5, 10, 15, 25, 40] },
  { id: 'cats', text: '고양이 {g}마리 가족', stat: () => Object.keys(load().cats).length, goals: [2, 4, 6, 9, 12], reward: [10, 15, 20, 30, 60] },
  { id: 'srank', text: '보스 S랭크 {g}번', stat: () => load().totals.sRank, goals: [1, 5, 20, 60, 150], reward: [5, 10, 15, 25, 40] },
  { id: 'dist', text: '누적 비행 {g}m', stat: () => load().totals.dist, goals: [10000, 50000, 200000, 500000, 1000000], reward: [5, 10, 20, 30, 50] },
];
export function achState(a) {
  const tier = load().ach[a.id] || 0, done = tier >= a.goals.length;
  const goal = a.goals[Math.min(tier, a.goals.length - 1)];
  return { tier, done, goal, val: a.stat(), ready: !done && a.stat() >= goal, reward: done ? 0 : a.reward[tier], text: a.text.replace('{g}', goal.toLocaleString()) };
}
export function claimAch(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id), st = achState(a);
  if (!st.ready) return 0;
  const d = load(); d.ach[id] = st.tier + 1; d.gems += st.reward; save(); return st.reward;
}
export function notices() {
  return {
    missions: missions().some(m => m.done && !m.claimed),
    ach: ACHIEVEMENTS.some(a => achState(a).ready),
    daily: load().daily.last !== todayKey(),
    cats: CAT_ORDER.some(canAdopt) || (load().walk.cat && walkLeft() === 0),
  };
}

// ── 출석 (7일 주기) ────────────────────────────────────
export const DAILY = [{ coins: 500 }, { treats: 3 }, { gems: 5 }, { coins: 1500 }, { treats: 5 }, { crystals: 5 }, { gems: 20 }];
export function dailyState() { const d = load(); return { day: d.daily.streak % 7, can: d.daily.last !== todayKey() }; }
export function claimDaily() {
  const d = load(); if (d.daily.last === todayKey()) return null;
  const r = DAILY[d.daily.streak % 7];
  for (const [k, v] of Object.entries(r)) d[k] += v;
  d.daily.streak++; d.daily.last = todayKey(); save(); return r;
}

// ── 비행 결과 반영 ─────────────────────────────────────
export function applyRun(r) {
  const d = load(), out = { newBest: false, adopted: null };
  d.coins += r.coins; d.gems += r.gems; d.treats += r.treats; d.crystals += r.crystals;
  const pawCat = addPaws(r.paws);
  out.pawCat = pawCat;
  if (r.score > d.best) { d.best = r.score; out.newBest = true; }
  if (r.dist > d.bestDist) d.bestDist = r.dist;
  const wk = weekKey();
  if (d.weekly.week !== wk) d.weekly = { week: wk, best: 0 };
  d.weekly.best = Math.max(d.weekly.best, r.score);
  const t = d.totals;
  t.runs++; t.dist += r.dist; t.kills += r.kills; t.bosses += r.bosses; t.coins += r.coins; t.sRank += r.sRank; t.items += r.items;
  missions();
  for (const m of d.missions.list) {
    const def = MISSION_POOL.find(p => p.id === m.id);
    const add = { runDist: 0, kills: r.kills, coins: r.coins, bosses: r.bosses, items: r.items, runs: 1 }[def.kind];
    m.prog = def.kind === 'runDist' ? Math.max(m.prog, r.dist) : m.prog + add;
  }
  save();
  return out;
}

// ── 주간 랭킹 (연습 상대: 게임 속 마녀들) ─────────────────
const RIVALS = [['노아', 'rival'], ['세라', 'luna'], ['미르', 'ciel'], ['하루', 'pia'], ['비비', 'volt'], ['토토', 'luna'], ['엘라', 'ciel'], ['코코', 'pia'], ['모모', 'volt'], ['리리', 'luna']];
export function ranking() {
  const d = load(), wk = weekKey();
  let h = 0; for (const c of wk) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  const scale = Math.max(30000, d.best * 0.9);
  const list = RIVALS.map(([name, w], i) => { h = (h * 1103515245 + 12345) >>> 0; return { name, w, score: Math.round(scale * (2.2 - i * 0.2) * (0.8 + (h % 400) / 1000) / 10) * 10 }; });
  list.push({ name: '나', w: d.witch, score: d.weekly.week === wk ? d.weekly.best : 0, me: true });
  list.sort((a, b) => b.score - a.score);
  return list;
}

// ── 상점 (게임 재화 교환만 — 현금 결제는 출시 단계에서 연결) ─────
export const SHOP = [
  { id: 'c1', give: { coins: 3000 }, cost: { gems: 10 }, label: '코인 3,000' },
  { id: 'c2', give: { coins: 10000 }, cost: { gems: 30 }, label: '코인 10,000' },
  { id: 't1', give: { treats: 5 }, cost: { gems: 8 }, label: '간식 5개' },
  { id: 't2', give: { treats: 5 }, cost: { crystals: 4 }, label: '간식 5개' },
  { id: 'g1', give: { gems: 10 }, cost: { crystals: 6 }, label: '별가루 10' },
  { id: 'p1', give: { paws: 5 }, cost: { gems: 15 }, label: '발바닥 도장 5' },
];
export function buy(id) {
  const it = SHOP.find(s => s.id === id), d = load();
  if (it.give.paws && !d.adopt) return false;
  if (!pay(it.cost)) return false;
  for (const [k, v] of Object.entries(it.give)) { if (k === 'paws') addPaws(v); else d[k] += v; }
  save(); return true;
}
