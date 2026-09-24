// 난이도 카드 — 나이보다 한 해 앞선 수준 (2022 개정 교육과정 / 누리과정 기준)
// 고른 카드의 문제만 나오고, 카드 안에서는 d=0→2 (학기 순서)로 서서히 어려워진다.
import { int, pick, sample, rand, eun, readKo } from './util.js';
import { UNIT, Q, numOpts } from './curriculum.js';
import * as A from './art.js';

export const ANIMALS = [
  ['🐶', '강아지'], ['🐱', '고양이'], ['🐰', '토끼'], ['🐻', '곰'], ['🐥', '병아리'],
  ['🐸', '개구리'], ['🐧', '펭귄'], ['🐼', '판다'], ['🦊', '여우'], ['🐷', '돼지'],
];
const SNACKS = [['🍪', '쿠키'], ['🍓', '딸기'], ['🍬', '사탕'], ['🍎', '사과'], ['🥕', '당근']];

const unit = (id, d) => ({ ...UNIT[id].gen(d, { passed: () => false }), unit: id });

// [가중치, 문제 만들기] 중에서 하나
function mix(list) {
  const total = list.reduce((s, [w]) => s + w, 0);
  let r = rand() * total;
  for (const [w, f] of list) if ((r -= w) < 0) return f();
  return list[list.length - 1][1]();
}

// 더하기·빼기. blocks=true면 수 모형(십 막대·낱개), 아니면 동물
function arith(op, a, b, blocks = false) {
  const [e, name] = pick(ANIMALS);
  const add = op === '+';
  const ans = add ? a + b : a - b;
  const big = a >= 10 || b >= 10;
  return Q({
    say: `${a} ${add ? '더하기' : '빼기'} ${b}${eun(b)}?`,
    text: `${a} ${add ? '+' : '−'} ${b} = ?`,
    visual: '',
    anim: { type: (blocks ? 'b' : '') + (add ? 'add' : 'sub'), a, b, e, name },
    choices: numOpts(ans, 4, 0, 199, 2, big ? [ans + 10, ans - 10, add ? ans + 1 : ans - 1] : add ? [ans + 1, ans - 1] : [ans - 1, ans + 1, a + b]),
    answer: ans,
    hint: { say: blocks ? '일의 자리부터 봐' : '동물을 하나씩 눌러 세어봐' },
    key: `${a}${op}${b}`,
  });
}

// 모션 없이 식만 (세 자리 수 계산 등)
function plain(op, a, b) {
  const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
  const word = { '+': '더하기', '−': '빼기', '×': '곱하기' }[op];
  const extra = op === '×' ? [ans + a, ans - b * 10 + b, ans + 10] : [ans + 100, ans - 100, ans + 10, ans - 10];
  return Q({
    say: `${a} ${word} ${b}${eun(b)}?`,
    text: `${a} ${op} ${b} = ?`,
    visual: A.eq(`${a} ${op} ${b} = ?`),
    choices: numOpts(ans, 4, 0, 9999, 2, extra),
    answer: ans,
    hint: { say: op === '×' ? '일의 자리부터 곱해' : '같은 자리끼리 계산해' },
    hideText: true, // 큰 식이 이미 보이므로 위 문구는 숨김
    key: `${a}${op}${b}`,
  });
}

function times(tables) {
  const a = pick(tables), b = int(1, 9);
  const [e, name] = pick(ANIMALS);
  const ans = a * b;
  return Q({
    say: `${a} 곱하기 ${b}${eun(b)}?`,
    text: `${a} × ${b} = ?`,
    visual: '',
    anim: { type: 'mul', a, b, e, name },
    choices: numOpts(ans, 4, 0, 90, 2, [ans + a, ans - a, a + b]),
    answer: ans,
    hint: { say: `${a}씩 ${b}번 뛰어 세어봐` },
    key: `${a}x${b}`,
  });
}

