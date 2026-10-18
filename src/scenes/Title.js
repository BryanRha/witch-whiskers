// 타이틀: 달밤 하늘 + 로고 + 빗자루 마녀가 고양이와 지나감 → 터치하면 로비
import { W, H, VERSION } from '../config.js';
import { txt, fit } from '../ui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';
import { wind } from '../fx.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const bg = this.add.image(W / 2, H, 'title_bg').setOrigin(0.5, 1);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    // 반짝이는 별
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.6), 'cur_gem').setScale(0.12).setAlpha(0).setTint(0xFFFFFF);
      this.tweens.add({ targets: s, alpha: { from: 0, to: 0.9 }, duration: Phaser.Math.Between(700, 1600), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000) });
    }
    // 지나가는 마녀 (옆모습이 없으므로 뒷모습을 기울여 날아오르는 연출)
    const d = load();
    const fly = this.add.container(-200, H * 0.62);
    const witch = fit(this.add.image(0, 0, `witch_${d.witch}_0`), 280).setAngle(30);
    const cat = fit(this.add.image(-140, 80, `cat_${d.equip.find(Boolean) || 'cheese'}`), 130);
    fly.add([this.add.particles(0, 0, 'cur_gem', { speed: 40, lifespan: 900, scale: { start: 0.18, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 60, follow: null, x: { min: -60, max: 0 }, y: 120 }), cat, witch]);
    this.tweens.add({ targets: fly, x: W + 260, y: H * 0.42, duration: 6000, repeat: -1, repeatDelay: 2500, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: cat, y: 50, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 메인 일러스트: 지금 고른 마녀 + 고양이들 (바람에 살랑)
    const rays = this.add.image(W * 0.6, H * 0.66, 'rays').setScale(3).setAlpha(0.25).setTint(0xD8C2FF).setBlendMode('ADD');
    this.tweens.add({ targets: rays, angle: 360, duration: 50000, repeat: -1 });
    const hero = fit(this.add.image(W * 0.6, H - 20, `witch_${d.witch}_portrait`), Math.min(900, H * 0.48)).setOrigin(0.5, 1);
    wind(hero, 1, 0.012);
    const owned = Object.keys(d.cats);
    const c1 = fit(this.add.image(W * 0.16, H - 150, `cat_${owned[0] || 'cheese'}`), 300);
    wind(c1, 2, 0.025);
    this.tweens.add({ targets: c1, y: c1.y - 20, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (owned[1]) { const c2 = fit(this.add.image(W * 0.9, H - 420, `cat_${owned[1]}`), 220).setFlipX(true); wind(c2, 2, 0.025); this.tweens.add({ targets: c2, y: c2.y - 16, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 }); }
    this.add.particles(0, 0, 'spark', { x: { min: 0, max: W }, y: { min: H * 0.4, max: H }, speedY: { min: -50, max: -15 }, lifespan: 2600, scale: { start: 0.45, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 80, tint: [0xFFF6A8, 0xD8C2FF, 0xFFFFFF], blendMode: 'ADD' });

    const logo = this.add.image(W / 2, H * 0.2, 'logo').setScale(0.82);
    this.tweens.add({ targets: logo, y: logo.y - 18, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    logo.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: logo, scale: 0.82, alpha: 1, duration: 700, ease: 'Back.easeOut' });

    const tap = txt(this, W / 2, H * 0.37, '화면을 터치하세요', 60, '#FFE8A8');
    this.tweens.add({ targets: tap, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });
    txt(this, W - 30, H - 40, `v${VERSION}`, 30, '#B8A6F0', { ox: 1 });
    txt(this, 30, H - 40, '© Witch & Whiskers', 30, '#B8A6F0', { ox: 0 });

    audio.music('bgm_title', this);
    audio.prefetch(this, ['bgm_lobby', 'bgm_run', 'bgm_boss']);
    this.input.once('pointerup', () => {
      audio.play('sfx_meow', { volume: 0.7 });
      this.cameras.main.fadeOut(300, 10, 6, 30);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Lobby'));
    });
  }
}
