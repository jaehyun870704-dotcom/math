// 스티커 — 7문제마다 1장, 모으는 재미: 아직 없는 디자인이 먼저 나온다
import { RULES, PHOTO_WEIGHT } from './config.js';
import { rand, pick } from './util.js';

export const EMOJI_STICKERS = [
  '🦁', '🐯', '🐰', '🦄', '🐼', '🐨', '🐸', '🐙', '🦋', '🐳',
  '🦖', '🐧', '🦊', '🐝', '🐞', '🐢', '🦜', '🐬', '🦒', '🐘',
  '🌈', '🌻', '🌷', '🍓', '🍉', '🍦', '🧁', '🍭', '🎈', '🎁',
  '🚀', '🚂', '⛵', '🚁', '⭐', '🌙', '☀️', '🍀', '🎵', '🪁',
];

// 모을 수 있는 전체 디자인 (기본 40종 + 부모가 넣은 사진)
export function allDesigns(photos = []) {
  return [
    ...EMOJI_STICKERS.map(ref => ({ kind: 'emoji', ref, w: 1 })),
    ...photos.map(p => ({ kind: 'photo', ref: p.id, w: PHOTO_WEIGHT[p.weight] ?? 1.5 })),
  ];
}

export const designKey = s => `${s.kind}:${s.ref}`;

export function newSticker(album, photos = [], now = Date.now()) {
  const all = allDesigns(photos);
  const have = new Set(album.map(designKey));
  const fresh = all.filter(d => !have.has(designKey(d)));
  const pool = fresh.length ? fresh : all;
  const total = pool.reduce((s, d) => s + d.w, 0);
  let r = rand() * total;
  let d = pool[pool.length - 1];
  for (const x of pool) if ((r -= x.w) < 0) { d = x; break; }
  return { kind: d.kind, ref: d.ref, sparkle: rand() < RULES.surprise, at: now, isNew: !have.has(designKey(d)) };
}

// 행동 칭찬 (능력 칭찬 대신 한 일을 말해 줌)
export const PRAISE = {
  base: [
    '끝까지 해냈네', '천천히 잘 봤어', '꼼꼼하게 봤네', '잘 들었구나', '그림을 잘 살폈네',
    '생각하고 골랐구나', '차근차근 했어', '집중해서 봤구나', '눈으로 잘 찾았네', '하나하나 비교했네',
    '열심히 생각했구나', '끝까지 들었구나', '스스로 찾았네', '차례대로 봤구나', '자세히 들여다봤네',
  ],
  retry: ['다시 해봤구나', '포기 안 했네', '여러 번 해봤네', '다른 걸 골라봤네', '한 번 더 봤구나'],
  hint: ['힌트를 잘 썼어', '도움을 잘 썼네', '다시 보고 풀었네'],
  count: ['하나씩 짚었구나', '끝까지 세어봤네', '손가락으로 짚었네'],
};
export function pickPraise(ctx, recent = []) {
  const pool = ctx.retried ? PRAISE.retry : ctx.hinted ? PRAISE.hint : ctx.counted ? PRAISE.count : PRAISE.base;
  const fresh = pool.filter(p => !recent.includes(p));
  return pick(fresh.length ? fresh : pool);
}
