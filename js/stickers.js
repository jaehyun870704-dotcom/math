// 스티커 규칙 (§5, §6, §8)
import { AGE, RULES, PHOTO_WEIGHT } from './config.js';
import { ageGroup, rand, pick } from './util.js';

// 기본 40종 (+ 부모 사진 최대 20 = 60종)
export const EMOJI_STICKERS = [
  '🦁', '🐯', '🐰', '🦄', '🐼', '🐨', '🐸', '🐙', '🦋', '🐳',
  '🦖', '🐧', '🦊', '🐝', '🐞', '🐢', '🦜', '🐬', '🦒', '🐘',
  '🌈', '🌻', '🌷', '🍓', '🍉', '🍦', '🧁', '🍭', '🎈', '🎁',
  '🚀', '🚂', '⛵', '🚁', '⭐', '🌙', '☀️', '🍀', '🎵', '🪁',
];

// 2~4 가변 추첨. 같은 값이 2회 연속이면 세 번째는 그 값 제외
export function drawInterval(age, recent = []) {
  let opts = AGE[ageGroup(age)].interval;
  const n = recent.length;
  if (n >= 2 && recent[n - 1] === recent[n - 2]) {
    const f = opts.filter(([v]) => v !== recent[n - 1]);
    if (f.length) opts = f;
  }
  const total = opts.reduce((s, [, p]) => s + p, 0);
  let r = rand() * total;
  for (const [v, p] of opts) if ((r -= p) < 0) return v;
  return opts[opts.length - 1][0];
}

export function initStickerState() {
  return { progress: 0, interval: 2, recent: [], lastAt: 0, firstGiven: false };
}

// 착석 시작: 이월(최대 2문제, 48시간) 처리 후 추첨
export function onSeatStart(st, age, now) {
  if (st.progress > 0 && now - st.lastAt <= RULES.carryMs) {
    st.progress = Math.min(st.progress, RULES.carryMax);
    if (st.interval <= st.progress) st.interval = st.progress + 1;
  } else {
    st.progress = 0;
    // 신규 프로필 최초 1회만 2문제
    st.interval = st.firstGiven ? drawInterval(age, st.recent) : 2;
  }
}

// 마친 문제 1개 → 지급 여부. 지급 직후 재추첨
export function countProblem(st, age, now) {
  st.progress++;
  st.lastAt = now;
  if (st.progress < st.interval) return false;
  st.recent = [...st.recent, st.interval].slice(-4);
  st.progress = 0;
  st.firstGiven = true;
  st.interval = drawInterval(age, st.recent);
  return true;
}

export function caps(age) {
  const c = AGE[ageGroup(age)];
  return { seat: c.seatCap, day: c.dayCap };
}

// 디자인: 기본 40종 각 가중치 1, 부모 사진은 슬라이더 가중치. 8%는 반짝이(장수는 1장 그대로)
export function newSticker(photos = [], now = Date.now()) {
  const total = EMOJI_STICKERS.length + photos.reduce((s, p) => s + (PHOTO_WEIGHT[p.weight] ?? 1.5), 0);
  let r = rand() * total;
  let design = null;
  for (const p of photos) {
    if ((r -= PHOTO_WEIGHT[p.weight] ?? 1.5) < 0) { design = { kind: 'photo', ref: p.id }; break; }
  }
  if (!design) design = { kind: 'emoji', ref: pick(EMOJI_STICKERS) };
  return { ...design, sparkle: rand() < RULES.surprise, at: now };
}

// 행동 서술 칭찬 (능력 칭찬 금지) — 20종 이상, 15자 이내
export const PRAISE = {
  base: [
    '끝까지 해냈네', '천천히 잘 봤어', '꼼꼼하게 봤네', '잘 들었구나', '그림을 잘 살폈네',
    '생각하고 골랐구나', '차근차근 했어', '집중해서 봤구나', '눈으로 잘 찾았네', '하나하나 비교했네',
    '열심히 생각했구나', '끝까지 들었구나', '스스로 찾았네', '차례대로 봤구나', '자세히 들여다봤네',
  ],
  retry: ['다시 해봤구나', '포기 안 했네', '여러 번 해봤네', '다른 걸 골라봤네', '한 번 더 봤구나'],
  hint: ['힌트를 잘 썼어', '도움을 잘 썼네', '블록으로 풀었네'],
  count: ['하나씩 짚었구나', '끝까지 세어봤네', '손가락으로 짚었네'],
};
export function pickPraise(ctx, recent = []) {
  const pool = ctx.retried ? PRAISE.retry : ctx.hinted ? PRAISE.hint : ctx.counted ? PRAISE.count : PRAISE.base;
  const fresh = pool.filter(p => !recent.includes(p));
  return pick(fresh.length ? fresh : pool);
}
