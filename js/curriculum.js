// 커리큘럼 70단원 (§2) + 문제 생성기
// 문제 형식:
//   { kind:'choice', say(음성), text(화면 15자 이내), visual(html), choices:[{v,html}], answer,
//     hint:{say,visual?}, concrete?(2차 오답 구체물 html), count?(탭하며 세기), assist?(강한 힌트: 앱이 대신 셀 개수),
//     after?(정답 뒤 음성), layout?('wide'), fixedOrder? }
//   { kind:'build', mode:'counter'|'bars'|'pattern', ... }  — 표 채우기·그래프 만들기·규칙 만들기
import { int, pick, shuffle, sample, rand, readKo, wa, eun, eul, allIs } from './util.js';
import * as A from './art.js';

const FRUITS = ['🍎', '🍌', '🍓', '🍇', '🍊', '🍑'];
const ANIMALS = ['🐶', '🐱', '🐰', '🐻', '🐥', '🐸'];
const VEHICLES = ['🚗', '🚌', '🚲', '🚂', '✈️', '🚀'];
const THINGS = ['⭐', '🎈', '🌸', '🍩', '🧸', '🐟', '🍎', '🐥', '🚗', '🍓'];
const CATS = [{ name: '과일', list: FRUITS }, { name: '동물', list: ANIMALS }, { name: '탈것', list: VEHICLES }];
const LIKE = [['🍎', '사과'], ['🍌', '바나나'], ['🍓', '딸기'], ['🍇', '포도']];
const PALETTE = Object.values(A.COLORS);

// 단어 뒤 조사 (한글 받침)
const jw = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); };

// ── 선택지 ─────────────────────────────────────────
const num = v => ({ v, html: `<b class="num">${v}</b>` });
const emo = v => ({ v, html: `<span class="emo">${v}</span>` });
const txt = (v, label = v) => ({ v, html: `<b class="txt">${label}</b>` });
const pic = (v, html) => ({ v, html });
const withUnit = (u) => c => ({ v: c.v, html: `<b class="num">${c.v}<small>${u}</small></b>` });

// 정답 + 오개념 오답(extra) 우선 + 근처 수. 순서 = 우선순위 (엔진이 개수를 자른 뒤 섞음)
export function numOpts(ans, k = 4, lo = 0, hi = 9999, spread = 3, extra = []) {
  const s = new Set([ans]);
  for (const e of extra) if (s.size < k && e >= lo && e <= hi && Number.isInteger(e)) s.add(e);
  for (let i = 0; s.size < k && i < 80; i++) {
    const c = ans + int(-spread, spread);
    if (c >= lo && c <= hi) s.add(c);
  }
  for (let c = Math.max(lo, ans - 10); s.size < k && c <= hi; c++) s.add(c);
  return [...s].map(num);
}
function strOpts(ans, extra) {
  const s = new Set([ans]);
  for (const e of extra) s.add(e);
  return [...s].map(v => txt(v));
}

export function Q(o) {
  return {
    kind: 'choice',
    hint: { say: '천천히 다시 볼까?' },
    ...o,
    key: o.key ?? `${o.say}|${o.answer}`,
  };
}

export const UNITS = [];
const U = (id, area, level, name, meta, gen) => UNITS.push({ id, area, level, name, ...meta, gen });

// ═════════════════ 수와 연산 42단원 ═════════════════

// ── L-1 만 4세 준비 (7) ──
U('L-1-1', 'num', 'L-1', '같은 그림 찾기', { home: '양말 짝 맞추기 놀이' }, d => {
  const pool = d === 0 ? shuffle([...FRUITS, ...ANIMALS, ...VEHICLES]) : shuffle(pick([FRUITS, ANIMALS, VEHICLES]));
  const [t, ...rest] = pool;
  return Q({ say: '똑같은 그림을 찾아봐', text: '똑같은 그림', visual: A.target(t), choices: [t, ...rest.slice(0, 3)].map(emo), answer: t, hint: { say: '위에 있는 그림을 봐' } });
});

U('L-1-2', 'num', 'L-1', '한 가지로 나누기', { home: '빨래 개며 색깔별로 나누기' }, d => {
  if (d === 0 || int(0, 1) === 0) {
    const cols = sample(Object.keys(A.COLOR_KO), 3);
    const t = cols[0];
    return Q({ say: `${A.COLOR_KO[t]}색을 찾아봐`, text: `${A.COLOR_KO[t]}색 찾기`, visual: `<div class="swatch" style="background:${A.COLORS[t]}"></div>`, choices: cols.map(c => pic(c, A.blob(A.COLORS[c]))), answer: t, hint: { say: '위의 색이랑 같은 걸 봐' } });
  }
  const [a, b] = sample(CATS, 2);
  const [t, ...ex] = sample(a.list, 3);
  return Q({ say: `${a.name}을 찾아봐`, text: `${a.name} 찾기`, visual: `<div class="target small">${ex.join(' ')}</div>`, choices: [t, ...sample(b.list, 2)].map(emo), answer: t, hint: { say: `위에 있는 건 다 ${a.name}이야` } });
});

U('L-1-3', 'num', 'L-1', '크다 작다', { home: '엄마 신발, 내 신발 크기 대보기' }, d => {
  const e = pick([...FRUITS, ...ANIMALS]);
  const big = d === 0 || int(0, 1) === 0;
  const k = d === 0 ? 2 : 3;
  const sizes = sample(d === 2 ? [58, 76, 96] : [40, 72, 108], k);
  const t = big ? Math.max(...sizes) : Math.min(...sizes);
  return Q({ say: `${k === 2 ? '더' : '제일'} ${big ? '큰' : '작은'} 걸 골라봐`, text: big ? '큰 것' : '작은 것', visual: '', choices: sizes.map(s => pic(s, `<span class="emo" style="font-size:${s}px">${e}</span>`)), answer: t, hint: { say: '하나씩 대어 봐' } });
});

U('L-1-4', 'num', 'L-1', '하나 둘 셋', { home: '간식 1~3개를 한눈에 말하기' }, d => {
  const n = int(1, d === 0 ? 2 : 3);
  const e = pick(THINGS);
  return Q({ say: '몇 개일까?', text: '몇 개?', visual: A.items(e, n, { layout: d === 2 ? 'scatter' : 'line' }), choices: [1, 2, 3].map(v => pic(v, `<b class="num">${v}</b>${d < 2 ? `<small class="dots">${'●'.repeat(v)}</small>` : ''}`)), fixedOrder: true, answer: n, after: allIs(n), hint: { say: '하나씩 짚어봐' } });
});

U('L-1-5', 'num', 'L-1', '다섯까지 세기', { home: '계단 오르며 다섯까지 세기' }, d => {
  const n = d === 0 ? int(1, 3) : int(2, 5);
  return Q({ say: '하나씩 눌러봐', text: '다 세면 몇 개?', visual: A.items(pick(THINGS), n, { layout: d === 2 ? 'scatter' : 'line', count: true }), count: true, assist: 2, choices: numOpts(n, 3, 1, 5, 2), answer: n, after: allIs(n), hint: { say: '누른 건 표시가 남아' } });
});

U('L-1-6', 'num', 'L-1', '위 아래 안 밖', { home: '인형을 상자 안/밖에 두며 말하기' }, d => {
  const kind = d === 0 ? 'table' : pick(['table', 'box']);
  const opts = kind === 'table' ? ['위', '아래', '옆'] : ['안', '밖'];
  const t = pick(kind === 'table' ? ['위', '아래'] : ['안', '밖']);
  const e = pick(ANIMALS);
  const obj = kind === 'table' ? '탁자' : '상자';
  return Q({ say: `${obj} ${t}에 있는 걸 골라봐`, text: `${obj} ${t}에`, visual: '', choices: opts.map(o => pic(o, A.scene(kind, o, e))), answer: t, hint: { say: `${obj}를 먼저 찾아봐` } });
});

U('L-1-7', 'num', 'L-1', '반복 무늬 (AB)', { minAge: 4, home: '박수-무릎 반복 놀이' }, d => {
  const [a, b, c] = sample(d === 2 ? pick([FRUITS, ANIMALS]) : [...FRUITS, ...ANIMALS], 3);
  const len = 6;
  const list = Array.from({ length: len }, (_, i) => (i % 2 ? b : a));
  const pos = d === 0 ? len - 1 : int(2, len - 1);
  const ans = list[pos];
  list[pos] = null;
  return Q({ say: pos === len - 1 ? '다음엔 뭐가 올까?' : '빈칸에 뭐가 올까?', text: '뭐가 올까?', visual: A.seq(list), choices: [a, b, c].map(emo), answer: ans, hint: { say: '번갈아 나와' } });
});

// ── L0 수 이전 준비 (3) ──
U('L0-1', 'num', 'L0', '기준 하나로 나누기', { minAge: 5, after: 'L-1-7', home: '장난감 정리: 인형/블록 나누기' }, d => {
  if (d === 2) {
    const [c1, c2] = sample(['red', 'blue', 'yellow', 'green'], 2);
    const t = pick([c1, c2]);
    const blobs = c => `<span class="mini" style="background:${A.COLORS[c]}"></span>`.repeat(2);
    return Q({ say: '어느 바구니에 넣을까?', text: '어디에 넣을까?', visual: A.target(`<span class="mini big" style="background:${A.COLORS[t]}"></span>`), choices: [pic(c1, A.basket([blobs(c1)])), pic(c2, A.basket([blobs(c2)]))], fixedOrder: true, answer: t, layout: 'wide', hint: { say: '색깔을 봐' } });
  }
  const [a, b] = sample(CATS, 2);
  const from = pick([a, b]);
  const [item, ...rest] = sample(from.list, 3);
  const ex = c => (c === from ? rest : sample(c.list, 2));
  return Q({ say: '어느 바구니에 넣을까?', text: '어디에 넣을까?', visual: A.target(item), choices: [pic(a.name, A.basket(ex(a))), pic(b.name, A.basket(ex(b)))], fixedOrder: true, answer: from.name, layout: 'wide', hint: { say: `이건 ${from.name}이야` } });
});

