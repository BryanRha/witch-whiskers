// 한 판 시뮬레이션 — 화면과 무관한 순수 로직 (브라우저·Node 공용, 봇 밸런싱에 사용)
// 좌표: 가로 1080, 세로 H(기본 1920). 마녀는 아래쪽 고정 높이에서 좌우로만 움직인다.
// 화면 쪽은 매 프레임 sim.step(dt) 후 sim.s(상태)와 sim.events(사건)를 읽어 그린다.

export const W = 1080;
export const LANES = 5;
export const LANE_W = W / LANES;
export const PX_PER_M = 20;            // 스크롤 20px = 1m
export const BOSS_EVERY = 1500;        // m
export const ZONE_EVERY = 2000;        // m (배경 구간)

// 적 종류: 체력 배수(기본 체력 b(거리) 대비) · 점수 배수
export const ENEMY = {
  bat: { hp: 1, tier: 0 }, ghost: { hp: 2, tier: 1 }, pumpkin: { hp: 4, tier: 2 }, crow: { hp: 7, tier: 3 }, golem: { hp: 12, tier: 4 },
  firebat: { hp: 1, tier: 0, special: 'explode' }, chest: { hp: 3, tier: 1, special: 'chest' },
  eliteFire: { hp: 5, tier: 2, special: 'elite' }, eliteIce: { hp: 5, tier: 2, special: 'elite' }, eliteSteel: { hp: 6, tier: 3, special: 'elite' },
  skull: { hp: 2, tier: 1 },   // 보스 졸개
};
const TIERS = ['bat', 'ghost', 'pumpkin', 'crow', 'golem'];
export const ITEMS = ['twin', 'magnet', 'star', 'dash'];
export const ITEM_TIME = { twin: 8, magnet: 8, star: 8, dash: 3.5 };
export const BOSSES = ['ghostship', 'moonrabbit', 'rival'];

