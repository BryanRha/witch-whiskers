// 화면 크기: 가로 1080 고정, 세로는 기기 비율에 맞춰 늘어남 (최소 1920)
export const VERSION = '1.3.0';
export const W = 1080;
export const BASE_H = 1920;
export let H = BASE_H;
export function setH(h) { H = Math.round(h); }
export const FONT = 'Jua, sans-serif';
export const INK = '#2A1650';
