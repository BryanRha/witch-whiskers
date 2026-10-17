// 공용 UI 위젯: 글자 · 버튼 · 아이콘 버튼 · 재화 표시줄 · 팝업 · 토스트
import { W, H, FONT, INK } from './config.js';
import { load } from './save.js';
import { audio } from './audio.js';

// 그림의 긴 변이 size 가 되도록 크기 조절 (원화 해상도가 바뀌어도 화면 크기 유지)
export const fit = (img, size) => img.setScale(size / Math.max(img.width, img.height));
export const fmt = n => Math.floor(n).toLocaleString('en-US');

export function txt(scene, x, y, s, size = 48, color = '#FFFFFF', o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, color, align: o.align || 'center',
    stroke: o.stroke ?? INK, strokeThickness: o.thick ?? Math.max(4, Math.round(size * 0.16)),
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined, lineSpacing: o.lineSpacing ?? 4,
    resolution: 2,
  }).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.shadow !== false) t.setShadow(0, Math.round(size * 0.08), '#120830', 0, true, false);
  return t;
}

// 누르면 살짝 눌리고 → 손을 떼면 실행
function pressable(scene, c, hitW, hitH, onClick, img, key) {
  c.setSize(hitW, hitH).setInteractive({ useHandCursor: true });
  let down = false;
  c.on('pointerdown', () => { down = true; c.setScale(0.94 * (c.baseScale || 1)); if (img && scene.textures.exists(`${key}_pressed`)) img.setTexture(`${key}_pressed`); });
  const up = (fire) => {
    if (!down) return; down = false;
    c.setScale(c.baseScale || 1); if (img) img.setTexture(key);
    if (fire && !c.disabled && !scene.__scrolled) { audio.play('sfx_click', { volume: 0.5 }); onClick && onClick(); }
  };
  c.on('pointerup', () => up(true));
  c.on('pointerout', () => up(false));
  return c;
}

export function button(scene, x, y, label, onClick, o = {}) {
  const key = o.key || 'btn_gold';
  const tex = scene.textures.get(key).getSourceImage();
  const w = o.w || tex.width, h = o.h || tex.height;
  const c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, key).setDisplaySize(w, h);
  c.add(img);
  const size = o.size || Math.round(h * 0.36);
  const dark = key === 'btn_gold' ? '#6A3A00' : key === 'btn_pink' ? '#5A0A30' : '#22105A';
  let tx = 0;
  if (o.icon) {
    const ic = scene.add.image(-w / 2 + h * 0.52, -h * 0.05, o.icon).setDisplaySize(h * 0.6, h * 0.6);
    c.add(ic); tx = h * 0.22;
  }
  const t = txt(scene, tx, -h * 0.06, label, size, '#FFFFFF', { stroke: dark, thick: Math.round(size * 0.2) });
  c.add(t);
  c.label = t; c.img = img;
  c.setLabel = s => t.setText(s);
  c.setEnabled = on => { c.disabled = !on; c.setAlpha(on ? 1 : 0.55); };
  return pressable(scene, c, w, h, onClick, img, key);
}

export function iconButton(scene, x, y, icon, onClick, size = 150, o = {}) {
  const c = scene.add.container(x, y);
  const bg = o.bare ? null : scene.add.image(0, 0, 'btn_icon').setDisplaySize(size, size);
  if (bg) c.add(bg);
  const ic = scene.add.image(0, -size * 0.04, icon).setDisplaySize(size * (o.bare ? 1 : 0.66), size * (o.bare ? 1 : 0.66));
  c.add(ic);
  c.icon = ic;
  if (o.label) c.add(txt(scene, 0, size * 0.52, o.label, Math.round(size * 0.2), '#FFFFFF'));
  const badge = scene.add.circle(size * 0.36, -size * 0.36, size * 0.12, 0xFF3B6B).setStrokeStyle(5, 0xFFFFFF).setVisible(false);
  c.add(badge); c.badge = badge;
  return pressable(scene, c, size, size, onClick, bg, 'btn_icon');
}

// 재화 표시줄: 코인 · 별가루 · 간식 · 마력 결정
export function currencyBar(scene, y, keys = ['coins', 'gems', 'treats', 'crystals']) {
  const ICON = { coins: 'cur_coin', gems: 'cur_gem', treats: 'cur_treat', crystals: 'cur_crystal' };
  const c = scene.add.container(0, y);
  const n = keys.length, cw = (W - 40) / n;
  const vals = {};
  keys.forEach((k, i) => {
    const x = 20 + cw * i + cw / 2;
    c.add(scene.add.rectangle(x + 16, 0, cw - 30, 64, 0x120830, 0.72).setStrokeStyle(3, 0x8A6AD8, 0.8));
    c.add(scene.add.image(x - cw / 2 + 44, 0, ICON[k]).setDisplaySize(68, 68));
    vals[k] = txt(scene, x + 30, 0, '0', 36, '#FFFFFF', { thick: 6 });
    c.add(vals[k]);
  });
  c.refresh = () => { const d = load(); for (const k of keys) vals[k].setText(fmt(d[k])); };
  c.refresh();
  return c;
}

