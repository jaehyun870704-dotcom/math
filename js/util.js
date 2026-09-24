// 공통 유틸 — DOM 없이 동작 (Node 테스트 가능)

let rng = Math.random;
export function setRng(f) { rng = f; }
export const rand = () => rng();
export const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
export const pick = arr => arr[Math.floor(rng() * arr.length)];
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const sample = (arr, k) => shuffle(arr).slice(0, k);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

// 하루 경계: 새벽 3시
export function dayKey(ts = Date.now()) {
  const d = new Date(ts - 3 * HOUR);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ageGroup(age) {
  return age <= 4 ? 'g4' : age <= 6 ? 'g56' : 'g78';
}

export const NATIVE = ['영', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const SINO = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

// 7032 → 칠천삼십이
export function readKo(n) {
  if (n === 0) return '영';
  const units = ['', '십', '백', '천', '만'];
  const ds = String(n).split('').reverse();
  let s = '';
  for (let i = ds.length - 1; i >= 0; i--) {
    const d = +ds[i];
    if (!d) continue;
    s += (d === 1 && i > 0 ? '' : SINO[d]) + units[i];
  }
  return s;
}

// 숫자 뒤 조사: 받침 여부는 한자어 읽기 기준
function hasBatchim(n) {
  const r = readKo(n);
  const c = r.charCodeAt(r.length - 1) - 0xac00;
  return c >= 0 && c % 28 !== 0;
}
export const wa = n => (hasBatchim(n) ? '과' : '와');
export const eun = n => (hasBatchim(n) ? '은' : '는');
export const eul = n => (hasBatchim(n) ? '을' : '를');

// "모두 셋이야"
export function allIs(n) {
  const w = n <= 10 ? NATIVE[n] : readKo(n);
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return `모두 ${w}${c % 28 !== 0 ? '이야' : '야'}`;
}

export function uid() {
  return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
