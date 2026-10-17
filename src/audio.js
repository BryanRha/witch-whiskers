// 효과음 / 배경음. 배경음은 처음 틀 때 받아 온다 (첫 로딩을 가볍게).
import { load, save } from './save.js';

export const SFX = [
  'sfx_shot_star', 'sfx_shot_fire', 'sfx_shot_ice', 'sfx_shot_bolt', 'sfx_hit', 'sfx_kill_0', 'sfx_kill_1', 'sfx_kill_2',
  'sfx_coin', 'sfx_gem', 'sfx_item', 'sfx_boom_small', 'sfx_boom_big', 'sfx_warn', 'sfx_meteor', 'sfx_boss_warn', 'sfx_boss_clear',
  'sfx_shield', 'sfx_shield_break', 'sfx_dash', 'sfx_die', 'sfx_revive', 'sfx_click', 'sfx_upgrade', 'sfx_meow', 'sfx_mission',
  'sfx_record', 'sfx_result',
];
export const BGM = ['bgm_title', 'bgm_lobby', 'bgm_run', 'bgm_boss'];

class AudioManager {
  constructor() { this.game = null; this.current = null; this.currentKey = null; this.last = {}; this.urlFor = k => `assets/audio/${k}.m4a`; }
  attach(game) { this.game = game; }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now();
    const gap = opts.gap ?? 45;
    if (this.last[key] && now - this.last[key] < gap) return;
    this.last[key] = now;
    try { this.game.sound.play(key, { volume: opts.volume ?? 0.7, rate: opts.rate ?? 1, detune: opts.detune ?? 0 }); } catch { /* 디코딩 실패 무시 */ }
  }
  buzz(p) { if (!load().sfx) return; try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } }
  music(key, scene = null) {
    if (!this.game) return;
    if (this.currentKey === key && this.current) return;
    this.stopMusic();
    this.currentKey = key;
    if (!load().music) return;
    if (!this.game.cache.audio.exists(key)) {
      const sc = scene || this.game.scene.getScenes(true).slice(-1)[0];
      if (!sc) return;
      sc.load.audio(key, [this.urlFor(key)]);
      sc.load.once('complete', () => { if (this.currentKey === key && !this.current) { this.currentKey = null; this.music(key, sc); } });
      sc.load.start();
      return;
    }
    try { this.current = this.game.sound.add(key, { loop: true, volume: key === 'bgm_run' || key === 'bgm_boss' ? 0.38 : 0.45 }); this.current.play(); } catch { this.current = null; }
  }
  // 미리 받아 두기 (타이틀에서 비행·보스 곡을 조용히 받음)
  prefetch(scene, keys) {
    const need = keys.filter(k => !this.game.cache.audio.exists(k));
    if (!need.length) return;
    for (const k of need) scene.load.audio(k, [this.urlFor(k)]);
    scene.load.start();
  }
  stopMusic() { if (this.current) { this.current.stop(); this.current.destroy(); this.current = null; } }
  duck(v) { if (this.current) this.current.setVolume(v); }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
  toggleMusic() {
    const d = load(); d.music = !d.music; save();
    if (!d.music) this.stopMusic(); else if (this.currentKey) { const k = this.currentKey; this.currentKey = null; this.music(k); }
    return d.music;
  }
}
export const audio = new AudioManager();
