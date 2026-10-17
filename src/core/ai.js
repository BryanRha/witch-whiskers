// 자동 비행 판단 (봇 밸런싱·브라우저 자동 테스트 공용)
import { LANES, LANE_W, W } from './run.js';

export function decideX(run, skill) { return decide(run, skill); }
function decide(run, skill) {
  const s = run.s, p = s.player;
  const dps = s.dmg / s.fireGap * (s.items.twin > 0 ? 2 : 1);
  // 위험한 칸: 경고 중이거나 떨어지는 별똥별
  const danger = new Array(LANES).fill(0);
  for (const m of s.meteors) if (m.warn > 0 || m.y < p.y + 100) danger[m.lane] += 1000;
  // 보스전: 탄을 피해 x 후보 중 가장 안전한 곳 (보스 밑을 약간 선호, 남아 있는 적 줄도 위험으로 계산)
  if (s.boss || s.ebullets.length || s.marks.length) {
    let best = p.x, bestScore = 1e9;
    const hitR = p.r * 0.55;
    for (let x = 70; x <= W - 70; x += 30) {
      let d = 0;
      // 지나가는 경로도 위험: 현재 위치→후보 사이를 0.1초 단위로 이동한다고 보고 탄과의 거리 확인
      for (const b of s.ebullets) {
        for (let tt = 0.05; tt <= 0.75; tt += 0.05) {
          const bx = b.x + b.vx * tt, by = b.y + b.vy * tt;
          const px = p.x + (x - p.x) * Math.min(1, tt / 0.12);
          const dist = Math.hypot(bx - px, by - p.y);
          const lim = b.r + hitR + 18;
          if (dist < lim) d += 3000 * (1 - tt);
          else if (dist < lim + 60) d += (lim + 60 - dist) * 2;
        }
      }
      for (const m of s.marks) if (Math.hypot(m.x - x, m.y - p.y) < m.r + hitR + 25) d += 2500;
      for (const e of s.enemies) if (e.hp > 0 && e.y > p.y - 350 && e.y < p.y + 60 && Math.abs(e.x - x) < 120) d += 4000;
      if (s.boss && s.boss.state === 'fight') d += Math.abs(s.boss.x - x) * 0.35 + (s.boss.dashing ? Math.max(0, 300 - Math.abs(s.boss.x - x)) * 6 : 0);
      d += danger[Math.min(LANES - 1, Math.floor(x / LANE_W))];
      d += Math.abs(x - p.x) * 0.04;
      if (d < bestScore) { bestScore = d; best = x; }
    }
    if (s.boss && s.boss.state === 'fight' || s.ebullets.length) return best;
  }
  // 줄: 가장 가까이 다가온 줄에서 제때 뚫을 수 있는 칸 중 가까운 칸
  const ahead = s.enemies.filter(e => e.y < p.y - 40 && e.hp > 0);
  if (!ahead.length) return danger[run.laneOf(p.x)] ? pickSafe(danger, p.x) : p.x;
  const rowY = Math.max(...ahead.map(e => e.y));
  const row = ahead.filter(e => Math.abs(e.y - rowY) < 30);
  const arrive = (p.y - rowY) / Math.max(200, s.speed);
  // 한 번 고른 칸은 끝까지 (사람처럼): 아직 살아 있고 시간 안에 뚫을 수 있으면 유지
  const prev = row.find(e => e.id === run._target);
  if (prev && prev.hp / dps < arrive * 0.95 && !danger[prev.lane]) return prev.x;
  let best = null, bestScore = 1e9;
  for (const e of row) {
    const travel = Math.abs(e.x - p.x) / 2200;
    const ttk = e.hp / dps;
    const ok = ttk + travel < arrive * 0.85;
    // 실력이 낮으면 체력 판단을 덜 정확하게
    const score = (ok ? 0 : 500) + ttk * (0.6 + (1 - skill) * Math.random()) * 100 + travel * 60 + danger[e.lane];
    if (score < bestScore) { bestScore = score; best = e; }
  }
  // 이미 뚫린 칸(빈 칸)이 있으면 그쪽
  const lanesTaken = new Set(row.map(e => e.lane));
  for (let l = 0; l < LANES; l++) if (!lanesTaken.has(l) && !danger[l]) { const x = run.laneX(l); if (Math.abs(x - p.x) / 2200 < arrive) return x; }
  if (best) run._target = best.id;
  return best ? best.x : p.x;
}

function pickSafe(danger, x) {
  let best = x, bd = 1e9;
  for (let l = 0; l < LANES; l++) if (!danger[l]) { const lx = LANE_W * (l + 0.5); const d = Math.abs(lx - x); if (d < bd) { bd = d; best = lx; } }
  return best;
}