const PAIRS = [['🐰', '🥕'], ['🐶', '🦴'], ['🐻', '🍯'], ['🐥', '🌽'], ['🐱', '🐟']];
U('L0-2', 'num', 'L0', '하나씩 짝짓기', { home: '식탁에 숟가락 하나씩 놓기' }, d => {
  const n = int(3, d === 0 ? 4 : 5);
  const [a, b] = pick(PAIRS);
  return Q({ say: '하나씩 주면 딱 맞는 건?', text: '딱 맞게 짝짓기', visual: A.items(a, n, { layout: 'line' }), choices: [n - 1, n, n + 1].map(k => pic(k, A.items(b, k, { layout: 'line' }))), answer: n, layout: 'wide', hint: { say: '하나씩 짝지어 봐' } });
});

U('L0-3', 'num', 'L0', '많다 적다', { home: '컵과 빨대를 짝지어 남는 쪽 찾기' }, d => {
  const [a, b] = sample([...ANIMALS, ...FRUITS], 2);
  const n = int(2, 6);
  let m;
  do { m = int(2, 6); } while (m === n || (d === 0 && Math.abs(m - n) < 2));
  const more = d === 0 || int(0, 1) === 0;
  const ans = (more ? n > m : n < m) ? a : b;
  return Q({ say: `어느 쪽이 더 ${more ? '많을까' : '적을까'}?`, text: more ? '더 많은 쪽은?' : '더 적은 쪽은?', visual: A.rows([[a, n], [b, m]], { spreadFewer: d === 2 }), choices: [emo(a), emo(b)], fixedOrder: true, answer: ans, concrete: A.rows([[a, n], [b, m]], { pair: true }), hint: { say: '하나씩 짝지어 봐' } });
});

// ── L1 세기와 숫자 (5) ──
U('L1-1', 'num', 'L1', '다섯까지 수', { home: '과자 5개까지 세고 숫자 카드 고르기' }, d => {
  const n = int(1, 5);
  return Q({ say: '세어보고 숫자를 골라봐', text: '몇 개일까?', visual: A.items(pick(THINGS), n, { layout: d === 2 ? 'scatter' : 'line', count: true }), count: true, assist: 2, choices: numOpts(n, 4, 1, 5, 2), answer: n, after: allIs(n) });
});

U('L1-2', 'num', 'L1', '열까지 수', { home: '장난감 10개 세어 상자에 넣기' }, d => {
  const n = int(6, 10);
  return Q({ say: '세어보고 숫자를 골라봐', text: '몇 개일까?', visual: A.items(pick(THINGS), n, { layout: d === 2 ? 'scatter' : 'grid', count: true }), count: true, assist: 2, choices: numOpts(n, 4, 5, 10, 2), answer: n, after: allIs(n), hint: { say: '5개씩 끊어 세어봐' } });
});

U('L1-3', 'num', 'L1', '다시 안 세고 몇 개', { home: '"몇 개였지?" 다시 묻기 놀이' }, d => {
  const n = int(d === 0 ? 3 : 5, 10);
  if (int(0, 1) === 0) {
    const ks = [...new Set([n, n + 1, n - 1, n + 2, n - 2].filter(k => k >= 1 && k <= 10))];
    return Q({ say: `${n}만큼 있는 걸 골라봐`, text: `${n}만큼 찾기`, visual: A.bignum(n), choices: ks.map(k => pic(k, A.frames(k))), answer: n, layout: 'wide', hint: { say: '5칸이 한 줄이야' } });
  }
  return Q({ say: '세지 않고 몇 개일까?', text: '몇 개일까?', visual: A.frames(n), choices: numOpts(n, 4, 1, 10, 2), answer: n, hint: { say: '5칸이 한 줄이야' } });
});

U('L1-4', 'num', 'L1', '수의 순서', { home: '엘리베이터 층수 순서 말하기' }, d => {
  const hi = d === 0 ? 5 : 10;
  const start = int(1, hi - 3);
  let list = [0, 1, 2, 3].map(i => start + i);
  if (d === 2) list = list.reverse();
  const pos = d === 0 ? 3 : int(0, 3);
  const ans = list[pos];
  list[pos] = null;
  return Q({ say: d === 2 ? '거꾸로 세어봐' : pos === 3 ? '다음 수는 뭘까?' : '빈칸에 올 수는?', text: '빈칸의 수는?', visual: A.track(list), choices: numOpts(ans, 4, 1, 10, 2), answer: ans, hint: { say: d === 2 ? '하나씩 작아져' : '하나씩 커져' } });
});

U('L1-5', 'num', 'L1', '수의 크기 비교', { home: '주사위 두 개 굴려 큰 수 말하기' }, d => {
  const k = d === 2 ? 3 : 2;
  const ns = sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], k);
  const big = d === 0 || int(0, 1) === 0;
  const ans = big ? Math.max(...ns) : Math.min(...ns);
  const w = k === 2 ? '더' : '가장';
  return Q({ say: `${w} ${big ? '큰' : '작은'} 수를 골라봐`, text: `${w} ${big ? '큰' : '작은'} 수`, visual: '', choices: ns.map(v => pic(v, `<b class="num">${v}</b>${d === 0 ? `<small class="dots">${'●'.repeat(v)}</small>` : ''}`)), answer: ans, hint: { say: '세면 뒤에 나오는 수가 커' } });
});

// ── L2 10까지 덧셈·뺄셈 (5) ──
U('L2-1', 'num', 'L2', '모으기와 가르기', { home: '사탕 5개를 두 손에 나눠 쥐기' }, d => {
  if (d < 2) {
    const hi = d === 0 ? 5 : 9;
    const a = int(1, hi - 1), b = int(1, hi - a);
    return Q({ say: `${a}${wa(a)} ${b}${eul(b)} 모으면?`, text: '모으면 몇?', visual: A.frames(a, b), choices: numOpts(a + b, 4, 1, 10, 2), answer: a + b, hint: { say: '모두 세어봐' } });
  }
  const n = int(3, 10), a = int(1, n - 1);
  return Q({ say: `${n}${eun(n)} ${a}${wa(a)} 몇?`, text: '가르기', visual: A.split(n, a, null), choices: numOpts(n - a, 4, 0, 10, 2), answer: n - a, concrete: A.split(n, a, null) + A.frames(a, n - a), hint: { say: `${a}개를 빼고 남는 건?` } });
});

U('L2-2', 'num', 'L2', '10까지 덧셈', { home: '장난감 두 무리 합쳐 세기' }, d => {
  const a = int(1, 9), b = int(1, 10 - a);
  const e = sample(FRUITS, 2);
  const pics = d === 0 ? A.frames(a, b) : d === 1 ? A.items([...Array(a).fill(e[0]), ...Array(b).fill(e[1])], a + b) : '';
  return Q({ say: `${a} 더하기 ${b}${eun(b)}?`, text: '더하면 몇?', visual: A.eq(`${a} + ${b} = ?`) + pics, choices: numOpts(a + b, 4, 0, 10, 2, [a + b + 1, a + b - 1]), answer: a + b, concrete: A.eq(`${a} + ${b} = ?`) + A.frames(a, b), hint: { say: `${a}에서 ${b}번 더 세어봐` } });
});

U('L2-3', 'num', 'L2', '10까지 뺄셈', { home: '과자 먹고 남은 개수 말하기' }, d => {
  const a = int(2, 10), b = int(1, a);
  const pics = d === 0 ? A.frames(a, 0, b) : d === 1 ? A.items(pick(FRUITS), a, { cross: b }) : '';
  return Q({ say: `${a} 빼기 ${b}${eun(b)}?`, text: '빼면 몇?', visual: A.eq(`${a} − ${b} = ?`) + pics, choices: numOpts(a - b, 4, 0, 10, 2, [a - b + 1, a + b]), answer: a - b, concrete: A.eq(`${a} − ${b} = ?`) + A.frames(a, 0, b), hint: { say: '지운 것 빼고 세어봐' } });
});

U('L2-4', 'num', 'L2', '0이 있는 계산', { home: '빈 접시 = 0 놀이' }, d => {
  const a = int(1, 9);
  const types = d === 0 ? [0, 1] : [0, 1, 2, 3, 4];
  const t = pick(types);
  const [expr, say, ans] = [
    [`${a} + 0`, `${a} 더하기 0은?`, a],
    [`${a} − ${a}`, `${a} 빼기 ${a}${eun(a)}?`, 0],
    [`0 + ${a}`, `0 더하기 ${a}${eun(a)}?`, a],
    [`${a} − 0`, `${a} 빼기 0은?`, a],
    (() => { const b = int(0, 10 - a); return int(0, 1) ? [`${a} + ${b}`, `${a} 더하기 ${b}${eun(b)}?`, a + b] : [`${a} − ${Math.min(b, a)}`, `${a} 빼기 ${Math.min(b, a)}${eun(Math.min(b, a))}?`, a - Math.min(b, a)]; })(),
  ][t];
  return Q({ say, text: '계산해 봐', visual: A.eq(`${expr} = ?`), choices: numOpts(ans, 4, 0, 10, 2, [0, a, ans + 1]), answer: ans, hint: { say: '0은 아무것도 없는 거야' } });
});

U('L2-5', 'num', 'L2', '그림 보고 식 만들기', { home: '같은 그림으로 더하기·빼기 이야기 만들기' }, d => {
  const a = int(1, 6), b = int(1, 9 - a), c = a + b;
  const add = int(0, 1) === 0;
  const pics = A.items([...Array(a).fill('🍎'), ...Array(b).fill('🍏')], c);
  const ans = add ? `${a} + ${b} = ${c}` : `${c} − ${b} = ${a}`;
  const extra = add
    ? [`${a} + ${b} = ${c + 1}`, `${c} − ${b} = ${a}`, `${a} + ${c} = ${b + c}`]
    : [`${c} − ${b} = ${a + 1}`, `${a} + ${b} = ${c}`, `${c} − ${a} = ${b + 1}`];
  return Q({ say: `${add ? '덧셈식' : '뺄셈식'}을 골라봐`, text: `${add ? '덧셈식' : '뺄셈식'} 고르기`, visual: pics, choices: strOpts(ans, extra), answer: ans, layout: 'wide', hint: { say: add ? '빨강과 초록을 모아봐' : '모두에서 초록을 빼봐' } });
});

