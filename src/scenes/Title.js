// 타이틀: 달밤 하늘 + 로고 + 빗자루 마녀가 고양이와 지나감 → 터치하면 로비
import { W, H, VERSION } from '../config.js';
import { txt, fit } from '../ui.js';
import { audio } from '../audio.js';
import { load } from '../save.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    // 메인 일러스트 (AI 원화): 화면을 꽉 채우고 아주 천천히 다가오는 연출
    const bg = this.add.image(W / 2, H, 'title_art').setOrigin(0.5, 1);
    const cover = Math.max(W / bg.width, H / bg.height);
    bg.setScale(cover);
    this.tweens.add({ targets: bg, scale: cover * 1.06, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 위쪽 로고 자리를 살짝 어둡게 + 반짝이는 별 + 떠오르는 별가루
    this.add.graphics().fillGradientStyle(0x0E0830, 0x0E0830, 0x0E0830, 0x0E0830, 0.55, 0.55, 0, 0).fillRect(0, 0, W, H * 0.45);
    for (let i = 0; i < 40; i++) {
      const st = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.5), 'spark').setScale(Phaser.Math.FloatBetween(0.15, 0.4)).setAlpha(0).setBlendMode('ADD');
      this.tweens.add({ targets: st, alpha: { from: 0, to: 0.9 }, duration: Phaser.Math.Between(700, 1600), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000) });
    }
    this.add.particles(0, 0, 'spark', { x: { min: 0, max: W }, y: { min: H * 0.4, max: H }, speedY: { min: -60, max: -20 }, lifespan: 2600, scale: { start: 0.45, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 90, tint: [0xFFF6A8, 0xD8C2FF, 0xFFFFFF], blendMode: 'ADD' });

    const logo = this.add.image(W / 2, H * 0.17, 'logo').setScale(0.82);
    this.tweens.add({ targets: logo, y: logo.y - 18, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    logo.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: logo, scale: 0.82, alpha: 1, duration: 700, ease: 'Back.easeOut' });

    const tap = txt(this, W / 2, H * 0.92, '화면을 터치하세요', 60, '#FFE8A8');
    this.tweens.add({ targets: tap, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });
    txt(this, W - 30, H - 40, `v${VERSION}`, 30, '#B8A6F0', { ox: 1 });
    txt(this, 30, H - 40, '© Cat & Witch', 30, '#B8A6F0', { ox: 0 });

    audio.music('bgm_title', this);
    audio.prefetch(this, ['bgm_lobby', 'bgm_run', 'bgm_boss']);
    this.input.once('pointerup', () => {
      audio.play('sfx_meow', { volume: 0.7 });
      this.cameras.main.fadeOut(300, 10, 6, 30);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Lobby'));
    });
  }
}