// 나눗셈: 간식을 동물들이 똑같이 나눠 가지는 모션
function share(total, k) {
  const [e, name] = pick(ANIMALS);
  const [item, itemName] = pick(SNACKS);
  const ans = total / k;
  return Q({
    say: `${total} 나누기 ${k}${eun(k)}?`,
    text: `${total} ÷ ${k} = ?`,
    visual: '',
    anim: { type: 'div', n: total, k, e, name, item, itemName },
    choices: numOpts(ans, 4, 1, 81, 2, [ans + 1, ans - 1, k]),
    answer: ans,
    hint: { say: '한 마리가 가진 걸 세어봐' },
    key: `${total}/${k}`,
  });
}
const divide = divisors => { const k = pick(divisors), q = int(1, 9); return share(k * q, k); };

// ── 만 4세 → 만 5세 수준 (누리과정: 10까지 세기, 순서, 많고 적음) ──
const k5 = d => unit(pick([['L1-1', 'L1-2'], ['L1-2', 'L1-4', 'L0-3'], ['L1-2', 'L1-4', 'L1-5']][d]), d);

// ── 만 5세 → 초1 준비 (1학년 1학기: 9까지의 수, 모으기·가르기, 합 9 이하 덧셈·뺄셈, 50까지의 수) ──
function to9(add) {
  if (add) { const s = int(2, 9), a = int(1, s - 1); return arith('+', a, s - a); }
  const a = int(2, 9);
  return arith('-', a, int(1, a - 1));
}
const pre1 = d => mix([
  [[3, 3, 1][d], () => unit(d === 0 ? 'L1-2' : 'L2-1', d === 0 ? 0 : d)], // 9까지 세기 / 모으기·가르기
  [[2, 4, 4][d], () => to9(int(0, 1) === 0 || d === 0)],                // 합 9 이하 (쉬움은 덧셈만)
  [[0, 1, 3][d], () => unit(pick(['L3-1', 'L3-2']), 0)],                 // 50까지의 수
]);

// ── 만 6세 → 초1 수준 (0~50, 1학년 2학기: 두 자리 ± 받아올림 없음, 10 만들기, 십몇−몇) + 똑같이 나누기 ──
const g1 = {
  twoOne() { // 두 자리 ± 한 자리, 받아올림·받아내림 없음 (0 포함)
    if (int(0, 1)) { let a, b; do { a = int(10, 48); b = int(0, 9); } while ((a % 10) + b > 9 || a + b > 50); return arith('+', a, b); }
    const a = int(11, 50), b = int(0, a % 10);
    return arith('-', a, b);
  },
  tens() { // 몇십 ± 몇십
    const a = 10 * int(1, 4);
    return int(0, 1) ? arith('+', a, 10 * int(1, 5 - a / 10)) : arith('-', a + 10, 10 * int(1, a / 10));
  },
  make10() { const a = int(2, 9); return arith('+', a, int(Math.max(2, 11 - a), 9)); }, // (몇)+(몇)=(십몇)
  teenSub() { const o = int(1, 8); return arith('-', 10 + o, int(o + 1, 9)); },          // (십몇)−(몇)
  twoTwo() { // 두 자리 ± 두 자리, 받아올림·받아내림 없음, 50까지
    if (int(0, 1)) { let a, b; do { a = int(10, 39); b = int(10, 40); } while ((a % 10) + (b % 10) > 9 || a + b > 50); return arith('+', a, b); }
    let a, b; do { a = int(21, 50); b = int(10, a - 10); } while ((a % 10) < (b % 10)); return arith('-', a, b);
  },
};
const grade1 = d => mix([
  [[3, 1, 1][d], g1.twoOne],
  [[2, 0, 0][d], g1.tens],
  [[0, 2, 1.5][d], g1.make10],
  [[0, 2, 1.5][d], g1.teenSub],
  [[0, 0, 2][d], g1.twoTwo],
  [1.5, () => { const k = pick([2, 2, 3, 4, 5].slice(0, [2, 3, 5][d])); return share(k * int(1, [5, 5, 4][d]), k); }], // 똑같이 나누기 (20 이하)
]);

