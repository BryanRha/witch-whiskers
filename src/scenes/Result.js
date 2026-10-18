// 결과: 거리·점수(최고 기록) · 주운 재화 · 입양 진행 · 미션 진행 → 다시 날기 / 로비
import { W, H } from '../config.js';
import { txt, fmt, fit, button, iconButton } from '../ui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import { wind } from '../fx.js';
import { applyRun, CAT_INFO, missions, ranking } from '../meta.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(r) { this.r = r; }
  create() {
    const r = this.r;
    const before = load().best;
    const out = applyRun(r);
    const d = load();
    const bg = this.add.image(W / 2, H, 'title_bg').setOrigin(0.5, 1);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x0A0618, 0.45);
    this.cameras.main.fadeIn(300, 10, 6, 30);
    audio.play(out.newBest ? 'sfx_record' : 'sfx_result', { volume: 0.8 });
    this.time.delayedCall(2600, () => audio.music('bgm_lobby', this));

    const top = Math.max(120, H / 2 - 860);
    this.add.nineslice(W / 2, top + 640, 'panel', null, 960, 1180, 100, 100, 100, 100);
    this.add.image(W / 2, top + 60, 'ribbon').setDisplaySize(940, 200);
    txt(this, W / 2, top + 52, out.newBest ? '최고 기록!' : '비행 결과', 70, '#FFFFFF', { stroke: '#22105A', thick: 12 });
    if (out.newBest) {
      for (let i = 0; i < 24; i++) {
        const s = this.add.image(W / 2, top + 260, 'star_on').setScale(0.5);
        const a = Math.random() * Math.PI * 2, dist = 300 + Math.random() * 300;
        this.tweens.add({ targets: s, x: W / 2 + Math.cos(a) * dist, y: top + 260 + Math.sin(a) * dist, alpha: 0, angle: 360, duration: 1200, delay: 300, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
      }
    }
    // 마녀 초상화 + 점수
    const pt = fit(this.add.image(W / 2 - 300, top + 300, `witch_${r.witch}_portrait`), 330); wind(pt, 1, 0.012);
    txt(this, W / 2 + 120, top + 190, '점수', 40, '#B8A6F0');
    const sc = txt(this, W / 2 + 120, top + 265, '0', 96, '#FFE14D');
    this.tweens.addCounter({ from: 0, to: r.score, duration: 900, ease: 'Cubic.easeOut', onUpdate: tw => sc.setText(fmt(tw.getValue())) });
    txt(this, W / 2 + 120, top + 360, `${fmt(r.dist)}m · 최고 ${fmt(Math.max(before, r.score))}`, 40, '#FFFFFF');
    // 순위 (주간)
    const rk = ranking(); const me = rk.findIndex(x => x.me) + 1;
    txt(this, W / 2 + 120, top + 420, `주간 순위 ${me}위`, 38, '#9AE8FF');

    // 주운 것
    const items = [['cur_coin', r.coins], ['cur_gem', r.gems], ['cur_treat', r.treats], ['cur_crystal', r.crystals]];
    items.forEach(([k, v], i) => {
      const x = W / 2 - 330 + i * 220, y = top + 560;
      this.add.rectangle(x, y, 190, 150, 0x120830, 0.7).setStrokeStyle(3, 0x8A6AD8);
      this.add.image(x, y - 22, k).setDisplaySize(80, 80);
      txt(this, x, y + 46, `+${fmt(v)}`, 40, '#FFFFFF');
    });
    // 처치·보스
    txt(this, W / 2, top + 690, `몬스터 ${fmt(r.kills)} · 보스 ${r.bosses}${r.sRank ? ` (S ${r.sRank})` : ''}`, 40, '#FFE8A8');
    // 입양 진행
    let y = top + 790;
    const cat = out.pawCat || d.adopt;
    if (cat) {
      const have = d.paws[cat] || 0, need = CAT_INFO[cat].paws;
      wind(fit(this.add.image(W / 2 - 330, y + 10, `cat_${cat}`), 120), 2, 0.025);
      txt(this, W / 2 - 220, y - 20, `${CAT_INFO[cat].name} 입양까지`, 40, '#FFFFFF', { ox: 0 });
      this.add.rectangle(W / 2 - 220, y + 40, 520, 36, 0x120830).setOrigin(0, 0.5).setStrokeStyle(3, 0x8A6AD8);
      const bar = this.add.rectangle(W / 2 - 216, y + 40, 4, 28, 0xFF9EC4).setOrigin(0, 0.5);
      this.tweens.add({ targets: bar, width: 512 * Math.min(1, have / need), duration: 700, delay: 400 });
      txt(this, W / 2 + 330, y + 40, `${have}/${need}`, 34, '#FFFFFF');
      if (r.paws) txt(this, W / 2 + 330, y - 20, `+${r.paws} 🐾`, 34, '#FFE14D');
      if (have >= need) txt(this, W / 2, y + 100, '입양할 수 있어요! 로비에서 데려오세요', 36, '#FFE14D');
      y += 150;
    }
    // 미션
    const ms = missions();
    ms.forEach((m, i) => {
      const yy = y + 10 + i * 56;
      const prog = Math.min(m.goal, m.prog);
      txt(this, W / 2 - 400, yy, `${m.done ? '✔' : '·'} ${m.text}`, 34, m.done ? '#9AFFB8' : '#D8CCFF', { ox: 0 });
      txt(this, W / 2 + 400, yy, m.kind === 'runDist' ? (m.done ? '완료' : `${fmt(prog)}m`) : `${fmt(prog)}/${fmt(m.goal)}`, 32, '#FFFFFF', { ox: 1 });
    });

    const by = Math.min(H - 170, top + 1330);
    button(this, W / 2 + 160, by, '다시 날기', () => this.go('Play'), { key: 'btn_gold', w: 520, h: 160, icon: 'ico_retry' });
    iconButton(this, W / 2 - 300, by, 'ico_home', () => this.go('Lobby'), 160);
    window.__result = r;
  }
  go(scene) {
    this.cameras.main.fadeOut(250, 10, 6, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene));
  }
}