// ── L3 50까지와 10의 구조 (4) ──
U('L3-1', 'num', 'L3', '10개씩 묶음과 낱개', { home: '빨대 10개씩 고무줄로 묶기' }, d => {
  const n = int(11, d === 0 ? 30 : 50);
  const t = Math.floor(n / 10), o = n % 10;
  const mode = d === 0 ? 0 : int(0, 2);
  const pv = () => numOpts(n, 4, 10, 99, 1, [o * 10 + t, n + 10, n - 10]);
  if (mode === 0) return Q({ say: '모두 몇 개일까?', text: '모두 몇 개?', visual: A.base10(0, t, o), choices: pv(), answer: n, hint: { say: '10개 묶음부터 세어봐' } });
  if (mode === 1) return Q({ say: `${n}${eun(n)} 10개씩 몇 묶음?`, text: `${n}${eun(n)} 몇 묶음?`, visual: A.bignum(n), choices: numOpts(t, 4, 0, 9, 1, [o, t + 1]), answer: t, concrete: A.bignum(n) + A.base10(0, t, o), hint: { say: '앞자리 수를 봐' } });
  return Q({ say: `10개씩 ${t}묶음, 낱개 ${o}개는?`, text: '모두 몇일까?', visual: A.note(`10개씩 ${t}묶음<br>낱개 ${o}개`), choices: pv(), answer: n, concrete: A.base10(0, t, o), hint: { say: '묶음 수가 앞자리야' } });
});

U('L3-2', 'num', 'L3', '50까지 순서와 크기', { home: '달력에서 오늘 다음 날 찾기' }, d => {
  const mode = d === 0 ? int(0, 1) : d === 1 ? int(0, 2) : int(0, 3);
  const hi = d === 0 ? 30 : 50;
  if (mode <= 1) {
    const n = int(11, hi - 1);
    const next = mode === 0;
    const ans = next ? n + 1 : n - 1;
    return Q({ say: next ? `${n} 다음 수는?` : `${n} 바로 앞의 수는?`, text: next ? '다음 수는?' : '앞의 수는?', visual: A.track(next ? [n - 1, n, null] : [null, n, n + 1]), choices: numOpts(ans, 4, 1, 51, 2, [next ? n + 10 : n - 10]), answer: ans, hint: { say: next ? '하나 더 커' : '하나 더 작아' } });
  }
  if (mode === 2) {
    const a = int(10, hi - 2);
    return Q({ say: `${a}${wa(a)} ${a + 2} 사이 수는?`, text: '사이의 수는?', visual: A.track([a, null, a + 2]), choices: numOpts(a + 1, 4, 1, 51, 2), answer: a + 1 });
  }
  let x, y;
  do { x = int(12, 49); y = (x % 10) * 10 + Math.floor(x / 10); } while (y === x || y > 50 || y < 10);
  const big = int(0, 1) === 0;
  return Q({ say: `더 ${big ? '큰' : '작은'} 수를 골라봐`, text: `더 ${big ? '큰' : '작은'} 수`, visual: '', choices: [num(x), num(y)], answer: big ? Math.max(x, y) : Math.min(x, y), hint: { say: '10묶음이 많은 쪽이 커' } });
});

U('L3-3', 'num', 'L3', '뛰어 세기', { home: '양말 2개씩 세기, 손가락 5개씩 세기' }, d => {
  const step = d === 0 ? 10 : d === 1 ? pick([5, 10]) : pick([2, 5]);
  const start = step === 10 ? 10 * int(0, 1) : step === 5 ? 5 * int(0, 3) : 2 * int(0, 10);
  const list = [0, 1, 2, 3, 4].map(i => start + i * step);
  const pos = d === 0 ? 4 : int(2, 4);
  const ans = list[pos];
  list[pos] = null;
  return Q({ say: `${step}씩 뛰어 세어봐`, text: `${step}씩 뛰어 세기`, visual: A.track(list), choices: numOpts(ans, 4, 0, 60, step, [ans + 1, ans - 1, ans + step]), answer: ans, hint: { say: `${step}씩 커져` } });
});

U('L3-4', 'num', 'L3', '10 만들기', { home: '손가락 10개로 짝꿍 수 찾기' }, d => {
  const a = int(1, 9);
  const v = d === 2 ? A.eq(`${a} + □ = 10`) : A.frames(a);
  return Q({ say: `${a}${wa(a)} 몇이면 10?`, text: '10 만들기', visual: v, choices: numOpts(10 - a, 4, 0, 10, 2, [a]), answer: 10 - a, concrete: A.frames(a) + A.note('빈칸이 몇 개?'), hint: { say: '빈칸을 세어봐' } });
});

// ── L4 받아올림·받아내림 (5) ──
U('L4-1', 'num', 'L4', '10 만들어 더하기', { home: '8+5를 손가락으로 10 만들며 말하기' }, d => {
  const a = d === 0 ? 9 : d === 1 ? pick([8, 9]) : int(6, 9);
  const b = int(11 - a, 9);
  const e = A.eq(`${a} + ${b} = ?`);
  return Q({ say: `${a} 더하기 ${b}${eun(b)}?`, text: '10을 만들어 봐', visual: e + (d === 0 ? A.frames(a, b) : ''), choices: numOpts(a + b, 4, 10, 18, 2, [a + b - 10, a + b + 1]), answer: a + b, concrete: e + A.frames(a, b), hint: { say: `${a}에 ${10 - a}${eul(10 - a)} 더하면 10` } });
});

U('L4-2', 'num', 'L4', '받아올림 덧셈', { home: '동전으로 10원 10개 = 100원 바꾸기' }, d => {
  let a, b;
  if (d === 0) { do { a = int(12, 88); b = int(2, 9); } while ((a % 10) + b < 10 || a + b >= 100); }
  else { do { a = int(12, 79); b = int(12, 79); } while ((a % 10) + (b % 10) < 10 || a + b >= 100); }
  const s = a + b;
  const e = A.eq(`${a} + ${b} = ?`);
  return Q({ say: `${a} 더하기 ${b}${eun(b)}?`, text: '더하면 몇?', visual: e, choices: numOpts(s, 4, 10, 99, 2, [s - 10, s + 10, s + 1]), answer: s, concrete: e + `<div class="two">${A.base10(0, Math.floor(a / 10), a % 10)}${A.base10(0, Math.floor(b / 10), b % 10)}</div>`, hint: { say: '일의 자리부터 더해봐' } });
});

U('L4-3', 'num', 'L4', '받아내림 뺄셈 (십몇−몇)', { home: '13개에서 5개 덜어내며 10 거쳐 세기' }, d => {
  const o = int(1, d === 0 ? 4 : 8);
  const a = 10 + o, b = int(o + 1, 9);
  const e = A.eq(`${a} − ${b} = ?`);
  return Q({ say: `${a} 빼기 ${b}${eun(b)}?`, text: '빼면 몇?', visual: e + (d === 0 ? A.frames(a, 0, b) : ''), choices: numOpts(a - b, 4, 0, 18, 2, [b - o, a - b + 1, 10 - b]), answer: a - b, concrete: e + A.frames(a, 0, b), hint: { say: `먼저 ${o}${eul(o)} 빼서 10` } });
});

U('L4-4', 'num', 'L4', '두 자리 뺄셈', { home: '가게 놀이 거스름돈 계산' }, d => {
  let a, b;
  if (d === 0) { do { a = int(21, 95); b = int(2, 9); } while (a % 10 >= b); }
  else { do { a = int(31, 98); b = int(12, a - 10); } while (a % 10 >= b % 10); }
  const r = a - b;
  const err = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10));
  const e = A.eq(`${a} − ${b} = ?`);
  return Q({ say: `${a} 빼기 ${b}${eun(b)}?`, text: '빼면 몇?', visual: e, choices: numOpts(r, 4, 0, 99, 2, [err, r + 10, r - 1]), answer: r, concrete: e + A.base10(0, Math.floor(a / 10), a % 10), hint: { say: '10 묶음 하나를 풀어봐' } });
});

U('L4-5', 'num', 'L4', '세 수의 계산', { home: '가족 셋의 사탕 합치기' }, d => {
  const t = d === 0 ? 0 : int(0, 2);
  let a, b, c, expr, ans, say;
  if (t === 0) { a = int(1, 6); b = int(1, 6); c = int(1, 6); ans = a + b + c; expr = `${a} + ${b} + ${c}`; say = `${a} 더하기 ${b} 더하기 ${c}${eun(c)}?`; }
  else if (t === 1) { a = int(10, 18); b = int(1, 5); c = int(1, Math.min(5, a - b)); ans = a - b - c; expr = `${a} − ${b} − ${c}`; say = `${a} 빼기 ${b} 빼기 ${c}${eun(c)}?`; }
  else { a = int(2, 9); b = int(2, 9); c = int(1, a + b); ans = a + b - c; expr = `${a} + ${b} − ${c}`; say = `${a} 더하기 ${b} 빼기 ${c}${eun(c)}?`; }
  return Q({ say, text: '앞에서부터 계산', visual: A.eq(`${expr} = ?`), choices: numOpts(ans, 4, 0, 30, 2), answer: ans, hint: { say: '앞의 두 수부터 계산해' } });
});

