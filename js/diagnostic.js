// 진단 "동물 친구 만나기" (§3-2) — 적응형 최대 6문항
import { RULES } from './config.js';
import { DIAG_LEVEL, levelFirst, ageStart, UNIT, LEVELS } from './curriculum.js';

export const DOOR_ANIMALS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊'];

export function startDiag(age) {
  const a = Math.max(4, Math.min(8, age));
  return { age: a, cur: a - 3, log: [] }; // 만4→d1 … 만8→d5
}

export const diagDone = st => st.log.length >= RULES.diagMax;

// result: 'ok' | 'no' | 'skip'(8초 무응답 = 미측정)
export function diagAnswer(st, result) {
  st.log.push({ d: st.cur, r: result });
  if (result === 'ok') st.cur = Math.min(7, st.cur + 1);
  else if (result === 'no') st.cur = Math.max(1, st.cur - 1);
  return st;
}

// 시작 단원 결정 규칙 1~6
export function diagResult(st) {
  const ok = st.log.filter(x => x.r === 'ok').map(x => x.d);
  const no = st.log.filter(x => x.r === 'no').map(x => x.d);
  const skips = st.log.filter(x => x.r === 'skip').length;

  const fallback = () => {
    if (st.age <= 4) return 'L-1-1';
    const lv = UNIT[ageStart(st.age).num].level;
    return levelFirst(LEVELS[Math.max(0, LEVELS.indexOf(lv) - 1)]);
  };
  if (skips >= 3 || ok.length === 0) return { start: fallback(), rule: skips >= 3 ? 6 : 4 };

  const dmax = Math.max(...ok);
  if (no.length === 0) return { start: levelFirst(DIAG_LEVEL[dmax]), rule: 5 };
  const dmin = Math.min(...no);
  const s = dmin - 1;
  if (s < 1) return { start: 'L-1-1', rule: 2 };
  return { start: levelFirst(DIAG_LEVEL[s]), rule: 2 };
}
