// 그림 한 장을 살아 움직이게 하는 효과 모음
// - WindFX: 화면 단위 후처리 셰이더. 그림의 가장자리(망토·머리카락·꼬리)만 바람에 흔들고 몸 중심·지팡이·빗자루는 고정
// - makeTextures: 빛망울·반짝이·눈꽃·빛줄기 텍스처를 코드로 생성
// - tipOf: 지팡이 끝 위치(그림에서 가장 위쪽의 불투명 점)를 찾아 탄이 나가는 자리와 맞춤
const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uAmp;
uniform float uMode;
uniform vec4 uBounds;
uniform float uVel;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  vec2 size = uBounds.zw - uBounds.xy;
  vec2 l = (uv - uBounds.xy) / size;
  l.y = 1.0 - l.y;                       // 0 = 그림 위쪽
  float side = abs(l.x - 0.5) * 2.0;
  float w = 0.0;
  vec2 d = vec2(0.0);
  if (uMode < 0.5) {                     // 비행(뒷모습): 망토·머리카락 펄럭임, 지팡이·빗자루 고정
    w = smoothstep(0.15, 0.85, side) * smoothstep(0.12, 0.3, l.y) * (1.0 - smoothstep(0.72, 0.9, l.y));
    w += 0.35 * (1.0 - smoothstep(0.0, 0.45, side)) * smoothstep(0.2, 0.32, l.y) * (1.0 - smoothstep(0.5, 0.62, l.y));
    float sp = 1.0 + abs(uVel) * 1.5;   // 빨리 움직일수록 더 세게 펄럭
    d.x = sin(l.y * 15.0 - uTime * 9.0 * sp + l.x * 4.0) * w * sp;
    d.y = sin(l.x * 11.0 - uTime * 7.0 * sp) * 0.6 * w;
    // 움직이는 반대쪽으로 망토·머리카락이 끌려감 (아래쪽일수록 더 많이)
    float drag = smoothstep(0.15, 0.85, l.y) * (0.4 + 0.6 * smoothstep(0.0, 0.7, side));
    d.x += uVel * drag * 2.2;
  } else if (uMode < 1.5) {              // 초상화: 머리카락·망토 끝이 천천히 살랑
    w = smoothstep(0.35, 1.0, side) * smoothstep(0.25, 0.65, l.y);
    d.x = sin(l.y * 6.0 - uTime * 2.2) * w;
    d.y = sin(l.x * 5.0 - uTime * 1.7) * 0.3 * w;
  } else if (uMode > 2.5) {              // 몬스터: 날개(양옆) 퍼덕
    w = smoothstep(0.35, 1.0, side) * (1.0 - smoothstep(0.85, 1.0, l.y));
    d.y = sin(uTime * 12.0) * w;
    d.x = cos(uTime * 12.0) * w * 0.3 * sign(l.x - 0.5);
  } else {                               // 고양이: 꼬리·털 끝 살랑, 구름 일렁임
    w = smoothstep(0.3, 0.95, side) * smoothstep(0.2, 0.55, l.y) * (1.0 - smoothstep(0.75, 0.92, l.y));
    float cloud = smoothstep(0.78, 0.95, l.y);
    d.x = sin(uTime * 3.2 + l.y * 5.0) * w + sin(uTime * 2.0 + l.x * 9.0) * 0.4 * cloud + uVel * w * 1.5;
    d.y = sin(uTime * 2.4 + l.x * 7.0) * 0.5 * cloud;
  }
  vec2 s = uv - d * uAmp * size * vec2(1.0, -1.0);
  gl_FragColor = texture2D(uMainSampler, s);
}`;

export class WindFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) { super({ game, name: 'WindFX', fragShader: FRAG }); this.amp = 0.02; this.mode = 0; this.vel = 0; this.phase = Math.random() * 10; }
  onDraw(target) {
    const o = this.gameObject, r = this.renderer;
    const b = o.getBounds();
    const cam = o.scene.cameras.main;
    const x0 = (b.x - cam.scrollX) / r.width, x1 = (b.right - cam.scrollX) / r.width;
    const y0 = 1 - (b.bottom - cam.scrollY) / r.height, y1 = 1 - (b.y - cam.scrollY) / r.height;
    this.set1f('uTime', this.game.loop.time / 1000 + this.phase);
    this.set1f('uAmp', this.amp);
    this.set1f('uMode', this.mode);
    this.set1f('uVel', this.vel);
    this.set4f('uBounds', x0, y0, x1, y1);
    this.bindAndDraw(target);
  }
}

// mode: 0 비행 · 1 초상화 · 2 고양이
export function wind(obj, mode, amp) {
  const r = obj.scene.renderer;
  if (r.type !== Phaser.WEBGL) return obj;
  obj.setPostPipeline(WindFX);
  const p = obj.getPostPipeline(WindFX);
  const one = Array.isArray(p) ? p[p.length - 1] : p;
  if (one) { one.mode = mode; one.amp = amp; obj.wind = one; }
  return obj;
}

export function glow(obj, color, strength = 4) {
  if (obj.scene.renderer.type !== Phaser.WEBGL || !obj.preFX) return null;
  obj.preFX.setPadding(24);
  return obj.preFX.addGlow(color, strength, 0, false, 0.1, 12);
}

export function makeTextures(scene) {
  const T = scene.textures;
  const canvas = (key, w, h, draw) => { if (T.exists(key)) return; const c = T.createCanvas(key, w, h); draw(c.getContext(), w, h); c.refresh(); };
  canvas('glow', 128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  canvas('spark', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(32, 0); g.quadraticCurveTo(36, 28, 64, 32); g.quadraticCurveTo(36, 36, 32, 64); g.quadraticCurveTo(28, 36, 0, 32); g.quadraticCurveTo(28, 28, 32, 0); g.fill();
  });
  canvas('flake', 48, 48, (g) => {
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.lineCap = 'round'; g.translate(24, 24);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -20); g.moveTo(0, -12); g.lineTo(-6, -17); g.moveTo(0, -12); g.lineTo(6, -17); g.stroke(); g.rotate(Math.PI / 3); }
  });
  canvas('rays', 512, 512, (g) => {
    g.translate(256, 256);
    for (let i = 0; i < 16; i++) {
      const gr = g.createLinearGradient(0, 0, 0, -256); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(-22, -256); g.lineTo(22, -256); g.fill(); g.rotate(Math.PI * 2 / 16);
    }
  });
  canvas('circle', 256, 256, (g) => {
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 88, 0, Math.PI * 2); g.stroke();
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2; g.lineTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); const b = a + Math.PI * 2 / 3; g.lineTo(128 + Math.cos(b) * 88, 128 + Math.sin(b) * 88); } g.closePath(); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillStyle = '#FFFFFF'; g.fillRect(128 + Math.cos(a) * 99 - 3, 128 + Math.sin(a) * 99 - 3, 6, 6); }
  });
}

// 그림에서 지팡이 끝(가장 위쪽 불투명 점)의 위치를 0~1 비율로
const tipCache = {};
export function tipOf(scene, key) {
  if (tipCache[key]) return tipCache[key];
  const src = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, c.width, Math.ceil(c.height * 0.3)).data;
  let tip = { x: 0.5, y: 0.03 };
  for (let y = 0, found = false; y < c.height * 0.3 && !found; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 200) { tip = { x: (x + 6) / c.width, y: (y + 10) / c.height }; found = true; break; }
  return (tipCache[key] = tip);
}

// 마녀 속성별 색·입자
export const ELEMENT = {
  star: { color: 0xC9A8FF, tints: [0xFFF6A8, 0xD8C2FF, 0xFFFFFF], tex: 'spark', glow: 0xB89AFF },
  fire: { color: 0xFF8A3A, tints: [0xFFB347, 0xFF6A2A, 0xFFE14D], tex: 'glow', glow: 0xFF6A3A },
  ice: { color: 0x9AE8FF, tints: [0xBFF4FF, 0xFFFFFF, 0x8AD8FF], tex: 'flake', glow: 0x7AD8FF },
  bolt: { color: 0xFFE14D, tints: [0xFFF04D, 0xFFFFFF, 0xFFD23F], tex: 'spark', glow: 0xFFD23F },
};