// ── L5 묶음에서 구구단 (6) ──
U('L5-1', 'num', 'L5', '묶어 세기', { home: '과자 봉지 몇 개씩 몇 봉지' }, d => {
  const m = int(2, 5), k = int(2, d === 0 ? 4 : 5);
  const e = pick(THINGS);
  if (d < 2) return Q({ say: `${m}씩 ${k}묶음은 몇 개?`, text: `${m}씩 ${k}묶음`, visual: A.groups(k, m, e), choices: numOpts(m * k, 4, 1, 30, m, [m * k + m, m * k - m, m + k]), answer: m * k, hint: { say: `${m}씩 뛰어 세어봐` } });
  const ans = `${m} × ${k}`;
  return Q({ say: '곱셈식으로 나타내면?', text: '곱셈식 고르기', visual: A.groups(k, m, e), choices: strOpts(ans, [`${m} + ${k}`, `${m} × ${k + 1}`, `${m + 1} × ${k}`]), answer: ans, hint: { say: `${m}씩 ${k}묶음이야` } });
});

function timesGen(tables) {
  return d => {
    const a = pick(tables);
    const b = d === 0 ? int(1, 5) : int(1, 9);
    const [x, y] = d === 2 && int(0, 1) ? [b, a] : [a, b];
    const ans = a * b;
    const e = A.eq(`${x} × ${y} = ?`);
    return Q({ say: `${x} 곱하기 ${y}${eun(y)}?`, text: `${a}단`, visual: e + (d === 0 ? A.dotArray(b, a) : ''), choices: numOpts(ans, 4, 0, 90, 2, [ans + a, ans - a, ans + 1]), answer: ans, concrete: e + A.dotArray(b, a), hint: { say: `${a}씩 ${b}번 뛰어 세기` }, key: `${x}x${y}` });
  };
}
U('L5-2', 'num', 'L5', '2단과 5단', { home: '양말(2), 손가락(5)으로 뛰어 세기' }, timesGen([2, 5]));
U('L5-3', 'num', 'L5', '3단과 4단', { home: '세발자전거·네발자동차 바퀴 세기' }, timesGen([3, 4]));
U('L5-4', 'num', 'L5', '6단과 7단', { home: '달력 7일씩 세기' }, timesGen([6, 7]));
U('L5-5', 'num', 'L5', '8단과 9단', { home: '문어 다리 8개씩 세기' }, timesGen([8, 9]));

U('L5-6', 'num', 'L5', '잊었을 때 복구', { home: '"모르면 아는 데서 한 묶음 더" 말로 연습' }, d => {
  const a = int(3, 9), b = int(2, 8);
  const known = a * b;
  const up = d === 0 || (d === 2 && int(0, 1) === 1);
  const qb = up ? b + 1 : b - 1;
  const ans = up ? known + a : known - a;
  return Q({ say: `${a} 곱하기 ${qb}${eun(qb)}?`, text: '아는 걸로 풀기', visual: A.eq(`${a} × ${b} = ${known}`, false) + A.eq(`${a} × ${qb} = ?`), choices: numOpts(ans, 4, 0, 90, 2, [up ? known + b : known - b, up ? known + 1 : known - 1, ans + a]), answer: ans, concrete: A.eq(`${a} × ${qb} = ?`) + A.dotArray(up ? b + 1 : b, a, true), hint: { say: `${a}씩 한 묶음 ${up ? '더' : '빼기'}` } });
});

// ── L6 세 자리 수와 마무리 (7) ──
U('L6-1', 'num', 'L6', '짝수와 홀수', { home: '신발 둘씩 짝지어 남는지 보기' }, d => {
  const n = d === 2 ? int(10, 50) : int(2, d === 0 ? 10 : 20);
  return Q({ say: `${n}${eun(n)} 짝수일까 홀수일까?`, text: '짝수? 홀수?', visual: d === 2 ? A.bignum(n) : A.pairs(n), choices: [txt('짝수'), txt('홀수')], fixedOrder: true, answer: n % 2 ? '홀수' : '짝수', concrete: A.pairs(n), hint: { say: '둘씩 짝지어 봐' } });
});

U('L6-2', 'num', 'L6', '백과 세 자리 수', { home: '100원 동전 세며 금액 말하기' }, d => {
  const h = int(1, d === 0 ? 4 : 9);
  let t = int(1, 9), o = int(1, 9);
  if (d >= 1 && int(0, 1)) (int(0, 1) ? (t = 0) : (o = 0));
  const n = h * 100 + t * 10 + o;
  const mode = d === 0 ? 0 : int(0, 2);
  const wrong = [h * 100 + o * 10 + t, h * 10 + (t || o), n + 100, h * 1000 + t * 10 + o].filter(x => x !== n);
  if (mode === 0 && h <= 4) return Q({ say: '모두 얼마일까?', text: '수 모형 읽기', visual: A.base10(h, t, o), choices: numOpts(n, 4, 100, 9999, 1, wrong), answer: n, hint: { say: '큰 것부터 세어봐' } });
  if (mode <= 1) return Q({ say: '어떤 수일까?', text: '어떤 수일까?', visual: A.note(`100이 ${h}개<br>10이 ${t}개<br>1이 ${o}개`), choices: numOpts(n, 4, 10, 9999, 1, wrong), answer: n, hint: { say: '0인 자리도 써야 해' } });
  const ans = readKo(n);
  return Q({ say: `${n}${eul(n)} 읽어봐`, text: '어떻게 읽을까?', visual: A.bignum(n), choices: strOpts(ans, wrong.map(readKo)), answer: ans, layout: 'wide', hint: { say: '0인 자리는 안 읽어' } });
});

U('L6-3', 'num', 'L6', '천과 네 자리 수', { home: '1000원 지폐와 동전으로 가격 만들기' }, d => {
  const mode = int(0, 2);
  if (mode === 2) {
    const ds = sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
    const n = +ds.join('');
    const i = int(0, 3);
    const names = ['천의 자리', '백의 자리', '십의 자리', '일의 자리'];
    return Q({ say: `${ds[i]}${eun(ds[i])} 어느 자리 숫자야?`, text: '어느 자리일까?', visual: A.bignum(n) + A.note(`${ds[i]}${eun(ds[i])} 어느 자리?`), choices: names.map(x => txt(x)), fixedOrder: true, answer: names[i], hint: { say: '오른쪽부터 일, 십, 백, 천' } });
  }
  const a = int(1, 9);
  let b = int(0, 9), c = int(0, 9), e = int(0, 9);
  if (d >= 1) { const z = int(0, 2); if (z === 0) b = 0; else if (z === 1) c = 0; else { b = 0; c = int(1, 9); } }
  const n = a * 1000 + b * 100 + c * 10 + e;
  const wrong = [a * 1000 + c * 100 + b * 10 + e, a * 100 + b * 10 + c + (e ? 0 : 1), n + 1000, a * 1000 + b * 100 + e * 10 + c].filter(x => x !== n && x > 0);
  if (mode === 0) {
    const ans = readKo(n);
    return Q({ say: '이 수를 읽어봐', text: '어떻게 읽을까?', visual: A.bignum(n), choices: strOpts(ans, wrong.map(readKo)), answer: ans, layout: 'wide', hint: { say: '천, 백, 십, 일 순서야' } });
  }
  return Q({ say: '어떤 수일까?', text: '어떤 수일까?', visual: A.note(`1000이 ${a}개, 100이 ${b}개<br>10이 ${c}개, 1이 ${e}개`), choices: numOpts(n, 4, 1, 99999, 1, wrong), answer: n, hint: { say: '0인 자리에는 0을 써' } });
});

U('L6-4', 'num', 'L6', '수의 계열과 크기 비교', { home: '영수증 금액 크기 비교' }, d => {
  const mode = d === 0 ? int(0, 1) : int(0, 2);
  if (mode === 0) {
    const step = pick([1, 10, 100, 1000]);
    const start = step === 1000 ? 1000 * int(1, 5) + int(0, 9) * 100 : int(1, 5) * 1000 + int(0, 9) * 100 + int(0, 9) * 10;
    const list = [0, 1, 2, 3].map(i => start + i * step);
    const pos = int(1, 3);
    const ans = list[pos];
    list[pos] = null;
    return Q({ say: `${step}씩 뛰어 세어봐`, text: `${step}씩 뛰어 세기`, visual: A.track(list), choices: numOpts(ans, 4, 0, 99999, 1, [ans + step, ans - step, ans + (step === 1 ? 10 : step / 10)]), answer: ans, layout: 'wide', hint: { say: `${step}씩 커지는 자리를 봐` } });
  }
  if (mode === 1) {
    const x = int(1000, 9899);
    const ds = String(x).split('');
    const i = int(1, 3);
    const nd = (+ds[i] + int(1, 9 - +ds[i] || 1)) % 10;
    ds[i] = String(nd);
    const y = +ds.join('') === x ? x + 10 : +ds.join('');
    return Q({ say: '더 큰 수를 골라봐', text: '더 큰 수', visual: '', choices: [num(x), num(y)], answer: Math.max(x, y), hint: { say: '높은 자리부터 비교해' } });
  }
  const base = int(1, 9) * 1000;
  const ns = sample([base + int(100, 999), base + int(100, 999), base + int(10, 99), base - int(100, 999)], 3);
  const uniq = [...new Set(ns)];
  return Q({ say: '가장 큰 수를 골라봐', text: '가장 큰 수', visual: '', choices: uniq.map(num), answer: Math.max(...uniq), hint: { say: '천의 자리부터 비교해' } });
});

U('L6-5', 'num', 'L6', '합이 세 자리 수인 덧셈', { home: '두 물건 가격 합치기' }, d => {
  let a, b;
  if (d < 2) { do { a = int(35, 99); b = int(35, 99); } while (a + b < 100 || (d === 1 && (a % 10) + (b % 10) < 10)); }
  else { do { a = int(101, 899); b = int(12, 99); } while (a + b > 999 || (a % 10) + (b % 10) < 10); }
  const s = a + b;
  return Q({ say: `${a} 더하기 ${b}${eun(b)}?`, text: '더하면 몇?', visual: A.eq(`${a} + ${b} = ?`), choices: numOpts(s, 4, 0, 999, 2, [s - 10, s + 10, s - 100]), answer: s, hint: { say: '같은 자리끼리 더해' } });
});

