// 로딩: manifest.json 에 적힌 그림·이펙트·효과음을 모두 받고 애니메이션을 만든다
import { W, H } from '../config.js';
import { SFX } from '../audio.js';
import { makeTextures } from '../fx.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 300, H / 2 + 120, 4, 26, 0xFFD95A).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 120, 608, 34).setStrokeStyle(4, 0xB89AFF);
    this.add.text(W / 2, H / 2, '고양이와 마녀', { fontFamily: 'Jua', fontSize: '96px', color: '#FFE8A8' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 600 * v; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, t, m) => {
      for (const n of m.images) { const [k, ext] = Array.isArray(n) ? n : [n, 'png']; this.load.image(k, `assets/img/${k}.${ext}`); }
      for (const [n, s] of Object.entries(m.sheets)) this.load.spritesheet(n, `assets/fx/${n}.png`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
      this.load.audio('bgm_title', ['assets/audio/bgm_title.m4a']);
    });
  }
  create() {
    makeTextures(this);
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: n === 'sheet_dash' ? -1 : 0 });
    for (const k of ['bat', 'ghost', 'pumpkin', 'crow', 'golem', 'firebat', 'chest', 'eliteFire', 'eliteIce', 'eliteSteel', 'skull'])
      this.anims.create({ key: `en_${k}`, frames: this.textures.exists(`en_${k}_1`) ? [{ key: `en_${k}_0` }, { key: `en_${k}_1` }] : [{ key: `en_${k}_0` }], frameRate: k === 'golem' || k === 'chest' ? 4 : 8, repeat: -1 });
    this.scene.start(new URLSearchParams(location.search).has('play') ? 'Lobby' : 'Title');
  }
}
