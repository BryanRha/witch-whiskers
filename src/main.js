import { W, BASE_H, setH } from './config.js';
import { audio } from './audio.js';
import { BootScene } from './scenes/Boot.js';
import { TitleScene } from './scenes/Title.js';
import { LobbyScene } from './scenes/Lobby.js';
import { PlayScene } from './scenes/Play.js';
import { ResultScene } from './scenes/Result.js';
import { WindFX } from './fx.js';

async function start() {
  try { await document.fonts.load('48px Jua'); } catch { /* 기본 폰트 */ }
  document.getElementById('boot')?.remove();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: BASE_H,
    backgroundColor: '#1A1240',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    input: { activePointers: 2 },
    fps: { target: 60 },
    pipeline: { WindFX },
    scene: [BootScene, TitleScene, LobbyScene, PlayScene, ResultScene],
  });
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(() => game.scale.refresh(), ms));
  addEventListener('resize', refresh);
  addEventListener('orientationchange', refresh);
  window.__game = game;
}
// One a Day 앱 안에서 실행될 때(iframe)는 앱이 캐시를 관리하므로 게임 자체 서비스 워커는 쓰지 않음
const embedded = window.parent !== window;
if (!embedded && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
start();