U('L6-6', 'num', 'L6', '□ 구하기', { home: '"몇을 더하면 10?" 퀴즈' }, d => {
  const hi = d === 0 ? 20 : d === 1 ? 50 : 99;
  const t = d === 0 ? int(0, 1) : int(0, 3);
  const x = int(1, Math.floor(hi / 2)), a = int(1, Math.floor(hi / 2));
  const [expr, ans] = [
    [`□ + ${a} = ${x + a}`, x],
    [`${a} + □ = ${x + a}`, x],
    [`□ − ${a} = ${x}`, x + a],
    [`${x + a} − □ = ${a}`, x],
  ][t];
  return Q({ say: '네모에 들어갈 수는?', text: '□는 얼마?', visual: A.eq(expr.replace('□', '<span class="box">□</span>')), choices: numOpts(ans, 4, 0, 200, 2, [x + a + a, Math.abs(x - a) || 1]), answer: ans, hint: { say: '거꾸로 계산해 봐' } });
});

U('L6-7', 'num', 'L6', '곱셈표 전체', { home: '곱셈표 빙고' }, d => {
  let a = int(1, 9), b = int(d === 0 ? 1 : 0, 9);
  if (rand() < 0.3) a = pick([0, 1]);
  if (int(0, 1)) [a, b] = [b, a];
  const ans = a * b;
  return Q({ say: `${a} 곱하기 ${b}${eun(b)}?`, text: '곱셈표', visual: A.eq(`${a} × ${b} = ?`), choices: numOpts(ans, 4, 0, 81, 2, [a + b, ans + Math.max(a, b), ans + 1]), answer: ans, hint: { say: a === 0 || b === 0 ? '0을 몇 번 더해도 0' : a === 1 || b === 1 ? '1씩 묶으면 그대로야' : `${a}씩 ${b}묶음이야` }, key: `${a}x${b}` });
});

// ═════════════════ 도형과 측정 16단원 ═════════════════
const NAME3 = { circle: '동그라미', triangle: '세모', square: '네모' };
const VAR3 = { circle: ['circle'], triangle: ['triangle', 'rtri', 'ttri', 'wtri'], square: ['square', 'rect', 'tall'] };

U('B1', 'shape', 'B', '세모·네모·동그라미 찾기', { minAge: 4, home: '집 안에서 동그라미 물건 찾기' }, d => {
  const ks = ['circle', 'triangle', 'square'];
  const t = pick(ks);
  const col = pick(PALETTE);
  return Q({ say: `${NAME3[t]}를 찾아봐`, text: `${NAME3[t]} 찾기`, visual: '', choices: ks.map(k => pic(k, A.shape(d === 2 ? pick(VAR3[k]) : k, { fill: d === 0 ? col : pick(PALETTE), rot: d === 2 && k !== 'circle' ? int(-30, 30) : 0 }))), answer: t, hint: { say: { circle: '둥근 걸 찾아봐', triangle: '뾰족한 곳이 셋', square: '뾰족한 곳이 넷' }[t] } });
});

U('B2', 'shape', 'B', '같은 모양끼리 모으기', { minAge: 4, home: '블록을 모양별로 정리하기' }, d => {
  const pool = d === 0 ? ['circle', 'triangle', 'square'] : ['circle', 'triangle', 'square', 'star', 'heart', 'hex'];
  const [t, ...others] = sample(pool, 3);
  const c1 = pick(PALETTE);
  const c2 = d === 0 ? c1 : pick(PALETTE.filter(c => c !== c1));
  return Q({ say: '같은 모양을 골라봐', text: '같은 모양', visual: `<div class="target">${A.shape(t, { fill: c1, scale: 0.9 })}</div>`, choices: [pic(t, A.shape(t, { fill: c2, scale: d === 0 ? 0.9 : 0.6 })), ...others.map(k => pic(k, A.shape(k, { fill: d === 2 ? c1 : pick(PALETTE) })))], answer: t, hint: { say: '색 말고 모양을 봐' } });
});

const SOLID_OBJ = { box: ['📦', '🎁', '🧊', '🎲'], cyl: ['🥫', '🧻', '🕯️', '🔋'], ball: ['⚽', '🏀', '🍊', '🌍'] };
U('B3', 'shape', 'B', '상자·기둥·공 모양', { minAge: 5, after: 'L-1-7', home: '집 물건으로 상자·기둥·공 모양 찾기', mission: '상자·휴지심·공으로 탑 쌓아보기' }, d => {
  const ks = ['box', 'cyl', 'ball'];
  if (d < 2) {
    const t = pick(ks);
    return Q({ say: '어떤 모양일까?', text: '어떤 모양?', visual: A.target(pick(SOLID_OBJ[t])), choices: ks.map(k => pic(k, A.solid(k))), answer: t, hint: { say: { box: '평평하고 뾰족해', cyl: '눕히면 굴러가', ball: '어디로나 굴러가' }[t] } });
  }
  const miss = pick(ks);
  const used = ks.filter(k => k !== miss);
  return Q({ say: '안 쓴 모양은 뭘까?', text: '안 쓴 모양은?', visual: A.solidBuild(shuffle([used[0], used[1], pick(used)])), choices: ks.map(k => pic(k, A.solid(k))), answer: miss, hint: { say: '하나씩 짚어봐' } });
});

function isoVariants(grid) {
  const seen = new Set([JSON.stringify(grid)]);
  const res = [];
  for (let tries = 0; res.length < 3 && tries < 80; tries++) {
    const g = grid.map(r => r.slice());
    const r = int(0, g.length - 1), c = int(0, g[0].length - 1);
    const nv = g[r][c] + pick([-1, 1]);
    if (nv < 0 || nv > 3) continue;
    g[r][c] = nv;
    if (g.flat().reduce((a, b) => a + b, 0) < 2) continue;
    const k = JSON.stringify(g);
    if (seen.has(k)) continue;
    seen.add(k);
    res.push(g);
  }
  return res;
}
U('B4', 'shape', 'B', '쌓기나무 보고 고르기', { minAge: 6, after: 'L0-3', home: '블록 쌓아 똑같이 따라 만들기', mission: '실제 블록으로 그림 모양 따라 쌓기' }, d => {
  const cols = d === 0 ? 3 : 4, rowsN = d === 2 ? 2 : 1;
  const grid = Array.from({ length: rowsN }, (_, r) => Array.from({ length: cols }, () => (r === 0 ? int(1, 3) : int(0, 1))));
  return Q({ say: '똑같은 모양을 골라봐', text: '똑같은 모양', visual: A.iso(grid), choices: [pic('t', A.iso(grid)), ...isoVariants(grid).map((g, i) => pic('v' + i, A.iso(g)))], answer: 't', hint: { say: '높이를 하나씩 비교해' }, key: 'B4' + JSON.stringify(grid) });
});

const B5SET = {
  삼각형: { yes: ['triangle', 'rtri', 'ttri', 'wtri'], no: ['openTri', 'curveTri', 'roundTri', 'square', 'pent'] },
  사각형: { yes: ['square', 'rect', 'tall', 'trap', 'para'], no: ['openSq', 'roundSq', 'triangle', 'pent', 'circle'] },
  원: { yes: ['circle'], no: ['ellipse', 'egg', 'arc', 'hex'] },
};
U('B5', 'shape', 'B', '삼각형·사각형·원', { minAge: 7, after: 'L1-5', home: '종이 접어 삼각형·사각형 만들기' }, d => {
  const nm = pick(d === 0 ? ['삼각형', '원'] : ['삼각형', '사각형', '원']);
  const yes = int(0, 1) === 0;
  const k = pick(B5SET[nm][yes ? 'yes' : 'no']);
  return Q({ say: `이건 ${nm}일까?`, text: `${nm}일까?`, visual: A.shape(k, { fill: pick(PALETTE), rot: k === 'circle' ? 0 : int(-40, 40), scale: k === 'circle' ? pick([0.6, 0.8, 1]) : 1 }), choices: [txt('예', '맞아요'), txt('아니요', '아니에요')], fixedOrder: true, answer: yes ? '예' : '아니요', hint: { say: { 삼각형: '곧은 선 3개로 닫혔나?', 사각형: '곧은 선 4개로 닫혔나?', 원: '똑같이 둥근가 봐' }[nm] }, key: `B5${nm}${k}` });
});

function irregular(n) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((-90 + (i * 360) / n + int(-12, 12)) * Math.PI) / 180, r = int(32, 44);
    return [50 + r * Math.cos(a), 52 + r * Math.sin(a)];
  });
}
U('B6', 'shape', 'B', '꼭짓점·변 세기', { minAge: 7, after: 'L2-1', home: '책·접시 모서리 세기' }, d => {
  const n = int(3, d === 0 ? 4 : d === 1 ? 5 : 6);
  const mode = pick(['vtx', 'edge']);
  const p = d === 2 ? irregular(n) : A.polyPts(n, 42, -90 + int(0, 30));
  return Q({ say: mode === 'vtx' ? '꼭짓점을 눌러 세어봐' : '변을 눌러 세어봐', text: mode === 'vtx' ? '꼭짓점은 몇 개?' : '변은 몇 개?', visual: A.polyCount(p, mode), count: true, choices: numOpts(n, 4, 2, 8, 2), answer: n, hint: { say: mode === 'vtx' ? '뾰족한 곳이 꼭짓점' : '곧은 선이 변이야' } });
});