// 팝업: 어두운 배경 + 유리 패널 + 리본 제목 + 닫기
export function popup(scene, title, ph = 1200, o = {}) {
  const pw = o.w || 960;
  const root = scene.add.container(0, 0).setDepth(o.depth || 1000);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x05020F, 0.72).setInteractive();
  root.add(dim);
  const cy = o.y || H / 2;
  const box = scene.add.container(W / 2, cy);
  root.add(box);
  box.add(scene.add.nineslice(0, 0, 'panel', null, pw, ph, 100, 100, 100, 100));
  if (title) {
    box.add(scene.add.image(0, -ph / 2 + 10, 'ribbon').setDisplaySize(Math.min(pw + 60, 900), 190));
    box.add(txt(scene, 0, -ph / 2 + 2, title, 62, '#FFFFFF', { stroke: '#22105A', thick: 12 }));
  }
  // 내용은 이 상자에 담음 → 보상을 받아도 팝업을 닫지 않고 내용만 다시 그림 (깜빡임 없음)
  const content = scene.add.container(0, 0);
  box.add(content);
  root.content = content;
  root.redraw = fn => { content.removeAll(true); fn(content); };
  const close = () => {
    if (root.closing) return; root.closing = true;
    scene.tweens.add({ targets: box, scale: 0.85, alpha: 0, duration: 140, onComplete: () => { root.destroy(); o.onClose && o.onClose(); } });
    scene.tweens.add({ targets: dim, alpha: 0, duration: 140 });
  };
  if (o.closable !== false) {
    const x = iconButton(scene, pw / 2 - 30, -ph / 2 + 30, 'ico_close', close, 120);
    box.add(x);
    if (o.dimClose !== false) dim.on('pointerup', close);
  }
  box.setScale(0.8); box.alpha = 0;
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
  root.box = box; root.close = close; root.top = -ph / 2; root.pw = pw; root.ph = ph;
  return root;
}

export function toast(scene, msg, color = '#FFFFFF', y = H * 0.42) {
  const t = txt(scene, W / 2, y, msg, 54, color, { wrap: 900 }).setDepth(5000);
  const bg = scene.add.rectangle(W / 2, y, Math.min(1000, t.width + 90), t.height + 50, 0x120830, 0.88).setStrokeStyle(4, 0xFFD95A).setDepth(4999);
  [t, bg].forEach(o => { o.alpha = 0; });
  scene.tweens.add({ targets: [t, bg], alpha: 1, y: y - 30, duration: 200, yoyo: true, hold: 1100, onComplete: () => { t.destroy(); bg.destroy(); } });
}

export function rewardText(r) {
  const N = { coins: '코인', gems: '별가루', treats: '간식', crystals: '마력 결정', paws: '발바닥' };
  return Object.entries(r).map(([k, v]) => `${N[k]} ${fmt(v)}`).join(' · ');
}

// 아래로 미는 목록 (팝업 안): 마스크 + 드래그 스크롤. box = 팝업 상자 (크기 1 기준으로 마스크 계산)
export function scrollArea(scene, box, x, y, w, h, parent = box) {
  const inner = scene.add.container(x, y);
  parent.add(inner);
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xffffff).fillRect(box.x + x - w / 2, box.y + y, w, h);
  inner.setMask(g.createGeometryMask());
  inner.contentH = 0;
  inner.setScroll = v => { inner.y = clamp(v); };
  let startY = null, base = 0;
  const top = box.y + y, inside = p => p.y > top && p.y < top + h && Math.abs(p.x - (box.x + x)) < w / 2;
  const clamp = v => Math.max(y + Math.min(0, h - inner.contentH), Math.min(y, v));
  const dn = p => { if (inside(p)) { startY = p.y; base = inner.y; scene.__scrolled = false; } };
  const mv = p => { if (startY !== null && p.isDown) { if (Math.abs(p.y - startY) > 18) scene.__scrolled = true; if (scene.__scrolled) inner.y = clamp(base + p.y - startY); } };
  const up = () => { startY = null; setTimeout(() => { scene.__scrolled = false; }, 0); };
  const wh = (p, o, dx, dy) => { if (inside(p)) inner.y = clamp(inner.y - dy); };
  scene.input.on('pointerdown', dn); scene.input.on('pointermove', mv); scene.input.on('pointerup', up); scene.input.on('wheel', wh);
  inner.once('destroy', () => { scene.input.off('pointerdown', dn); scene.input.off('pointermove', mv); scene.input.off('pointerup', up); scene.input.off('wheel', wh); g.destroy(); });
  return inner;
}