// 마녀: 마법 속성 · 고유 능력
export const WITCHES = {
  luna: { element: 'star', passive: 'coin10' },
  pia: { element: 'fire', passive: 'splash' },
  ciel: { element: 'ice', passive: 'freeze' },
  volt: { element: 'bolt', passive: 'chain' },
};
// 고양이 능력 (역할별)
export const CATS = {
  cheese: { role: 'attack', shot: 'furball' }, tuxedo: { role: 'attack', shot: 'furball' }, tabby: { role: 'attack', shot: 'furball' }, calico: { role: 'attack', shot: 'furball' },
  russian: { role: 'support', ability: 'magnet' }, persian: { role: 'support', ability: 'shield' }, munchkin: { role: 'support', ability: 'coin' }, ragdoll: { role: 'support', ability: 'shield' },
  mainecoon: { role: 'explore', ability: 'treat' }, siamese: { role: 'explore', ability: 'treat' }, scottish: { role: 'explore', ability: 'treat' }, sphynx: { role: 'explore', ability: 'treat' },
};

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class Run {
  // opts: { seed, H, witch, witchLevel, cats: [{id, level}], boosters: {dash, shield}, adoptTarget }
  constructor(opts = {}) {
    this.R = rng(opts.seed ?? 1);
    const H = opts.H || 1920;
    const wl = opts.witchLevel || 1;
    const witch = WITCHES[opts.witch || 'luna'];
    this.s = {
      H, t: 0, dist: 0, speed: 380, score: 0, coins: 0, gems: 0, treats: 0, paws: 0, crystals: 0, kills: 0,
      status: 'play', revived: 0, nextId: 1, zone: 0,
      witch: opts.witch || 'luna', element: witch.element, passive: witch.passive,
      // 공격력: 레벨당 +12%, 발사 간격 0.125s → 레벨 30에서 0.09s
      level: wl, dmg: 1 + 0.12 * (wl - 1), fireGap: Math.max(0.09, 0.125 - 0.0012 * (wl - 1)), fireT: 0, shotCount: 0,
      player: { x: W / 2, y: H - 470, tx: W / 2, r: 34, shield: (opts.boosters && opts.boosters.shield) ? 1 : 0, inv: 0 },
      items: { twin: 0, magnet: 0, star: 0, dash: (opts.boosters && opts.boosters.dash) ? 4 : 0 },
      cats: (opts.cats || []).filter(Boolean).map((c, i) => ({ ...c, ...CATS[c.id], side: i ? 1 : -1, t: 0, lv: c.level || 1 })),
      bullets: [], enemies: [], drops: [], meteors: [], ebullets: [], marks: [],
      boss: null, bossCount: 0, nextBoss: BOSS_EVERY, rowY: -9999, nextRowAt: 0, nextMeteor: 500,
      adoptTarget: opts.adoptTarget || null,
    };
    this.events = [];
    this.s.rowY = 0;
  }

  ev(type, data) { this.events.push({ type, ...data }); }
  id() { return this.s.nextId++; }
  base() { return 1 + this.s.dist / 380; }                      // 적 기본 체력
  laneX(l) { return LANE_W * (l + 0.5); }

  // 손가락으로 지정한 목표 x (화면 쪽에서 매 프레임 갱신)
  setTarget(x) { this.s.player.tx = Math.max(60, Math.min(W - 60, x)); }

  step(dt) {
    const s = this.s;
    if (s.status !== 'play') return;
    this.events.length = 0;
    s.t += dt;
    const p = s.player;
    // 이동: 목표를 빠르게 따라감 (손가락보다 살짝 늦게 — 손맛)
    const k = 1 - Math.exp(-dt * 22);
    p.x += (p.tx - p.x) * k;

    // 속도·거리 (보스전엔 절반, 혜성 대시엔 2.5배)
    const target = 380 + 560 * (1 - Math.exp(-s.dist / 4200));
    const mult = s.items.dash > 0 ? 2.5 : s.boss ? 0.45 : 1;
    s.speed = target * mult;
    const dy = s.speed * dt;
    s.dist += dy / PX_PER_M;
    const zone = Math.floor(s.dist / ZONE_EVERY);
    if (zone !== s.zone) { s.zone = zone; this.ev('zone', { zone }); }

    for (const k2 of ITEMS) if (s.items[k2] > 0) { s.items[k2] -= dt; if (s.items[k2] <= 0) { s.items[k2] = 0; this.ev('itemEnd', { item: k2 }); } }
    if (p.inv > 0) p.inv -= dt;

    this.fire(dt);
    this.catsAct(dt);
    this.spawn(dy);
    this.moveAll(dt, dy);
    this.collide();
    if (s.boss) this.bossAct(dt);
    this.collect(dt);
  }

  // ── 발사 ──────────────────────────────────────────────────
  fire(dt) {
    const s = this.s, p = s.player;
    s.fireT -= dt;
    while (s.fireT <= 0) {
      s.fireT += s.fireGap;
      s.shotCount++;
      const twin = s.items.twin > 0;
      const xs = twin ? [p.x - 34, p.x + 34] : [p.x];
      for (const x of xs) s.bullets.push({ id: this.id(), x, y: p.y - 70, vy: -1900, dmg: s.dmg, kind: s.element, n: s.shotCount });
      this.ev('shot', {});
    }
  }

  catsAct(dt) {
    const s = this.s, p = s.player;
    for (const c of s.cats) {
      c.t -= dt;
      if (c.role === 'attack' && c.t <= 0) {
        c.t = Math.max(0.55, 1.0 - c.lv * 0.02);
        s.bullets.push({ id: this.id(), x: p.x + c.side * 120, y: p.y - 20, vy: -1500, dmg: s.dmg * (1.6 + c.lv * 0.12), kind: 'furball' });
        this.ev('catShot', { side: c.side });
      }
      if (c.ability === 'shield' && c.t <= 0) {
        c.t = Math.max(12, 22 - c.lv * 0.4);
        if (!p.shield) { p.shield = 1; this.ev('shield', {}); }
      }
    }
  }

  // ── 생성: 적 줄 · 별똥별 · 보스 ─────────────────────────────
  spawn(dy) {
    const s = this.s;
    // 보스 등장 (거리 도달 → 경고 → 3초 뒤 등장)
    if (!s.boss && s.dist >= s.nextBoss) {
      const type = BOSSES[s.bossCount % BOSSES.length];
      const lvl = 1 + s.bossCount;
      const hp = Math.round(24 * this.base() * (1 + 0.3 * s.bossCount));   // 첫 보스: 레벨 1 기준 약 25~35초
      s.boss = { id: this.id(), type, lvl, hp, maxHp: hp, x: W / 2, y: -320, state: 'warn', t: 3, age: 0, phase: 1, pt: 1.5, pt2: 3, pt3: 6, ang: 0, dashing: 0 };
      s.bossCount++;
      this.ev('bossWarn', { boss: type });
    }
    // 줄은 보스 경고~전투 중엔 안 나옴
    if (!s.boss) {
      s.rowY += dy;
      const gap = 560 + s.speed * 0.55;
      if (s.rowY >= gap) { s.rowY = 0; this.spawnRow(); }
      // 별똥별
      // 줄이 마녀 가까이 내려오는 동안엔 미룸 (뚫는 칸과 겹쳐 피할 수 없는 상황 방지)
      const rowNear = s.enemies.some(e => e.y > s.player.y - 1150 && e.y < s.player.y + 60);
      if (s.dist >= s.nextMeteor && !rowNear) {
        s.nextMeteor = s.dist + 420 + this.R() * 300;
        const lanes = [this.laneOf(s.player.x)];
        if (s.dist > 1200 && this.R() < 0.4) lanes.push((lanes[0] + 1 + Math.floor(this.R() * 4)) % LANES);
        for (const l of lanes) s.meteors.push({ id: this.id(), lane: l, x: this.laneX(l), warn: 1.0, y: -200, big: this.R() < 0.25 });
        this.ev('meteorWarn', { lanes });
      }
    }
  }
  laneOf(x) { return Math.max(0, Math.min(LANES - 1, Math.floor(x / LANE_W))); }

  spawnRow() {
    const s = this.s, R = this.R, d = s.dist;
    const T = Math.min(4, d / 750);                    // 기준 등급 (거리에 따라 연속)
    const row = [];
    for (let l = 0; l < LANES; l++) {
      let tier = Math.round(T + (R() - 0.5) * 1.6);
      row.push(Math.max(0, Math.min(4, tier)));
    }
    // 뚫을 곳: 약한 칸 1~2개 (뒤로 갈수록 1개)
    const weak = d < 2500 ? 2 : 1;
    for (let i = 0; i < weak; i++) row[Math.floor(R() * LANES)] = Math.max(0, Math.floor(T) - 1 - (d < 600 ? 1 : 0));
    const kinds = row.map(t => TIERS[t]);
    // 특수 칸
    if (d > 150 && R() < 0.09) kinds[Math.floor(R() * LANES)] = 'firebat';
    if (d > 250 && R() < 0.06) kinds[Math.floor(R() * LANES)] = 'chest';
    if (d > 800 && R() < 0.035) kinds[Math.floor(R() * LANES)] = ['eliteFire', 'eliteIce', 'eliteSteel'][Math.floor(R() * 3)];
    const b = this.base();
    const rowId = this.id();
    kinds.forEach((kind, l) => {
      const hp = Math.ceil(ENEMY[kind].hp * b);
      s.enemies.push({ id: this.id(), row: rowId, kind, lane: l, x: this.laneX(l), y: -110, hp, maxHp: hp, frozen: 0, wob: R() * 6.28 });
    });
  }

  // ── 이동 ──────────────────────────────────────────────────
  moveAll(dt, dy) {
    const s = this.s, H = s.H;
    for (const b of s.bullets) b.y += b.vy * dt;
    s.bullets = s.bullets.filter(b => b.y > -120 && !b.dead);
    for (const e of s.enemies) { e.y += dy * (e.kind === 'skull' ? 1.3 : 1) + (e.vy || 0) * dt; if (e.frozen > 0) e.frozen -= dt; }
    const gone = s.enemies.filter(e => e.y > H + 120);
    if (gone.length) s.enemies = s.enemies.filter(e => e.y <= H + 120);
    for (const d of s.drops) { d.y += (dy * 0.55 + d.vy * dt); d.vy = Math.min(d.vy + 900 * dt, 400); d.x += d.vx * dt; d.vx *= 0.96; }
    s.drops = s.drops.filter(d => d.y < H + 80 && !d.got);
    for (const m of s.meteors) {
      if (m.warn > 0) { m.warn -= dt; if (m.warn <= 0) this.ev('meteorFall', { lane: m.lane }); continue; }
      m.y += 2600 * dt;
    }
    s.meteors = s.meteors.filter(m => m.y < H + 300 && !m.dead);
    for (const b of s.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    s.ebullets = s.ebullets.filter(b => b.y < H + 60 && b.y > -200 && b.x > -60 && b.x < W + 60);
    for (const m of s.marks) m.t -= dt;
    const boom = s.marks.filter(m => m.t <= 0);
    for (const m of boom) {
      this.ev('markBoom', { x: m.x, y: m.y, r: m.r });
      if (Math.hypot(s.player.x - m.x, s.player.y - m.y) < m.r + s.player.r * 0.6) this.hurt('mark');
    }
    s.marks = s.marks.filter(m => m.t > 0);
  }

  // ── 충돌 ──────────────────────────────────────────────────
  collide() {
    const s = this.s, p = s.player;
    // 내 탄 → 적
    for (const b of s.bullets) {
      if (b.dead) continue;
      for (const e of s.enemies) {
        if (e.hp <= 0 || Math.abs(b.x - e.x) > 92 || Math.abs(b.y - e.y) > 75) continue;
        b.dead = true;
        this.damage(e, b.dmg, b);
        break;
      }
      if (!b.dead && s.boss && s.boss.state === 'fight' && Math.abs(b.x - s.boss.x) < 210 && Math.abs(b.y - s.boss.y) < 170) {
        b.dead = true; this.hitBoss(b.dmg, b);
      }
      if (!b.dead) for (const m of s.meteors) {
        if (m.warn > 0 || !m.big || Math.abs(b.x - m.x) > 70 || Math.abs(b.y - m.y) > 90) continue;
        b.dead = true; m.hp = (m.hp ?? 6 * this.base()) - b.dmg;
        if (m.hp <= 0) { m.dead = true; this.ev('meteorBreak', { x: m.x, y: m.y }); this.drop('gem', m.x, m.y, 2); s.score += 500; }
        break;
      }
    }
    // 적 → 나
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      // 충돌 판정은 그림보다 작게 (뚫린 칸 안에서 손가락이 조금 흔들려도 괜찮게)
      if (Math.abs(e.x - p.x) < 62 + p.r * 0.4 && Math.abs(e.y - p.y) < 64) {
        if (s.items.dash > 0) { e.hp = 0; this.kill(e, true); continue; }
        if (this.hurt('enemy', e)) { e.hp = 0; this.kill(e, false); }
      }
    }
    for (const m of s.meteors) {
      if (m.warn > 0 || m.dead) continue;
      if (Math.abs(m.x - p.x) < 60 + p.r * 0.5 && Math.abs(m.y - p.y) < 90) { if (s.items.dash > 0) { m.dead = true; continue; } this.hurt('meteor'); m.dead = true; }
    }
    for (const b of s.ebullets) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r * 0.55) { b.y = 99999; this.hurt('bullet'); }
    }
    if (s.boss && s.boss.state === 'fight' && Math.abs(s.boss.x - p.x) < 150 && Math.abs(s.boss.y - p.y) < 130) this.hurt('boss');
    s.enemies = s.enemies.filter(e => e.hp > 0);
  }

  // 피격: 대시·무적·보호막 순서로 막음. 실패하면 판 종료
  hurt(src) {
    const s = this.s, p = s.player;
    if (s.items.dash > 0 || p.inv > 0) return false;
    if (p.shield) { p.shield = 0; p.inv = 1.2; this.ev('shieldBreak', {}); return true; }
    s.status = 'dead';
    this.ev('dead', { src });
    return true;
  }

  // 이어하기: 주변 위협 제거 + 3초 무적
  revive() {
    const s = this.s;
    s.status = 'play'; s.revived++;
    s.player.inv = 3;
    s.enemies = s.enemies.filter(e => e.y < s.player.y - 700);
    s.ebullets = []; s.meteors = []; s.marks = [];
    this.ev('revive', {});
  }

  damage(e, dmg, b) {
    const s = this.s;
    let d = dmg;
    if (e.frozen > 0) d *= 1.5;
    e.hp -= d;
    this.ev('hit', { id: e.id, x: e.x, y: e.y, kind: b.kind });
    // 마녀 고유 능력
    if (b.kind === 'ice' && b.n % 5 === 0) e.frozen = 1.5;
    if (b.kind === 'bolt' && b.n % 3 === 0) {
      const nb = s.enemies.filter(o => o.row === e.row && Math.abs(o.lane - e.lane) === 1 && o.hp > 0);
      for (const o of nb) { o.hp -= dmg * 0.5; this.ev('chain', { from: [e.x, e.y], to: [o.x, o.y] }); if (o.hp <= 0) this.kill(o, true); }
    }
    if (e.hp <= 0) {
      this.kill(e, true);
      if (b.kind === 'fire') {
        for (const o of s.enemies) if (o.row === e.row && Math.abs(o.lane - e.lane) === 1 && o.hp > 0) { o.hp -= dmg * 0.3 * 4; this.ev('splash', { x: o.x, y: o.y }); if (o.hp <= 0) this.kill(o, true); }
      }
    }
  }

  kill(e, byPlayer) {
    const s = this.s, p = s.player;
    if (e.dead) return; e.dead = true; e.hp = 0;
    s.kills++;
    const close = e.y > p.y - 450;
    const mult = (close ? 2 : 1) * (s.items.star > 0 ? 2 : 1);
    const pts = Math.round(e.maxHp * 10 * mult);
    s.score += pts;
    this.ev('kill', { id: e.id, x: e.x, y: e.y, kind: e.kind, pts, close });
    const sp = ENEMY[e.kind].special;
    if (sp === 'explode') {
      this.ev('explode', { x: e.x, y: e.y });
      for (const o of s.enemies) if (o.row === e.row && o.hp > 0 && o !== e) { o.hp = 0; this.kill(o, true); }
    }
    // 드롭
    const R = this.R;
    if (sp === 'chest') { this.drop('coin', e.x, e.y, 10); this.drop('gem', e.x, e.y, 1 + (R() < 0.3 ? 1 : 0)); if (R() < 0.35) this.drop('item', e.x, e.y, 1); }
    else if (sp === 'elite') { this.drop('crystal', e.x, e.y, 1); this.drop('coin', e.x, e.y, 5); }
    else {
      this.drop('coin', e.x, e.y, 1 + (ENEMY[e.kind].tier >= 2 ? 1 : 0));
      if (R() < 0.018) this.drop('item', e.x, e.y, 1);
      if (s.adoptTarget && R() < 0.02) this.drop('paw', e.x, e.y, 1);
      if (R() < 0.008 + (s.cats.some(c => c.ability === 'treat') ? 0.006 : 0)) this.drop('treat', e.x, e.y, 1);
    }
  }

  drop(kind, x, y, n) {
    const s = this.s, R = this.R;
    for (let i = 0; i < n; i++) {
      const d = { id: this.id(), kind, x, y, vx: (R() - 0.5) * 520, vy: -420 - R() * 300 };
      if (kind === 'item') { d.item = ITEMS[Math.floor(R() * ITEMS.length)]; d.vx *= 0.3; d.vy = -200; }
      s.drops.push(d);
    }
  }

  // ── 줍기 (자석 범위 안이면 끌려옴) ──────────────────────────
  collect(dt) {
    const s = this.s, p = s.player;
    let mag = 120;
    if (s.items.magnet > 0 || s.items.dash > 0) mag = 2000;
    for (const c of s.cats) if (c.ability === 'magnet') mag = Math.max(mag, 240 + c.lv * 8);
    for (const d of s.drops) {
      const dx = p.x - d.x, dy2 = p.y - d.y, dist = Math.hypot(dx, dy2);
      if (dist < mag && d.vy > -100) { const sp = 1600 * dt; d.x += dx / dist * Math.min(sp, dist); d.y += dy2 / dist * Math.min(sp, dist); d.vy = 0; d.vx = 0; }
      if (dist < 70) {
        d.got = true;
        const coinBonus = 1 + (s.passive === 'coin10' ? 0.1 : 0) + s.cats.filter(c => c.ability === 'coin').reduce((a, c) => a + 0.1 + c.lv * 0.01, 0);
        if (d.kind === 'coin') { s.coins += coinBonus; s.score += 20; }
        else if (d.kind === 'gem') s.gems++;
        else if (d.kind === 'paw') s.paws++;
        else if (d.kind === 'treat') s.treats++;
        else if (d.kind === 'crystal') s.crystals++;
        else if (d.kind === 'item') { s.items[d.item] = ITEM_TIME[d.item]; }
        this.ev('pick', { kind: d.kind, item: d.item, x: d.x, y: d.y });
      }
    }
  }

  // ── 보스 ──────────────────────────────────────────────────
  hitBoss(dmg, b) {
    const s = this.s, B = s.boss;
    B.hp -= dmg;
    this.ev('bossHit', { x: b.x, y: b.y, kind: b.kind });
    if (B.phase === 1 && B.hp < B.maxHp * 0.5) { B.phase = 2; this.ev('bossPhase', { phase: 2 }); }
    if (B.hp <= 0) this.bossEnd(true);
  }

  bossEnd(killed) {
    const s = this.s, B = s.boss;
    const t = B.age;
    const rank = !killed ? 'X' : t < 14 ? 'S' : t < 22 ? 'A' : t < 32 ? 'B' : 'C';
    const mult = { S: 3, A: 2, B: 1.5, C: 1, X: 0.5 }[rank];
    s.score += Math.round(3000 * B.lvl * mult);
    // 보스 보상은 자석으로 모두 끌려옴
    if (killed) { s.items.magnet = Math.max(s.items.magnet, 3); this.drop('coin', B.x, B.y, 25 + B.lvl * 5); this.drop('gem', B.x, B.y, rank === 'S' ? 3 : rank === 'A' ? 2 : 1); this.drop('item', B.x, B.y, 1); }
    this.ev('bossEnd', { killed, rank, x: B.x, y: B.y, boss: B.type });
    s.ebullets = []; s.marks = [];
    s.boss = null;
    s.nextBoss = s.dist + BOSS_EVERY;
    s.rowY = 0;
  }

  shoot(x, y, ang, sp, r = 18, kind = 'orb') { this.s.ebullets.push({ id: this.id(), x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r, kind }); }
  aim(x, y) { const p = this.s.player; return Math.atan2(p.y - y, p.x - x); }

  bossAct(dt) {
    const s = this.s, B = s.boss, p = s.player, R = this.R;
    if (B.state === 'warn') { B.t -= dt; if (B.t <= 0) { B.state = 'enter'; this.ev('bossEnter', { boss: B.type }); } return; }
    if (B.state === 'enter') { B.y += 520 * dt; if (B.y >= 430) { B.y = 430; B.state = 'fight'; } return; }
    B.age += dt;
    if (B.age > 40) { this.bossEnd(false); return; }
    const hard = 0.78 + 0.11 * (B.lvl - 1);         // 첫 보스는 느리게, 반복될수록 빨라짐
    const more = Math.min(3, B.lvl - 1);              // 반복될수록 탄 수 증가
    const ph2 = B.phase === 2;
    // 좌우 흔들림
    if (!B.dashing) B.x = W / 2 + Math.sin(B.age * 0.8) * 300;
    B.pt -= dt; B.pt2 -= dt; B.pt3 -= dt;
    if (B.type === 'ghostship') {
      if (B.pt <= 0) { B.pt = (ph2 ? 1.5 : 2.0) / hard; const n = (ph2 ? 6 : 5) + more; for (let i = 0; i < n; i++) this.shoot(B.x, B.y + 100, Math.PI / 2 + (i - (n - 1) / 2) * 0.2, 420 * hard, 20, 'skull'); this.ev('bossShot', {}); }
      if (B.pt2 <= 0) { B.pt2 = 3.0 / hard; const shots = 1 + Math.min(2, more); for (let i = 0; i < shots; i++) { const a = this.aim(B.x, B.y); this.s.ebullets.push({ id: this.id(), x: B.x + (i - (shots - 1) / 2) * 160, y: B.y + 60, vx: Math.cos(a) * 540 * hard, vy: Math.sin(a) * 540 * hard, r: 26, kind: 'cannon' }); } this.ev('cannon', {}); }
      if (B.pt3 <= 0) { B.pt3 = 6; const l = Math.floor(R() * LANES); const hp = Math.ceil(2 * this.base()); s.enemies.push({ id: this.id(), row: -1, kind: 'skull', lane: l, x: this.laneX(l), y: B.y + 80, hp, maxHp: hp, frozen: 0, wob: 0, vy: 160 }); }
    } else if (B.type === 'moonrabbit') {
      if (B.pt <= 0) { B.pt = (ph2 ? 1.8 : 2.5) / hard; for (let i = 0; i < (ph2 ? 3 : 2) + Math.min(1, more); i++) s.marks.push({ id: this.id(), x: i === 0 ? p.x : 120 + R() * (W - 240), y: p.y - R() * 260, r: 115, t: 1.0 }); this.ev('mochi', {}); }
      if (B.pt2 <= 0) { B.pt2 = 3.4 / hard; const n = 10 + more * 2; for (let i = 0; i < n; i++) this.shoot(B.x, B.y, (i / n) * Math.PI * 2 + B.age, 360 * hard, 18, 'moon'); this.ev('bossShot', {}); }
      if (B.pt3 <= 0 && !B.dashing) { B.pt3 = 7; B.dashing = 1; B.dx = p.x; this.ev('bossDash', {}); }
      if (B.dashing) {
        B.x += (B.dx - B.x) * Math.min(1, dt * 4);
        B.y += (B.dashing === 1 ? 1400 : -900) * dt;
        if (B.dashing === 1 && B.y > p.y - 200) B.dashing = 2;
        if (B.dashing === 2 && B.y <= 430) { B.y = 430; B.dashing = 0; }
      }
    } else {   // rival witch
      if (B.pt <= 0) { B.pt = 0.11 / hard; B.ang += 0.41; const arms = (ph2 ? 2 : 1) + (more >= 2 ? 1 : 0); for (let i = 0; i < arms; i++) this.shoot(B.x, B.y, B.ang + i * Math.PI * 2 / arms, 360 * hard, 16, 'spark'); }
      if (B.pt2 <= 0) { B.pt2 = 2.3 / hard; const a = this.aim(B.x, B.y); for (let i = -1; i <= 1; i++) this.shoot(B.x, B.y, a + i * 0.16, 560 * hard, 20, 'star'); this.ev('bossShot', {}); }
      if (ph2 && B.pt3 <= 0) { B.pt3 = 2.4; for (const cx of [180, W - 180]) { const a = this.aim(cx, 300); this.shoot(cx, 300, a, 560 * hard, 18, 'spark'); } this.ev('clone', {}); }
      // 나선이 너무 촘촘해지지 않게 2초 쏘고 1초 쉼
      if ((B.age % 3) > 2) B.pt = Math.max(B.pt, 0.2);
    }
  }
}