U('B7', 'shape', 'B', '길다·많다·무겁다·넓다', { minAge: 6, after: 'L0-3', home: '두 물건 양손에 들고 무게 비교', mission: '양손에 물건 들고 더 무거운 것 말하기' }, d => {
  const m = pick(d === 0 ? ['len'] : d === 1 ? ['len', 'cup', 'seesaw'] : ['cup', 'seesaw', 'area']);
  const cs = sample([A.COLORS.red, A.COLORS.blue, A.COLORS.green, A.COLORS.orange], 2);
  const ch = cs.map(c => pic(c, A.chip(c)));
  if (m === 'len') {
    const L = sample([35, 55, 72, 92], 2);
    const long = d === 0 || int(0, 1) === 0;
    return Q({ say: `더 ${long ? '긴' : '짧은'} 것은 뭘까?`, text: `더 ${long ? '긴' : '짧은'} 것`, visual: A.bars([{ len: L[0], color: cs[0] }, { len: L[1], color: cs[1] }]), choices: ch, fixedOrder: true, answer: (long ? L[0] > L[1] : L[0] < L[1]) ? cs[0] : cs[1], hint: { say: '끝을 맞추고 봐' } });
  }
  if (m === 'cup') {
    const L = sample([30, 50, 70, 90], 2);
    return Q({ say: '물이 더 많은 컵은?', text: '더 많은 컵', visual: A.cups(L, cs), choices: ch, fixedOrder: true, answer: L[0] > L[1] ? cs[0] : cs[1], hint: { say: '같은 컵이면 높이를 봐' } });
  }
  if (m === 'seesaw') {
    const heavy = int(0, 1);
    return Q({ say: '더 무거운 것은 뭘까?', text: '더 무거운 것', visual: A.seesaw(heavy, cs), choices: ch, fixedOrder: true, answer: cs[heavy], hint: { say: '내려간 쪽이 무거워' } });
  }
  const w1 = int(4, 6), h1 = int(4, 6), big = [w1, h1], small = [int(2, w1 - 1), int(2, h1)];
  const swap = int(0, 1);
  const [a, b] = swap ? [small, big] : [big, small];
  return Q({ say: '더 넓은 것은 뭘까?', text: '더 넓은 것', visual: A.areas(a, b, cs, true), choices: ch, fixedOrder: true, answer: swap ? cs[1] : cs[0], hint: { say: '겹쳐서 남는 쪽을 봐' } });
});

U('B8', 'shape', 'B', '클립 몇 개? (임의 단위)', { minAge: 7, after: 'L1-5', home: '뼘으로 책상 길이 재기', mission: '뼘·클립으로 책상 길이 재기' }, d => {
  if (d < 2) {
    const n = int(3, 8);
    return Q({ say: '클립 몇 개만큼 길까?', text: '클립 몇 개?', visual: A.clips(n, A.COLORS.orange), choices: numOpts(n, 4, 1, 10, 2), answer: n, hint: { say: '클립을 하나씩 세어봐' } });
  }
  const a = int(4, 8), b = int(2, a - 1);
  return Q({ say: '주황이 몇 개 더 길까?', text: '몇 개 더 길까?', visual: A.clips(a, A.COLORS.orange, b), choices: numOpts(a - b, 4, 0, 8, 2, [a, b]), answer: a - b, hint: { say: '남는 클립을 세어봐' } });
});

U('B9', 'shape', 'B', '자 눈금 읽기 (1cm)', { req: ['L3-4'], home: '자로 집 물건 재기', mission: '자로 연필·숟가락·책 길이 재기' }, d => {
  const start = d === 2 ? int(1, 4) : 0;
  const len = int(2, Math.min(d === 0 ? 8 : 10, 12 - start));
  return Q({ say: '몇 센티미터일까?', text: '몇 cm일까?', visual: A.ruler(start, len), choices: numOpts(len, 4, 1, 12, 2, start ? [start + len] : [len + 1]).map(withUnit('cm')), answer: len, hint: { say: start ? '0에서 시작 안 했어' : '끝 눈금을 읽어봐' } });
});

U('B10', 'shape', 'B', '몇 m 몇 cm', { req: ['B9', 'L6-2'], home: '줄자로 키 재기', mission: '줄자로 가족 키 재기' }, () => {
  const n = int(101, 399), m = Math.floor(n / 100), c = n % 100;
  if (int(0, 1)) {
    const ans = `${m} m ${c} cm`;
    return Q({ say: `${n}센티미터는?`, text: `${n} cm는?`, visual: A.bignum(`${n} cm`), choices: strOpts(ans, [`${m * 10 + Math.floor(c / 10)} m ${c % 10} cm`, `${n} m`, `${m + 1} m ${c} cm`]), answer: ans, layout: 'wide', hint: { say: '100 cm가 1 m야' } });
  }
  return Q({ say: `${m}미터 ${c}센티미터는?`, text: `${m} m ${c} cm는?`, visual: A.bignum(`${m} m ${c} cm`), choices: numOpts(n, 4, 1, 9999, 1, [m * 10 + c, m * 1000 + c, n + 100]).map(withUnit('cm')), answer: n, hint: { say: '1 m는 100 cm야' } });
});

const EST = [['✏️', '연필', 15, 'cm'], ['🥄', '숟가락', 20, 'cm'], ['🍌', '바나나', 20, 'cm'], ['📱', '휴대폰', 15, 'cm'], ['🚪', '문 높이', 2, 'm'], ['🛏️', '침대', 2, 'm'], ['🚌', '버스', 10, 'm'], ['🪑', '의자 높이', 40, 'cm']];
U('B11', 'shape', 'B', '길이 어림하기', { req: ['B10'], home: '"이건 몇 cm쯤?" 맞히기', mission: '어림한 뒤 자로 재서 비교하기' }, () => {
  const [e, name, v, u] = pick(EST);
  const other = u === 'cm' ? 'm' : 'cm';
  const ans = `약 ${v} ${u}`;
  return Q({ say: `${jw(name, '은', '는')} 약 얼마일까?`, text: `${name} 길이는?`, visual: A.target(e), choices: strOpts(ans, [`약 ${v} ${other}`, `약 ${v * 10} ${u}`, `약 ${Math.max(1, Math.floor(v / 10))} ${u === 'm' ? 'cm' : u}`]), answer: ans, hint: { say: '1 m는 두 팔 벌린 만큼' } });
});

U('B12', 'shape', 'B', '길이의 덧셈·뺄셈', { req: ['L4-5', 'B11'], home: '끈 두 개 이어 길이 재기' }, d => {
  const t = d === 0 ? int(0, 1) : int(0, 3);
  if (t <= 1) {
    const a = int(20, 60), b = int(10, 35);
    const [x, y] = t === 0 ? [a, b] : [a + b, b];
    const ans = t === 0 ? x + y : x - y;
    return Q({ say: t === 0 ? '두 길이를 더하면?' : '두 길이의 차는?', text: '길이 계산', visual: A.eq(`${x} cm ${t === 0 ? '+' : '−'} ${y} cm`), choices: numOpts(ans, 4, 0, 200, 3, [ans + 10, ans - 10]).map(withUnit('cm')), answer: ans, hint: { say: '같은 단위끼리 계산해' } });
  }
  const m1 = int(1, 3), c1 = int(20, 70), m2 = int(1, 2), c2 = int(10, 25);
  const plus = t === 2;
  const tot = plus ? (m1 + m2) * 100 + c1 + c2 : Math.abs((m1 * 100 + c1) - (m2 * 100 + c2));
  const [big, sm] = plus ? [[m1, c1], [m2, c2]] : m1 * 100 + c1 >= m2 * 100 + c2 ? [[m1, c1], [m2, c2]] : [[m2, c2], [m1, c1]];
  const f = n => `${Math.floor(n / 100)} m ${n % 100} cm`;
  const ans = f(tot);
  return Q({ say: plus ? '두 길이를 더하면?' : '두 길이의 차는?', text: '길이 계산', visual: A.eq(`${big[0]} m ${big[1]} cm ${plus ? '+' : '−'} ${sm[0]} m ${sm[1]} cm`, false), choices: strOpts(ans, [f(tot + 100), f(Math.max(0, tot - 10)), f(tot + 10)]), answer: ans, layout: 'wide', hint: { say: 'm는 m끼리, cm는 cm끼리' } });
});

U('B13', 'shape', 'B', '몇 시·몇 시 30분', { minAge: 7, after: 'L2-1', home: '밥 먹는 시각을 시계로 말하기' }, d => {
  const h = int(1, 12);
  const half = d > 0 && int(0, 1) === 1;
  const lab = (hh, mm) => (mm ? `${hh}시 30분` : `${hh}시`);
  const nx = (h % 12) + 1, pv = ((h + 10) % 12) + 1;
  const ans = lab(h, half);
  const extra = half ? [lab(nx, 1), lab(h, 0), lab(pv, 1)] : [lab(nx, 0), lab(pv, 0), '12시'];
  return Q({ say: '몇 시일까?', text: '몇 시일까?', visual: A.clock(h, half ? 30 : 0), choices: strOpts(ans, extra), answer: ans, concrete: A.clock(h, half ? 30 : 0, { mark: h }) + A.note(half ? '짧은바늘이 지나온 숫자' : '긴바늘이 12면 정각'), hint: { say: half ? '짧은바늘이 지나온 수를 봐' : '긴바늘이 12면 정각이야' } });
});

U('B14', 'shape', 'B', '몇 시 몇 분', { req: ['L3-3', 'B13'], home: '디지털 시계와 바늘 시계 맞춰보기' }, d => {
  const h = int(1, 12);
  const m = d === 2 ? int(1, 59) : 5 * int(1, 11);
  const lab = (hh, mm) => `${hh}시 ${mm}분`;
  const ans = lab(h, m);
  const swapH = Math.round(m / 5) || 12;
  const extra = [lab((h % 12) + 1, m), d === 2 ? lab(h, m < 59 ? m + 1 : m - 1) : lab(h, m < 55 ? m + 5 : m - 5), lab(swapH, h * 5 === 60 ? 0 : h * 5)];
  return Q({ say: '몇 시 몇 분일까?', text: '몇 시 몇 분?', visual: A.clock(h, m), choices: strOpts(ans, extra), answer: ans, hint: { say: '긴바늘은 5분씩 세어봐' } });
});