// ── 만 7세 → 초2 수준 (곱셈구구, 받아올림 있는 두 자리 ±, 세 자리·네 자리 수) ──
function carry2() {
  if (int(0, 1)) { let a, b; do { a = int(12, 89); b = int(12, 89); } while ((a % 10) + (b % 10) < 10 || a + b >= 100); return arith('+', a, b, true); }
  let a, b; do { a = int(30, 98); b = int(12, a - 10); } while ((a % 10) >= (b % 10)); return arith('-', a, b, true);
}
const grade2 = d => mix([
  [5, () => times([[2, 5], [2, 3, 4, 5], [2, 3, 4, 5, 6, 7, 8, 9]][d])],
  [3, carry2],
  [[2, 1, 1][d], () => unit('L6-2', d)],
  [[0, 1, 1][d], () => unit('L6-3', d)],
]);

// ── 만 8세 → 초3 수준 (나눗셈, 세 자리 ± 세 자리, 두 자리 × 한 자리) ──
function three(d) {
  const add = int(0, 1) === 0;
  let a, b;
  for (;;) {
    a = int(200, 899); b = int(100, 499);
    if (!add && b > a) [a, b] = [b, a];
    const ones = add ? (a % 10) + (b % 10) >= 10 : (a % 10) < (b % 10);
    const tens = add ? (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) >= 10 : (Math.floor(a / 10) % 10) < (Math.floor(b / 10) % 10);
    const n = (ones ? 1 : 0) + (tens ? 1 : 0);
    if ((add ? a + b < 1000 : a > b) && n === d) break;
  }
  return plain(add ? '+' : '−', a, b);
}
function twoByOne(d) {
  let a, b;
  do { a = int(11, 49); b = int(2, 9); } while (d === 1 ? (a % 10) * b >= 10 || Math.floor(a / 10) * b >= 10 : (a % 10) * b < 10);
  return plain('×', a, b);
}
const grade3 = d => mix([
  [4, () => divide([[2, 5], [2, 3, 4, 5], [2, 3, 4, 5, 6, 7, 8, 9]][d])],
  [3, () => three(d)],
  [[0, 2, 3][d], () => twoByOne(Math.max(1, d))],
]);

// ── 도전: 초4 1학기 '큰 수' (다섯 자리 수) ──
const PLACE = ['만', '천', '백', '십', '일'];
const num = v => ({ v, html: `<b class="num">${v}</b>` });
const txt = v => ({ v, html: `<b class="txt">${v}</b>` });
const readBig = n => readKo(n).replace(/만(?=.)/, '만 '); // 35027 → 삼만 오천이십칠
function digits5(zeros, distinct = false) {
  if (distinct) return sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
  return [int(1, 9), ...Array.from({ length: 4 }, () => (zeros && rand() < 0.35 ? 0 : int(1, 9)))];
}
const val = ds => +ds.join('');
const swap = (ds, i, j) => { const c = ds.slice(); [c[i], c[j]] = [c[j], c[i]]; return val(c); };

