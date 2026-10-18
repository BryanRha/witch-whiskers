// 로비: 마녀 선택·강화 · 고양이(입양/성장/장착/산책) · 부스터 · 미션 · 출석 · 업적 · 주간 랭킹 · 상점 · 설정 → 출발
import { W, H } from '../config.js';
import { txt, fmt, fit, button, iconButton, currencyBar, popup, toast, rewardText, scrollArea } from '../ui.js';
import { audio } from '../audio.js';
import { load, save, reset } from '../save.js';
import { CATS } from '../core/run.js';
import * as M from '../meta.js';
import { wind, ELEMENT } from '../fx.js';
import { WITCHES } from '../core/run.js';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }

  create() {
    const d = load();
    if (!d.witches[d.witch]) d.witch = 'luna';
    this.view = d.witch;
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'bg_0');
    this.add.tileSprite(W / 2, H / 2, W, H, 'bg_cloudlayer').setAlpha(0.35).setName('cl');
    this.add.rectangle(W / 2, H / 2, W, H, 0x0E0830, 0.58);
    this.add.image(W / 2, H / 2, 'bg_vignette').setDisplaySize(W, H).setAlpha(0.8);
    this.cameras.main.fadeIn(300, 10, 6, 30);
    audio.music('bgm_lobby', this);

    this.bar = currencyBar(this, 70);
    // 왼쪽·오른쪽 메뉴
    const ly = 220, gap = 190;
    this.btn = {};
    this.btn.missions = iconButton(this, 95, ly, 'ico_mission', () => this.missionsPopup(), 140, { label: '미션' });
    this.btn.daily = iconButton(this, 95, ly + gap, 'ico_calendar', () => this.dailyPopup(), 140, { label: '출석' });
    this.btn.ach = iconButton(this, 95, ly + gap * 2, 'ico_trophy', () => this.achPopup(), 140, { label: '업적' });
    this.btn.rank = iconButton(this, W - 95, ly, 'star_on', () => this.rankPopup(), 140, { label: '랭킹' });
    this.btn.cats = iconButton(this, W - 95, ly + gap, 'ico_cat', () => this.catsPopup(), 140, { label: '고양이' });
    this.btn.shop = iconButton(this, W - 95, ly + gap * 2, 'ico_shop', () => this.shopPopup(), 140, { label: '상점' });
    iconButton(this, W - 95, ly + gap * 3, 'ico_settings', () => this.settingsPopup(), 120);

    // 무대: 마녀 + 고양이
    const cy = Math.min(H * 0.38, 760);
    this.stageY = cy;
    this.title = txt(this, W / 2, 210, '', 44, '#FFE8A8');
    this.name = txt(this, W / 2, 270, '', 80, '#FFFFFF');
    // 뒤에서 천천히 도는 빛줄기 + 은은한 후광 + 속성 입자
    this.rays = this.add.image(W / 2, cy - 20, 'rays').setScale(2.2).setAlpha(0.18).setBlendMode('ADD');
    this.tweens.add({ targets: this.rays, angle: 360, duration: 40000, repeat: -1 });
    this.glow = this.add.image(W / 2, cy - 20, 'glow').setScale(6).setAlpha(0.16).setBlendMode('ADD');
    this.tweens.add({ targets: this.glow, alpha: 0.08, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.stageFx = this.add.particles(W / 2, cy, 'spark', { x: { min: -330, max: 330 }, y: { min: -260, max: 260 }, speedY: { min: -60, max: -20 }, lifespan: 2200, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 90, blendMode: 'ADD' });
    this.witch = this.add.sprite(W / 2, cy + 60, 'witch_luna_0');
    wind(this.witch, 1, 0.012);
    this.lock = this.add.image(W / 2, cy, 'ico_lock').setScale(1.2).setVisible(false);
    this.catL = this.add.image(W / 2 - 290, cy + 140, 'cat_cheese');
    this.catR = this.add.image(W / 2 + 290, cy + 140, 'cat_cheese').setFlipX(true);
    this.tweens.add({ targets: this.witch, y: cy + 46, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 고양이: 둥실 + 가끔 장난(깡충·한 바퀴·갸웃), 누르면 야옹 하고 깡충
    [this.catL, this.catR].forEach((c, i) => { c.trick = null; c.idleT = 1.5 + i * 2; c.side = i ? 1 : -1; });
    [this.catL, this.catR].forEach(c => wind(c, 2, 0.025));
    [this.catL, this.catR].forEach(c => c.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (c.trick) return this.catsPopup(); c.trick = 'hop'; c.trickT = 0; audio.play('sfx_meow', { volume: 0.6 }); }));
    iconButton(this, 90, cy + 260, 'ico_back', () => this.switchWitch(-1), 110);
    iconButton(this, W - 90, cy + 260, 'ico_next', () => this.switchWitch(1), 110);

    // 마녀 정보·강화
    const iy = cy + 390;
    this.add.nineslice(W / 2, iy + 40, 'panel', null, 980, 250, 70, 70, 70, 70);
    this.desc = txt(this, W / 2, iy - 30, '', 38, '#D8CCFF');
    this.lvTxt = txt(this, W / 2 - 230, iy + 60, '', 50, '#FFFFFF');
    this.upBtn = button(this, W / 2 + 210, iy + 60, '', () => this.onWitchButton(), { key: 'btn_gold', w: 440, h: 130, size: 42, icon: 'cur_coin' });

    // 부스터
    const by = iy + 250;
    this.boost = {};
    Object.entries(M.BOOSTERS).forEach(([k, b], i) => {
      const x = W / 2 - 245 + i * 490;
      const c = this.add.container(x, by);
      const bg = this.add.nineslice(0, 0, 'card', null, 460, 150, 50, 50, 50, 50);
      const ic = this.add.image(-160, -4, k === 'dash' ? 'item_dash' : 'shield').setDisplaySize(100, 100);
      const t1 = txt(this, 30, -30, b.name, 38, '#FFFFFF');
      const t2 = txt(this, 30, 26, '', 34, '#FFE14D');
      const chk = this.add.image(190, -50, 'ico_check').setDisplaySize(70, 70);
      c.add([bg, ic, t1, t2, chk]);
      c.setSize(460, 150).setInteractive({ useHandCursor: true }).on('pointerup', () => { d.boosters[k] = !d.boosters[k]; save(); audio.play('sfx_click', { volume: 0.5 }); this.refresh(); });
      c.cost = t2; c.chk = chk; c.bg = bg;
      this.boost[k] = c;
    });
    // 입양 진행
    this.adoptBox = this.add.container(W / 2, by + 150);
    // 출발
    const sy = Math.max(by + 330, H - 190);
    this.bestTxt = txt(this, W / 2, sy - 120, '', 38, '#FFE8A8');
    // 오늘의 미션 미리보기 (빈 공간 채우기, 누르면 미션 창)
    const mTop = by + 220, mBot = sy - 170;
    this.missionBox = mBot - mTop > 200 ? this.add.container(W / 2, (mTop + mBot) / 2) : null;
    this.startBtn = button(this, W / 2, sy, '출발!', () => this.start(), { key: 'btn_gold', w: 620, h: 190, size: 78 });
    this.tweens.add({ targets: this.startBtn, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.refresh();
    if (M.dailyState().can) this.time.delayedCall(450, () => this.dailyPopup());
    window.__lobby = this;
  }

  update(t, dms) {
    const dt = dms / 1000, ts = t / 1000;
    [this.catL, this.catR].forEach((c, i) => {
      if (!c.base) return;
      c.idleT -= dt;
      if (c.idleT <= 0 && !c.trick) { c.idleT = 2.5 + Math.random() * 3; c.trick = ['hop', 'spin', 'tilt'][Math.floor(Math.random() * 3)]; c.trickT = 0; }
      let oy = 0, a = 0, sx = 1;
      if (c.trick) {
        c.trickT += dt; const k = c.trickT / 0.6;
        if (k >= 1) c.trick = null;
        else if (c.trick === 'hop') { oy = -Math.sin(k * Math.PI) * 60; sx = 1 + Math.sin(k * Math.PI * 2) * 0.08; }
        else if (c.trick === 'spin') sx = Math.cos(k * Math.PI * 2);
        else a = Math.sin(k * Math.PI) * 16 * -c.side;
      }
      const br = Math.sin(ts * 4 + i * 2) * 0.03;
      c.y = this.stageY + 130 + Math.sin(ts * 2.6 + i * 1.6) * 14 + oy;
      c.setAngle(Math.sin(ts * 1.6 + i) * 4 + a).setScale(c.base * (1 + br) * sx * (c.side > 0 ? -1 : 1), c.base * (1 - br)).setFlipX(false);
    });
    this.bg.tilePositionY -= dms * 0.03; this.children.getByName('cl').tilePositionY -= dms * 0.06; }

  refresh() {
    const d = load(), id = this.view, info = M.WITCH_INFO[id], lv = d.witches[id] || 0;
    this.bar.refresh();
    this.title.setText(info.title);
    this.name.setText(info.name);
    this.witch.setTexture(`witch_${id}_portrait`).setTint(lv ? 0xFFFFFF : 0x2A2050);
    this.lock.setVisible(!lv);
    this.glow.setTint(info.color); this.rays.setTint(info.color);
    const E = ELEMENT[WITCHES[id].element];
    this.stageFx.setParticleTint(E.tints[0]); this.stageFx.setTexture?.(E.tex);
    this.desc.setText(info.desc);
    const eq = d.equip;
    [this.catL, this.catR].forEach((c, i) => { c.setVisible(!!eq[i]); if (eq[i]) { fit(c.setTexture(`cat_${eq[i]}`), 200); c.base = c.scaleY; } });
    fit(this.witch, 560);
    if (lv) {
      const atk = Math.round((1 + 0.12 * (lv - 1)) * 100);
      this.lvTxt.setText(`Lv.${lv}  공격 ${atk}%\n마법탄 ${M.shotTier(lv)}단계`).setLineSpacing(-4).setFontSize(44);
      if (lv >= M.WITCH_MAX) { this.upBtn.setLabel('최대 레벨'); this.upBtn.setEnabled(false); }
      else { this.upBtn.setLabel(`강화 ${fmt(M.witchUpCost(lv))}`); this.upBtn.setEnabled(d.coins >= M.witchUpCost(lv)); }
      this.upBtn.list[1].setTexture('cur_coin');
    } else {
      const [k, v] = Object.entries(info.unlock)[0];
      this.lvTxt.setText('잠겨 있어요');
      this.upBtn.setLabel(`해금 ${fmt(v)}`);
      this.upBtn.list[1].setTexture({ coins: 'cur_coin', gems: 'cur_gem', crystals: 'cur_crystal' }[k]);
      this.upBtn.setEnabled(d[k] >= v);
    }
    this.startBtn.setEnabled(!!lv);
    this.startBtn.setLabel(lv ? '출발!' : '잠긴 마녀');
    for (const [k, c] of Object.entries(this.boost)) {
      const on = d.boosters[k];
      c.chk.setVisible(on); c.cost.setText(`${fmt(M.BOOSTERS[k].cost)} 코인`);
      c.bg.setTint(on ? 0xFFE8A8 : 0xFFFFFF);
    }
    this.bestTxt.setText(d.best ? `최고 점수 ${fmt(d.best)} · ${fmt(d.bestDist)}m` : '손가락을 좌우로 밀어 마녀를 움직여요!');
    if (this.missionBox) {
      const mb = this.missionBox, list = M.missions();
      mb.removeAll(true);
      mb.add(this.add.nineslice(0, 0, 'panel', null, 980, 250, 70, 70, 70, 70));
      mb.add(txt(this, -440, -86, '오늘의 미션', 36, '#FFE14D', { ox: 0 }));
      mb.add(txt(this, 440, -86, `${list.filter(m => m.done).length}/${list.length} 완료`, 30, '#D8CCFF', { ox: 1 }));
      list.slice(0, 3).forEach((m, i) => {
        const y = -26 + i * 52, k = Math.min(1, m.prog / m.goal);
        mb.add(txt(this, -440, y, `${m.done ? '✅' : '▫️'} ${m.text}`, 30, m.done ? '#9AF0B8' : '#FFFFFF', { ox: 0 }));
        mb.add(this.add.rectangle(170, y, 240, 18, 0x120830, 0.9).setOrigin(0, 0.5).setStrokeStyle(2, 0x8A6AD8));
        mb.add(this.add.rectangle(172, y, Math.max(3, 236 * k), 12, m.done ? 0x6EE7A8 : 0xFFC93C).setOrigin(0, 0.5));
      });
      mb.setSize(980, 250).setInteractive({ useHandCursor: true });
      mb.off('pointerup').on('pointerup', () => this.missionsPopup());
    }
    // 입양
    this.adoptBox.removeAll(true);
    if (d.adopt) {
      const have = d.paws[d.adopt] || 0, need = M.CAT_INFO[d.adopt].paws;
      this.adoptBox.add(fit(this.add.image(-380, 0, `cat_${d.adopt}`), 100).setTint(have >= need ? 0xFFFFFF : 0x6A5A90));
      this.adoptBox.add(txt(this, -300, -26, `입양 목표: ${M.CAT_INFO[d.adopt].name}`, 36, '#FFFFFF', { ox: 0 }));
      this.adoptBox.add(this.add.rectangle(-300, 22, 560, 30, 0x120830, 0.9).setOrigin(0, 0.5).setStrokeStyle(3, 0x8A6AD8));
      this.adoptBox.add(this.add.rectangle(-296, 22, Math.max(4, 552 * Math.min(1, have / need)), 22, 0xFF9EC4).setOrigin(0, 0.5));
      this.adoptBox.add(txt(this, 330, 20, `🐾 ${have}/${need}`, 34, '#FFE8A8', { ox: 0 }));
      this.adoptBox.setSize(900, 100).setInteractive({ useHandCursor: true });
      this.adoptBox.off('pointerup').on('pointerup', () => this.catsPopup());
    }
    // 알림 점
    const n = M.notices();
    this.btn.missions.badge.setVisible(n.missions); this.btn.ach.badge.setVisible(n.ach); this.btn.daily.badge.setVisible(n.daily); this.btn.cats.badge.setVisible(n.cats);
  }

  switchWitch(dir) {
    const i = M.WITCH_ORDER.indexOf(this.view);
    this.view = M.WITCH_ORDER[(i + dir + M.WITCH_ORDER.length) % M.WITCH_ORDER.length];
    const d = load();
    if (d.witches[this.view]) { d.witch = this.view; save(); }
    this.witch.setX(W / 2 + dir * 80).setAlpha(0);
    this.tweens.add({ targets: this.witch, x: W / 2, alpha: 1, duration: 200 });
    this.refresh();
  }

  onWitchButton() {
    const id = this.view, d = load();
    if (!d.witches[id]) {
      if (M.unlockWitch(id)) { audio.play('sfx_upgrade'); toast(this, `${M.WITCH_INFO[id].name} 해금!`, '#FFE14D'); this.burst(); }
      else toast(this, '재화가 부족해요');
    } else {
      const before = M.shotTier(d.witches[id]);
      if (!M.upgradeWitch(id)) toast(this, '코인이 부족해요');
      else {
        audio.play('sfx_upgrade'); this.burst();
        const now = M.shotTier(d.witches[id]);
        if (now > before) { audio.play('sfx_boss_clear', { volume: 0.5 }); toast(this, `마법탄 ${now}단계로 진화!`, '#FFE14D'); }
      }
    }
    this.refresh();
  }

  burst() {
    const a = this.add.sprite(W / 2, this.stageY, 'sheet_ring').setScale(2.4).setBlendMode('ADD'); a.play('sheet_ring'); a.once('animationcomplete', () => a.destroy());
    for (let i = 0; i < 10; i++) { const s = this.add.image(W / 2, this.stageY, 'star_on').setScale(0.4); const ang = i / 10 * Math.PI * 2; this.tweens.add({ targets: s, x: W / 2 + Math.cos(ang) * 320, y: this.stageY + Math.sin(ang) * 320, alpha: 0, duration: 700, onComplete: () => s.destroy() }); }
  }

  start() {
    const d = load();
    if (!d.witches[d.witch]) return;
    const need = Object.entries(d.boosters).filter(([, on]) => on).reduce((a, [k]) => a + M.BOOSTERS[k].cost, 0);
    if (d.coins < need) { toast(this, '부스터 코인이 부족해요'); return; }
    audio.stopMusic();
    this.cameras.main.fadeOut(300, 10, 6, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play'));
  }

  // ── 고양이 ────────────────────────────────────────────
  // 팝업 안 내용은 draw() 로 그 자리에서 다시 그림 (닫았다 열지 않음)
  catsPopup() {
    const ph = Math.min(H - 160, 1640);
    const pop = popup(this, '고양이 친구들', ph, { onClose: () => this.refresh() });
    let scrollY = null;
    const draw = () => pop.redraw(b => {
      const d = load();
      const wy = -ph / 2 + 150;
      if (d.walk.cat) {
        const left = M.walkLeft();
        b.add(fit(this.add.image(-360, wy, `cat_${d.walk.cat}`), 80));
        b.add(txt(this, -280, wy - 20, `${M.CAT_INFO[d.walk.cat].name} 산책 중`, 38, '#FFFFFF', { ox: 0 }));
        b.add(txt(this, -280, wy + 26, left ? `${Math.ceil(left / 60000)}분 남음` : '돌아왔어요!', 32, '#FFE8A8', { ox: 0 }));
        b.add(button(this, 270, wy, left ? '바로 받기 5' : '보상 받기', () => {
          const r = M.finishWalk(true);
          if (r) { audio.play('sfx_meow'); toast(this, rewardText(r), '#FFE14D'); this.bar.refresh(); redraw(); }
          else toast(this, '별가루가 부족해요');
        }, { key: left ? 'btn_purple' : 'btn_gold', w: 330, h: 110, size: 36, icon: left ? 'cur_gem' : null }));
      } else b.add(txt(this, 0, wy, '장착하지 않은 고양이를 산책 보내면 30분 뒤 코인·간식을 가져와요', 32, '#D8CCFF', { wrap: 820 }));
      const area = scrollArea(this, pop.box, 0, -ph / 2 + 240, 900, ph - 290, b);
      const cw = 290, chh = 420;
      M.CAT_ORDER.forEach((id, i) => {
        const x = -cw + (i % 3) * cw, y = Math.floor(i / 3) * (chh + 20) + chh / 2;
        const c = this.add.container(x, y);
        const lv = d.cats[id] || 0, info = M.CAT_INFO[id], role = CATS[id].role;
        const eq = d.equip.includes(id), target = d.adopt === id;
        c.add(this.add.nineslice(0, 0, 'card', null, cw - 14, chh, 50, 50, 50, 50).setTint(eq ? 0xFFE8A8 : target ? 0xFFC0E0 : 0xFFFFFF));
        c.add(fit(this.add.image(0, -90, `cat_${id}`), 210).setTint(lv ? 0xFFFFFF : 0x3A2E60));
        c.add(txt(this, 0, 30, info.name, 38, '#FFFFFF'));
        c.add(txt(this, 0, 72, `${M.ROLE_NAME[role]} · ${lv ? `Lv.${lv}` : `🐾 ${d.paws[id] || 0}/${info.paws}`}`, 28, lv ? '#FFE8A8' : '#D8CCFF'));
        if (eq) c.add(txt(this, -cw / 2 + 50, -chh / 2 + 34, '장착', 28, '#FFE14D'));
        if (d.walk.cat === id) c.add(txt(this, -cw / 2 + 60, -chh / 2 + 34, '산책', 28, '#9AE8FF'));
        if (lv) c.add(button(this, 0, 150, '보기', () => this.catDetail(id, redraw), { key: 'btn_purple', w: 220, h: 90, size: 34 }));
        else if (M.canAdopt(id)) c.add(button(this, 0, 150, '입양!', () => { M.adopt(id); audio.play('sfx_meow'); toast(this, `${info.name}이(가) 가족이 되었어요!`, '#FFE14D'); redraw(); }, { key: 'btn_gold', w: 220, h: 90, size: 36 }));
        else if (target) c.add(txt(this, 0, 150, '입양 목표', 32, '#FF9EC4'));
        else c.add(button(this, 0, 150, '목표로', () => { M.setAdopt(id); audio.play('sfx_click', { volume: 0.5 }); redraw(); }, { key: 'btn_pink', w: 220, h: 90, size: 34 }));
        area.add(c);
      });
      area.contentH = Math.ceil(M.CAT_ORDER.length / 3) * (chh + 20) + 20;
      if (scrollY !== null) area.setScroll(scrollY);
      pop.area = area;
    });
    // 스크롤 위치를 유지한 채 다시 그림
    const redraw = () => { scrollY = pop.area ? pop.area.y : null; draw(); this.refresh(); };
    draw();
  }

  catDetail(id, redrawParent) {
    const pop = popup(this, M.CAT_INFO[id].name, 1100, { depth: 1100, onClose: () => redrawParent() });
    const draw = () => pop.redraw(b => {
      const d = load(), lv = d.cats[id], cost = M.catUpCost(lv), role = CATS[id].role;
      b.add(fit(this.add.image(0, -280, `cat_${id}`), 330));
      b.add(txt(this, 0, -80, `Lv.${lv}  ·  ${M.ROLE_NAME[role]}`, 50, '#FFE8A8'));
      let eff = M.CAT_INFO[id].desc;
      if (role === 'attack') eff += `\n털뭉치 위력 ${Math.round((1.6 + lv * 0.12) * 100)}% · 간격 ${Math.max(0.55, 1 - lv * 0.02).toFixed(2)}초`;
      else if (CATS[id].ability === 'magnet') eff += `\n끌어당기는 범위 ${240 + lv * 8}`;
      else if (CATS[id].ability === 'shield') eff += `\n보호막 간격 ${Math.max(12, 22 - lv * 0.4).toFixed(1)}초`;
      else if (CATS[id].ability === 'coin') eff += `\n코인 +${10 + lv}%`;
      else eff += `\n산책 보상 코인 ${M.walkReward(id).coins} · 간식 ${M.walkReward(id).treats}`;
      b.add(txt(this, 0, 20, eff, 36, '#FFFFFF', { wrap: 760 }));
      const eq = d.equip.includes(id);
      b.add(button(this, -200, 220, eq ? '빼기' : '장착', () => { M.toggleEquip(id); audio.play('sfx_meow', { volume: 0.5 }); draw(); }, { key: eq ? 'btn_purple' : 'btn_pink', w: 300, h: 120, size: 40 }));
      const wb = button(this, 200, 220, '산책 보내기', () => { if (M.startWalk(id)) { toast(this, '30분 뒤에 돌아와요'); draw(); } }, { key: 'btn_purple', w: 320, h: 120, size: 36 });
      wb.setEnabled(!eq && !d.walk.cat); b.add(wb);
      if (lv < M.CAT_MAX) {
        const ub = button(this, 0, 380, `성장  🍪${cost.treats} · ${fmt(cost.coins)}`, () => { if (M.upgradeCat(id)) { audio.play('sfx_upgrade'); draw(); this.bar.refresh(); } else toast(this, '간식이나 코인이 부족해요'); }, { key: 'btn_gold', w: 620, h: 140, size: 40 });
        ub.setEnabled(d.treats >= cost.treats && d.coins >= cost.coins); b.add(ub);
      } else b.add(txt(this, 0, 380, '최대 레벨!', 50, '#FFE14D'));
    });
    draw();
  }

  // ── 미션 / 출석 / 업적 / 랭킹 / 상점 / 설정 ───────────────
  missionsPopup() {
    const pop = popup(this, '오늘의 미션', 1060, { onClose: () => this.refresh() });
    const draw = () => pop.redraw(b => {
      M.missions().forEach((m, i) => {
        const y = -300 + i * 250;
        b.add(this.add.nineslice(0, y, 'card', null, 860, 220, 50, 50, 50, 50).setTint(m.claimed ? 0x9088B0 : 0xFFFFFF));
        b.add(txt(this, -380, y - 50, m.text, 40, '#FFFFFF', { ox: 0 }));
        const prog = Math.min(m.goal, m.prog);
        b.add(this.add.rectangle(-380, y + 20, 440, 30, 0x120830).setOrigin(0, 0.5).setStrokeStyle(3, 0x8A6AD8));
        b.add(this.add.rectangle(-376, y + 20, Math.max(4, 432 * prog / m.goal), 22, 0x9AFFB8).setOrigin(0, 0.5));
        b.add(txt(this, -380, y + 70, `${fmt(prog)} / ${fmt(m.goal)} · 보상 ${rewardText(m.reward)}`, 30, '#D8CCFF', { ox: 0 }));
        if (m.claimed) b.add(txt(this, 280, y, '받음 ✔', 44, '#9AFFB8'));
        else {
          const bt = button(this, 280, y, '받기', () => { const r = M.claimMission(m.id); if (r) { audio.play('sfx_mission'); toast(this, rewardText(r), '#FFE14D'); this.bar.refresh(); draw(); } }, { key: 'btn_gold', w: 230, h: 110, size: 40 });
          bt.setEnabled(m.done); b.add(bt);
        }
      });
      b.add(txt(this, 0, 450, '미션은 매일 자정에 바뀌어요', 32, '#B8A6F0'));
    });
    draw();
  }

  dailyPopup() {
    const pop = popup(this, '출석 선물', 1000, { onClose: () => this.refresh() });
    const ICON = { coins: 'cur_coin', gems: 'cur_gem', treats: 'cur_treat', crystals: 'cur_crystal' };
    const draw = () => pop.redraw(b => {
      const st = M.dailyState();
      M.DAILY.forEach((r, i) => {
        const big = i === 6;
        const x = big ? 0 : -300 + (i % 3) * 300, y = big ? 230 : -260 + Math.floor(i / 3) * 230;
        const [k, v] = Object.entries(r)[0];
        const got = i < st.day || (i === st.day - 1 && !st.can) || (st.day === 0 && !st.can && i === 6);
        const today = i === st.day && st.can;
        b.add(this.add.nineslice(x, y, 'card', null, big ? 860 : 270, 210, 50, 50, 50, 50).setTint(today ? 0xFFE8A8 : got ? 0x8070A0 : 0xFFFFFF));
        b.add(txt(this, x, y - 70, `${i + 1}일`, 32, '#FFFFFF'));
        b.add(this.add.image(x, y, ICON[k]).setDisplaySize(90, 90).setAlpha(got ? 0.5 : 1));
        b.add(txt(this, x, y + 70, fmt(v), 36, '#FFE14D'));
        if (got) b.add(this.add.image(x + 70, y - 50, 'ico_check').setDisplaySize(70, 70));
      });
      const bt = button(this, 0, 410, st.can ? '선물 받기' : '내일 또 만나요', () => { const r = M.claimDaily(); if (r) { audio.play('sfx_mission'); toast(this, rewardText(r), '#FFE14D'); this.bar.refresh(); draw(); } }, { key: 'btn_gold', w: 500, h: 140 });
      bt.setEnabled(st.can); b.add(bt);
    });
    draw();
  }

  achPopup() {
    const ph = Math.min(H - 200, 1500);
    const pop = popup(this, '업적', ph, { onClose: () => this.refresh() });
    let scrollY = null;
    const draw = () => pop.redraw(b => {
      const area = scrollArea(this, pop.box, 0, -ph / 2 + 120, 900, ph - 170, b);
      M.ACHIEVEMENTS.forEach((a, i) => {
        const st = M.achState(a), y = i * 210 + 100;
        area.add(this.add.nineslice(0, y, 'card', null, 860, 190, 50, 50, 50, 50));
        area.add(this.add.image(-350, y, 'ico_trophy').setDisplaySize(100, 100).setTint(st.done ? 0xFFE14D : 0xFFFFFF));
        area.add(txt(this, -280, y - 40, st.done ? `${a.text.replace('{g}', fmt(a.goals[a.goals.length - 1]))} 완료` : st.text, 38, '#FFFFFF', { ox: 0 }));
        area.add(txt(this, -280, y + 30, `${'★'.repeat(st.tier)}${'☆'.repeat(a.goals.length - st.tier)}  ${fmt(Math.min(st.val, st.goal))}/${fmt(st.goal)}`, 32, '#FFE8A8', { ox: 0 }));
        if (!st.done) {
          const bt = button(this, 320, y, `${st.reward}`, () => { const g = M.claimAch(a.id); if (g) { audio.play('sfx_mission'); toast(this, `별가루 ${g}`, '#FFE14D'); this.bar.refresh(); scrollY = area.y; draw(); } }, { key: 'btn_gold', w: 200, h: 100, size: 38, icon: 'cur_gem' });
          bt.setEnabled(st.ready); area.add(bt);
        }
      });
      area.contentH = M.ACHIEVEMENTS.length * 210 + 20;
      if (scrollY !== null) area.setScroll(scrollY);
    });
    draw();
  }

  rankPopup() {
    const ph = Math.min(H - 200, 1500);
    const pop = popup(this, '주간 랭킹', ph);
    const b = pop.box;
    b.add(txt(this, 0, -ph / 2 + 120, '이번 주 최고 점수로 겨뤄요 · 월요일에 새로 시작', 32, '#D8CCFF'));
    const area = scrollArea(this, b, 0, -ph / 2 + 170, 900, ph - 220);
    M.ranking().forEach((r, i) => {
      const y = i * 110 + 55;
      area.add(this.add.rectangle(0, y, 860, 100, r.me ? 0x6A3AC0 : 0x120830, r.me ? 0.9 : 0.6).setStrokeStyle(3, r.me ? 0xFFD95A : 0x4A3A80));
      area.add(txt(this, -380, y, `${i + 1}`, 48, i < 3 ? '#FFE14D' : '#FFFFFF'));
      area.add(fit(this.add.image(-270, y, r.w === 'rival' ? 'boss_rival' : `witch_${r.w}_portrait`), 92));
      area.add(txt(this, -200, y, r.name, 42, '#FFFFFF', { ox: 0 }));
      area.add(txt(this, 400, y, fmt(r.score), 42, '#FFE8A8', { ox: 1 }));
    });
    area.contentH = 11 * 110 + 20;
  }

  shopPopup() {
    const pop = popup(this, '마법 상점', 1260, { onClose: () => this.refresh() });
    const b = pop.box;
    const ICON = { coins: 'cur_coin', gems: 'cur_gem', treats: 'cur_treat', crystals: 'cur_crystal', paws: 'cur_paw' };
    M.SHOP.forEach((it, i) => {
      const x = -290 + (i % 3) * 290, y = -300 + Math.floor(i / 3) * 420;
      const [gk] = Object.keys(it.give), [ck, cv] = Object.entries(it.cost)[0];
      b.add(this.add.nineslice(x, y, 'card', null, 270, 390, 50, 50, 50, 50));
      b.add(this.add.image(x, y - 80, ICON[gk]).setDisplaySize(130, 130));
      b.add(txt(this, x, y + 30, it.label, 36, '#FFFFFF'));
      b.add(button(this, x, y + 120, fmt(cv), () => { if (M.buy(it.id)) { audio.play('sfx_coin'); this.bar.refresh(); toast(this, `${it.label} 구매!`, '#FFE14D'); } else toast(this, it.give.paws && !load().adopt ? '입양 목표가 없어요' : '재화가 부족해요'); }, { key: 'btn_purple', w: 220, h: 100, size: 36, icon: ICON[ck] }));
    });
    b.add(txt(this, 0, 540, '별가루는 미션·업적·출석·보스·별똥별에서 얻어요', 30, '#B8A6F0'));
  }

  settingsPopup() {
    const pop = popup(this, '설정', 900);
    const b = pop.box, d = load();
    const row = (y, label, get, toggle) => {
      b.add(txt(this, -300, y, label, 46, '#FFFFFF', { ox: 0 }));
      const bt = button(this, 250, y, get() ? '켜짐' : '꺼짐', () => { toggle(); bt.setLabel(get() ? '켜짐' : '꺼짐'); }, { key: 'btn_purple', w: 240, h: 110, size: 40 });
      b.add(bt);
    };
    row(-200, '효과음', () => d.sfx, () => audio.toggleSfx());
    row(-50, '배경음', () => d.music, () => { audio.toggleMusic(); if (d.music) audio.music('bgm_lobby', this); });
    b.add(txt(this, 0, 110, '조작: 화면 아무 곳이나 누른 채 좌우로 밀기', 32, '#D8CCFF'));
    let confirm = false;
    const rb = button(this, 0, 260, '처음부터 다시', () => { if (!confirm) { confirm = true; rb.setLabel('정말요? 한 번 더'); return; } reset(); pop.close(); this.scene.restart(); }, { key: 'btn_pink', w: 460, h: 110, size: 38 });
    b.add(rb);
  }
}