U('B15', 'shape', 'B', '1시간은 60분', { req: ['B14'], home: '타이머 60분 맞춰보기' }, d => {
  const t = d === 0 ? pick([0, 3]) : d === 1 ? pick([1, 3]) : pick([1, 2]);
  if (t === 0) return Q({ say: '1시간은 몇 분일까?', text: '1시간은 몇 분?', visual: A.clock(12, 0), choices: numOpts(60, 4, 1, 100, 1, [100, 30, 10]).map(withUnit('분')), answer: 60, hint: { say: '긴바늘이 한 바퀴' } });
  if (t === 1) {
    const a = int(1, 2), b = 5 * int(1, 11), ans = a * 60 + b;
    return Q({ say: `${a}시간 ${b}분은 몇 분?`, text: `${a}시간 ${b}분은?`, visual: '', choices: numOpts(ans, 4, 1, 999, 1, [a * 100 + b, a + b, ans + 10]).map(withUnit('분')), answer: ans, hint: { say: '1시간은 60분이야' } });
  }
  if (t === 2) {
    const n = int(65, 170), ans = `${Math.floor(n / 60)}시간 ${n % 60}분`;
    return Q({ say: `${n}분은 몇 시간 몇 분?`, text: `${n}분은?`, visual: '', choices: strOpts(ans, [`${Math.floor(n / 60) + 1}시간 ${Math.max(0, (n % 60) - 10)}분`, `${Math.floor(n / 60) + 1}시간 ${n % 60}분`, `${Math.floor(n / 60)}시간 ${(n % 60) + 10}분`]), answer: ans, hint: { say: '60분씩 덜어내 봐' } });
  }
  const h = int(1, 9), k = int(1, 3), ans = `${h + k}시`;
  return Q({ say: `${h}시에서 ${k}시간 뒤는?`, text: `${k}시간 뒤는?`, visual: A.clock(h, 0), choices: strOpts(ans, [`${h + k + 1}시`, `${h}시 ${k}0분`, `${Math.max(1, h - k)}시`]), answer: ans, hint: { say: '짧은바늘이 한 칸씩' } });
});

U('B16', 'shape', 'B', '달력: 일·주·월·년', { minAge: 8, after: 'L4-1', home: '달력에 가족 생일 표시하기' }, d => {
  const t = pick(d === 0 ? [0, 1, 2] : d === 1 ? [2, 3] : [3, 4]);
  if (t === 0) return Q({ say: '1주일은 며칠일까?', text: '1주일은 며칠?', visual: A.calendar(0, 7), choices: numOpts(7, 4, 1, 31, 2, [5, 10]).map(withUnit('일')), answer: 7, hint: { say: '일요일부터 토요일까지' } });
  if (t === 1) return Q({ say: '1년은 몇 개월일까?', text: '1년은 몇 개월?', visual: '', choices: numOpts(12, 4, 1, 31, 2, [10, 7, 30]).map(withUnit('개월')), answer: 12, hint: { say: '1월부터 12월까지' } });
  if (t === 2) {
    const i = int(0, 6), ans = `${A.DOW[(i + 1) % 7]}요일`;
    return Q({ say: `${A.DOW[i]}요일 다음 날은?`, text: '다음 날은?', visual: A.calendar(0, 7, i + 1), choices: strOpts(ans, [`${A.DOW[(i + 6) % 7]}요일`, `${A.DOW[(i + 2) % 7]}요일`, `${A.DOW[(i + 3) % 7]}요일`]), answer: ans, hint: { say: '달력 오른쪽을 봐' } });
  }
  const start = int(0, 6), days = pick([28, 30, 31]);
  if (t === 3) {
    const x = int(1, days), ans = `${A.DOW[(start + x - 1) % 7]}요일`;
    return Q({ say: `${x}일은 무슨 요일?`, text: `${x}일은 무슨 요일?`, visual: A.calendar(start, days), choices: strOpts(ans, [1, 2, 6].map(k => `${A.DOW[(start + x - 1 + k) % 7]}요일`)), answer: ans, layout: 'wide', hint: { say: '그 날짜 위를 봐' } });
  }
  const x = int(1, days - 7);
  return Q({ say: `${x}일에서 1주일 뒤는?`, text: '1주일 뒤는?', visual: A.calendar(start, days, x), choices: numOpts(x + 7, 4, 1, 31, 2, [x + 1, x + 6]).map(withUnit('일')), answer: x + 7, layout: 'wide', hint: { say: '바로 아래 칸을 봐' } });
});

// ═════════════════ 변화와 관계 (C1=L-1-7 공유) ═════════════════
const PATS = { AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1] };
U('C2', 'pattern', 'C', 'AAB·ABC 반복', { minAge: 5, after: 'L-1-7', home: '구슬 꿰기로 규칙 만들기' }, d => {
  const key = d === 0 ? pick(['AAB', 'ABB']) : d === 1 ? 'ABC' : pick(['AABB', 'ABC', 'AAB']);
  const up = PATS[key];
  const sym = sample([...FRUITS, ...ANIMALS], 3);
  const len = Math.min(up.length * 2 + 2, 9);
  const list = Array.from({ length: len }, (_, i) => sym[up[i % up.length]]);
  const pos = d < 2 ? len - 1 : int(up.length, len - 1);
  const ans = list[pos];
  list[pos] = null;
  return Q({ say: pos === len - 1 ? '다음엔 뭐가 올까?' : '빈칸에 뭐가 올까?', text: '규칙 찾기', visual: A.seq(list), choices: sym.map(emo), answer: ans, hint: { say: '되풀이되는 부분을 찾아봐' } });
});

U('C3', 'pattern', 'C', '늘어나는 규칙', { minAge: 7, after: 'L1-5', home: '계단 블록 쌓기' }, d => {
  const k = d === 0 ? 1 : pick([1, 2]);
  const s0 = d === 2 ? int(1, 3) : 1;
  const hs = [s0, s0 + k, s0 + 2 * k];
  const ans = s0 + 3 * k;
  const opts = [...new Set([ans, ans + 1, hs[2], ans + k].filter(h => h >= 1))];
  return Q({ say: '다음 모양을 골라봐', text: '다음 모양은?', visual: A.towers([...hs, null]), choices: opts.map(h => pic(h, A.tower(h))), answer: ans, hint: { say: `${k}층씩 높아져` } });
});

U('C4', 'pattern', 'C', '수 배열 규칙', { minAge: 8, after: 'L3-2', home: '엘리베이터 숫자판 규칙 찾기' }, d => {
  if (d < 2) {
    const step = d === 0 ? pick([2, 5, 10]) : pick([3, 4, -2, -5, -10]);
    const start = step > 0 ? int(1, 10) : int(Math.abs(step) * 5, 50);
    const list = [0, 1, 2, 3, 4].map(i => start + i * step);
    const pos = d === 0 ? 4 : int(1, 4);
    const ans = list[pos];
    list[pos] = null;
    return Q({ say: '규칙을 찾아봐', text: '빈칸의 수는?', visual: A.track(list), choices: numOpts(ans, 4, 0, 99, 2, [ans + step, ans - step, ans + 1]), answer: ans, hint: { say: `${Math.abs(step)}씩 ${step > 0 ? '커져' : '작아져'}` } });
  }
  const start = int(1, 5) * 10 + int(1, 5);
  const blank = start + 10 * int(1, 3) + int(0, 4);
  return Q({ say: '빈칸의 수를 찾아봐', text: '수 배열표', visual: A.grid100(start, 5, 4, blank), choices: numOpts(blank, 4, 1, 99, 1, [blank + 1, blank - 1, blank + 10, blank - 10]), answer: blank, hint: { say: '아래로 가면 10씩 커져' } });
});

const PAT_SYM = ['🟦', '🟨', '🟩', '⭐', '🌙', '❤️'];
U('C5', 'pattern', 'C', '내가 만드는 규칙', { minAge: 8, after: 'L3-3', req: ['C4'], home: '박수·발 구르기 규칙 만들어 가족 퀴즈' }, d => ({
  kind: 'build', mode: 'pattern',
  say: '나만의 규칙을 만들어봐', text: '규칙 만들기',
  visual: '', symbols: sample(PAT_SYM, d === 0 ? 2 : 3), slots: 6,
  hint: { say: '되풀이되게 만들어봐' }, key: 'C5' + rand(),
}));

U('C6', 'pattern', 'C', '덧셈표·곱셈표 속 규칙', { minAge: 8, req: ['L4-1'], home: '곱셈표에서 같은 수 찾기' }, (d, ctx) => {
  const mul = d >= 1 && ctx?.passed?.('L5-5');
  const r0 = int(1, 6), c0 = int(1, 6);
  const rowsV = [r0, r0 + 1, r0 + 2], colsV = [c0, c0 + 1, c0 + 2];
  const br = pick(rowsV), bc = pick(colsV);
  const ans = mul ? br * bc : br + bc;
  return Q({ say: '빈칸에 알맞은 수는?', text: '표의 규칙', visual: A.opTable(rowsV, colsV, mul ? '×' : '+', [br, bc]), choices: numOpts(ans, 4, 0, 99, 2, [ans + 1, ans - 1, mul ? ans + br : ans + 2]), answer: ans, hint: { say: mul ? `오른쪽으로 ${br}씩 커져` : '오른쪽으로 1씩 커져' } });
});

// ═════════════════ 자료와 가능성 (D1=L0-1 공유) ═════════════════
U('D2', 'data', 'D', '나눈 것 개수 세기', { minAge: 6, after: 'L1-2', home: '장난감 종류별로 세기' }, d => {
  const cats = sample(CATS, d === 2 ? 3 : 2);
  const counts = cats.map(() => int(2, d === 2 ? 5 : d === 0 ? 5 : 7));
  const list = shuffle(cats.flatMap((c, i) => Array.from({ length: counts[i] }, () => pick(c.list))));
  const ti = int(0, cats.length - 1);
  return Q({ say: `${cats[ti].name}은 몇 개?`, text: `${cats[ti].name}은 몇 개?`, visual: A.items(list, list.length, { layout: 'scatter', count: true }), count: true, choices: numOpts(counts[ti], 4, 1, 15, 2, [list.length]), answer: counts[ti], hint: { say: `${cats[ti].name}만 눌러봐` } });
});