function fiveDigit(d) {
  const kind = pick([
    ['ten', 'make', 'skip', 'where'],
    ['make', 'read', 'value', 'where', 'skip', 'compare'],
    ['read', 'value', 'compare', 'skip', 'make'],
  ][d]);
  const zeros = d >= 1;
  if (kind === 'ten') {
    const [base, step] = pick([[9000, 1000], [9900, 100], [9990, 10], [9999, 1]]);
    return Q({ say: `${base}보다 ${step} 큰 수는?`, text: `${base}보다 ${step} 큰 수`, visual: A.bignum(`${base} + ${step}`),
      choices: numOpts(10000, 4, 1, 999999, 1, [1000, 100000, base + 10]), answer: 10000, hint: { say: '1000이 10개면 10000이야' } });
  }
  if (kind === 'make') {
    const ds = digits5(zeros), n = val(ds), noZero = +ds.filter(x => x).join('');
    return Q({ say: '표를 보고 수를 써 봐', text: '어떤 수일까?', visual: A.placeChart(PLACE, ds),
      choices: numOpts(n, 4, 1, 999999, 1, [noZero !== n ? noZero : n + 10000, swap(ds, 1, 2), n + 1000]), answer: n, hint: { say: '만의 자리부터 차례로 써' } });
  }
  if (kind === 'read') {
    const ds = digits5(zeros), n = val(ds), ans = readBig(n);
    const wrong = [swap(ds, 3, 4), swap(ds, 2, 3), n + 10000].filter(x => x !== n).map(readBig);
    return Q({ say: '이 수를 어떻게 읽을까?', text: '어떻게 읽을까?', visual: A.bignum(n),
      choices: [...new Set([ans, ...wrong])].map(txt), answer: ans, layout: 'wide', hint: { say: '0인 자리는 읽지 않아' } });
  }
  if (kind === 'value') {
    const ds = digits5(false, true), i = int(0, 3), v = ds[i] * 10 ** (4 - i);
    return Q({ say: `숫자 ${ds[i]}${eun(ds[i])} 얼마를 나타낼까?`, text: `${ds[i]}${eun(ds[i])} 얼마일까?`, visual: A.bignum(val(ds)),
      choices: numOpts(v, 4, 1, 999999, 1, [0, 1, 2, 3, 4].filter(k => k !== 4 - i).map(k => ds[i] * 10 ** k)), answer: v, hint: { say: '그 숫자가 무슨 자리인지 봐' } });
  }
  if (kind === 'where') {
    const ds = digits5(false, true), i = int(0, 4), names = PLACE.map(p => `${p}의 자리`);
    return Q({ say: `숫자 ${ds[i]}${eun(ds[i])} 어느 자리일까?`, text: `${ds[i]}${eun(ds[i])} 어느 자리?`, visual: A.bignum(val(ds)),
      choices: [names[i], ...names.filter((_, k) => k !== i)].map(txt), answer: names[i], hint: { say: '오른쪽부터 일, 십, 백, 천, 만' } });
  }
  if (kind === 'skip') {
    const step = pick(d === 0 ? [1000, 10000] : d === 1 ? [1000, 10000, 100] : [10000, 100, 10]);
    const start = int(1, 5) * 10000 + int(0, 9) * 1000 + (step <= 100 ? int(0, 9) * 100 : 0) + (step === 10 ? int(0, 9) * 10 : 0);
    const list = [0, 1, 2, 3].map(k => start + k * step), pos = int(1, 3), ans = list[pos];
    list[pos] = null;
    return Q({ say: `${step}씩 뛰어 세어봐`, text: `${step}씩 뛰어 세기`, visual: A.track(list),
      choices: numOpts(ans, 4, 1, 999999, 1, [ans + step, ans - step, ans + step * 10]), answer: ans, layout: 'wide', hint: { say: `${readKo(step)}의 자리가 하나씩 커져` } });
  }
  const ds = digits5(zeros), x = val(ds), i = d === 2 ? int(2, 4) : int(0, 2), c = ds.slice();
  c[i] = (c[i] + int(1, 8)) % 10;
  if (i === 0 && c[0] === 0) c[0] = 1;
  const y = val(c) === x ? x + 1 : val(c), big = int(0, 1) === 0;
  return Q({ say: `더 ${big ? '큰' : '작은'} 수를 골라봐`, text: `더 ${big ? '큰' : '작은'} 수`, visual: '',
    choices: [num(x), num(y)], answer: big ? Math.max(x, y) : Math.min(x, y), hint: { say: '만의 자리부터 비교해' } });
}

// age: 아이 나이, lv: 실제로 나오는 수준
export const LEVELS = [
  { id: 'k5', age: '만 4세', lv: '5세 수준', title: '10까지 세기', icon: '🐥', color: '#FFE3B8', young: true, gen: k5 },
  { id: 'pre1', age: '만 5세', lv: '초1 준비', title: '9까지 더하기·빼기', icon: '🐰', color: '#FFD9E2', gen: pre1 },
  { id: 'g1', age: '만 6세', lv: '초1 수준', title: '50까지 계산·나누기', icon: '🐶', color: '#DDEFFF', gen: grade1 },
  { id: 'g2', age: '만 7세', lv: '초2 수준', title: '구구단·받아올림', icon: '🐼', color: '#EDE3FF', gen: grade2 },
  { id: 'g3', age: '만 8세', lv: '초3 수준', title: '나눗셈·세 자리 수', icon: '🐻', color: '#E2F5E4', gen: grade3 },
  { id: 'big5', age: '도전', lv: '초4 수준', title: '다섯 자리 수', icon: '🐯', color: '#FFF1C9', gen: fiveDigit },
];
export const LEVEL = Object.fromEntries(LEVELS.map(l => [l.id, l]));