U('D3', 'data', 'D', '기준 정해 분류하기', { minAge: 7, after: 'L1-5', home: '양말을 색/무늬로 나눠보기' }, d => {
  const crit = d === 0 ? 'color' : d === 1 ? pick(['color', 'shape']) : pick(['color', 'shape', 'size']);
  const cv = sample(['red', 'blue', 'yellow', 'green'], 2), sv = sample(['circle', 'triangle', 'square'], 2), zv = [1, 0.6];
  const mix = [[0, 1, 0], [1, 0, 1]];
  const grp = g => [0, 1, 2].map(i => A.shape(crit === 'shape' ? sv[g] : sv[mix[g][i]], {
    fill: A.COLORS[crit === 'color' ? cv[g] : cv[mix[(g + 1) % 2][i]]],
    scale: crit === 'size' ? zv[g] : 0.9,
  })).join('');
  const opts = [txt('color', '🎨 색깔'), txt('shape', '🔷 모양'), ...(d === 2 ? [txt('size', '📏 크기')] : [])];
  return Q({ say: '무엇으로 나눴을까?', text: '나눈 기준은?', visual: `<div class="sorted"><div class="grpbox">${grp(0)}</div><div class="grpbox">${grp(1)}</div></div>`, choices: opts, fixedOrder: true, answer: crit, hint: { say: '한쪽끼리 같은 걸 찾아봐' } });
});

function likeData(k) {
  let vals;
  do { vals = Array.from({ length: k }, () => int(1, 7)); } while (new Set(vals).size < k);
  return { cats: sample(LIKE, k), vals };
}
U('D4', 'data', 'D', '표 읽기', { minAge: 7, after: 'L2-1', home: '가족이 좋아하는 과일 표 만들기' }, d => {
  const { cats, vals } = likeData(d === 0 ? 3 : 4);
  const t = d === 0 ? int(0, 1) : int(0, 2);
  const tbl = A.table(cats.map(c => c[0]), vals, { head: '과일' });
  if (t === 0) {
    const i = int(0, cats.length - 1);
    return Q({ say: `${cats[i][1]}는 몇 명?`, text: `${cats[i][1]}는 몇 명?`, visual: tbl, choices: numOpts(vals[i], 4, 1, 10, 2), answer: vals[i], hint: { say: `${cats[i][1]} 아래 칸을 봐` } });
  }
  if (t === 1) {
    const i = vals.indexOf(Math.max(...vals));
    return Q({ say: '가장 많은 건 뭘까?', text: '가장 많은 것', visual: tbl, choices: cats.map(c => emo(c[0])), fixedOrder: true, answer: cats[i][0], hint: { say: '제일 큰 수를 찾아봐' } });
  }
  const sum = vals.reduce((a, b) => a + b, 0);
  return Q({ say: '모두 몇 명일까?', text: '모두 몇 명?', visual: tbl, choices: numOpts(sum, 4, 1, 40, 3), answer: sum, hint: { say: '모든 수를 더해봐' } });
});

U('D5', 'data', 'D', '표 채우기', { minAge: 8, req: ['D4'], home: '빨래 개수 세어 표에 적기' }, d => {
  const cats = sample(LIKE, 3);
  const counts = cats.map(() => int(1, d === 0 ? 3 : 5));
  const list = shuffle(cats.flatMap((c, i) => Array(counts[i]).fill(c[0])));
  return { kind: 'build', mode: 'counter', say: '세어서 표를 채워봐', text: '표 채우기', visual: A.items(list, list.length, { layout: 'scatter', count: true }), count: true, labels: cats.map(c => c[0]), target: counts, max: 9, hint: { say: '칸을 누르면 1씩 올라' }, key: 'D5' + counts.join() };
});

U('D6', 'data', 'D', '○ 그래프 읽기', { minAge: 8, after: 'L2-5', home: '스티커로 그래프 만들기' }, d => {
  const { cats, vals } = likeData(d === 0 ? 3 : 4);
  const g = A.picto(cats.map(c => c[0]), vals);
  const t = d === 0 ? int(0, 1) : int(0, 2);
  if (t === 0) {
    const i = int(0, cats.length - 1);
    return Q({ say: `${cats[i][1]}는 몇 명?`, text: `${cats[i][1]}는 몇 명?`, visual: g, choices: numOpts(vals[i], 4, 1, 10, 2), answer: vals[i], hint: { say: '○를 세어봐' } });
  }
  const most = t === 1;
  const i = vals.indexOf(most ? Math.max(...vals) : Math.min(...vals));
  return Q({ say: `가장 ${most ? '많은' : '적은'} 건 뭘까?`, text: `가장 ${most ? '많은' : '적은'} 것`, visual: g, choices: cats.map(c => emo(c[0])), fixedOrder: true, answer: cats[i][0], hint: { say: most ? '가장 높은 줄을 봐' : '가장 낮은 줄을 봐' } });
});

U('D7', 'data', 'D', '○ 그래프 만들기', { minAge: 8, req: ['D6'], home: '가족 투표 결과 그래프 그리기' }, d => {
  const { cats, vals } = likeData(d === 0 ? 3 : 4);
  return { kind: 'build', mode: 'bars', say: '표를 보고 ○를 쌓아봐', text: '그래프 만들기', visual: A.table(cats.map(c => c[0]), vals, { head: '과일' }), labels: cats.map(c => c[0]), target: vals, max: 7, hint: { say: '칸을 누르면 거기까지 ○' }, key: 'D7' + vals.join() };
});

U('D8', 'data', 'D', '표·그래프로 비교', { minAge: 8, req: ['D6'], after: 'L3-2', home: '두 가지 개수 차이 말하기' }, d => {
  const { cats, vals } = likeData(3);
  const [i, j] = vals[0] > vals[1] ? [0, 1] : [1, 0];
  const v = d === 0 ? A.table(cats.map(c => c[0]), vals, { head: '과일' }) : A.picto(cats.map(c => c[0]), vals);
  return Q({ say: `${cats[i][1]}는 ${cats[j][1]}보다 몇 명 더?`, text: '몇 명 더 많을까?', visual: v, choices: numOpts(vals[i] - vals[j], 4, 0, 10, 1, [vals[i], vals[j], vals[i] + vals[j]]), answer: vals[i] - vals[j], hint: { say: '짝지어 남는 걸 세어봐' } });
});

// ═════════════════ 구조 ═════════════════
export const UNIT = Object.fromEntries(UNITS.map(u => [u.id, u]));
export const LEVELS = ['L-1', 'L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
export const LEVEL_NAME = {
  'L-1': '만 4세 준비', L0: '수 이전 준비', L1: '세기와 숫자', L2: '10까지 덧셈·뺄셈',
  L3: '50까지와 10의 구조', L4: '받아올림·받아내림', L5: '묶음에서 구구단', L6: '세 자리 수와 마무리',
};
export const AREA_NAME = { num: '수와 연산', shape: '도형과 측정', pattern: '변화와 관계', data: '자료와 가능성' };
export const AREA_SEQ = {
  num: UNITS.filter(u => u.area === 'num').map(u => u.id),
  shape: UNITS.filter(u => u.area === 'shape').map(u => u.id),
  pattern: ['L-1-7', ...UNITS.filter(u => u.area === 'pattern').map(u => u.id)],
  data: ['L0-1', ...UNITS.filter(u => u.area === 'data').map(u => u.id)],
};
export const SHARED = new Set(['L-1-7', 'L0-1']);
export const levelFirst = lv => AREA_SEQ.num.find(id => UNIT[id].level === lv);
export const isLevelLast = id => {
  const s = AREA_SEQ.num, i = s.indexOf(id);
  return i >= 0 && (i === s.length - 1 || UNIT[s[i + 1]].level !== UNIT[id].level);
};

// §3-1 권장 시작표
export const AGE_START = {
  4: { num: 'L-1-1', shape: 'B1', pattern: 'L-1-7', data: 'L0-1' },
  5: { num: 'L-1-4', shape: 'B1', pattern: 'L-1-7', data: 'L0-1' },
  6: { num: 'L0-2', shape: 'B3', pattern: 'C2', data: 'L0-1' },
  7: { num: 'L1-3', shape: 'B5', pattern: 'C3', data: 'D2' },
  8: { num: 'L2-1', shape: 'B5', pattern: 'C3', data: 'D3' },
};
export const ageStart = age => AGE_START[Math.max(4, Math.min(8, age))];

// ═════════════════ 진단 문항 (§3-2) ═════════════════
export const DIAG_LEVEL = { 1: 'L-1', 2: 'L-1', 3: 'L1', 4: 'L2', 5: 'L3', 6: 'L4', 7: 'L5' };
export function diagItem(k) {
  switch (k) {
    case 1: return { ...UNIT['L-1-1'].gen(0), unit: 'L-1-1' };
    case 2: return Q({ say: '몇 개일까?', text: '몇 개?', visual: A.items(pick(THINGS), 3, { layout: 'line' }), choices: [1, 2, 3].map(num), fixedOrder: true, answer: 3 });
    case 3: return Q({ say: '사과는 몇 개일까?', text: '몇 개일까?', visual: A.items('🍎', 7), choices: [7, 6, 8, 5].map(num), answer: 7 });
    case 4: return Q({ say: '3 더하기 4는?', text: '더하면 몇?', visual: A.eq('3 + 4 = ?') + A.frames(3, 4), choices: [7, 6, 8, 5].map(num), answer: 7 });
    case 5: return Q({ say: '28은 10개씩 몇 묶음?', text: '몇 묶음일까?', visual: A.bignum(28), choices: [2, 8, 3, 1].map(num), answer: 2 });
    case 6: return Q({ say: '36 더하기 47은?', text: '더하면 몇?', visual: A.eq('36 + 47 = ?'), choices: [83, 73, 84, 713].map(num), answer: 83 });
    default: return Q({ say: '6 곱하기 4는?', text: '곱하면 몇?', visual: A.eq('6 × 4 = ?'), choices: [24, 18, 10, 28].map(num), answer: 24 });
  }
}
