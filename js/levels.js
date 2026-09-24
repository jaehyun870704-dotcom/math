// 난이도(레벨) — 고른 레벨의 문제만 나온다. 레벨 안에서는 d=0→2로 서서히 어려워짐.
import { int, pick, sample, rand, eun, readKo } from './util.js';
import { UNIT, Q, numOpts } from './curriculum.js';
import * as A from './art.js';

export const ANIMALS = [
  ['🐶', '강아지'], ['🐱', '고양이'], ['🐰', '토끼'], ['🐻', '곰'], ['🐥', '병아리'],
  ['🐸', '개구리'], ['🐧', '펭귄'], ['🐼', '판다'], ['🦊', '여우'], ['🐷', '돼지'],
];

function fromUnits(ids) {
  return d => {
    const id = pick(ids);
    return { ...UNIT[id].gen(d, { passed: () => false }), unit: id };
  };
}

function arith(op, a, b) {
  const [e, name] = pick(ANIMALS);
  const add = op === '+';
  const ans = add ? a + b : a - b;
  return Q({
    say: `${a} ${add ? '더하기' : '빼기'} ${b}${eun(b)}?`,
    text: `${a} ${add ? '+' : '−'} ${b} = ?`,
    visual: '',
    anim: { type: add ? 'add' : 'sub', a, b, e, name },
    choices: numOpts(ans, 4, 0, 99, 2, a >= 10 || b >= 10 ? [ans + 10, ans - 10, add ? ans + 1 : ans - 1] : add ? [ans + 1, ans - 1] : [ans - 1, ans + 1, a + b]),
    answer: ans,
    hint: { say: '동물을 하나씩 눌러 세어봐' },
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

// ── 만 6세: 0~50, 두 자리 수 ──
// 쉬움: 20까지(0 포함) → 보통: 두 자리 ± 한 자리 → 어려움: 두 자리 ± 두 자리 (모두 50까지)
function upTo50(d) {
  const add = int(0, 1) === 0;
  let a, b;
  if (d === 0) {
    if (add) { a = int(0, 15); b = int(a === 0 ? 1 : 0, 20 - a); } else { a = int(3, 20); b = int(0, a); }
  } else if (d === 1) {
    if (add) { a = int(10, 45); b = int(0, Math.min(9, 50 - a)); } else { a = int(10, 50); b = int(0, 9); }
  } else if (add) { a = int(10, 40); b = int(10, 50 - a); } else { a = int(20, 50); b = int(10, a); }
  return arith(add ? '+' : '-', a, b);
}

// ── 만 7세: 다섯 자리 수 (교과서 '큰 수' 단원의 문제 유형) ──
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

  if (kind === 'ten') { // 10000 알기
    const [base, step] = pick([[9000, 1000], [9900, 100], [9990, 10], [9999, 1]]);
    return Q({ say: `${base}보다 ${step} 큰 수는?`, text: `${base}보다 ${step} 큰 수`, visual: A.bignum(`${base} + ${step}`),
      choices: numOpts(10000, 4, 1, 999999, 1, [1000, 100000, base + step / 10 || base + 10]), answer: 10000,
      hint: { say: '1000이 10개면 10000이야' } });
  }
  if (kind === 'make') { // 다섯 자리 수 쓰기
    const ds = digits5(zeros);
    const n = val(ds);
    const noZero = +ds.filter(x => x).join('');
    return Q({ say: '표를 보고 수를 써 봐', text: '어떤 수일까?', visual: A.placeChart(PLACE, ds),
      choices: numOpts(n, 4, 1, 999999, 1, [noZero !== n ? noZero : n + 10000, swap(ds, 1, 2), n + 1000]), answer: n,
      hint: { say: '만의 자리부터 차례로 써' } });
  }
  if (kind === 'read') { // 읽기
    const ds = digits5(zeros);
    const n = val(ds);
    const ans = readBig(n);
    const wrong = [swap(ds, 3, 4), swap(ds, 2, 3), n + 10000].filter(x => x !== n).map(readBig);
    return Q({ say: '이 수를 어떻게 읽을까?', text: '어떻게 읽을까?', visual: A.bignum(n),
      choices: [...new Set([ans, ...wrong])].map(txt), answer: ans, layout: 'wide',
      hint: { say: '0인 자리는 읽지 않아' } });
  }
  if (kind === 'value') { // 자릿값
    const ds = digits5(false, true);
    const i = int(0, 3);
    const v = ds[i] * 10 ** (4 - i);
    return Q({ say: `숫자 ${ds[i]}${eun(ds[i])} 얼마를 나타낼까?`, text: `${ds[i]}${eun(ds[i])} 얼마일까?`, visual: A.bignum(val(ds)),
      choices: numOpts(v, 4, 1, 999999, 1, [0, 1, 2, 3, 4].filter(k => k !== 4 - i).map(k => ds[i] * 10 ** k)), answer: v,
      hint: { say: '그 숫자가 무슨 자리인지 봐' } });
  }
  if (kind === 'where') { // 어느 자리 숫자
    const ds = digits5(false, true);
    const i = int(0, 4);
    const names = PLACE.map(p => `${p}의 자리`);
    return Q({ say: `숫자 ${ds[i]}${eun(ds[i])} 어느 자리일까?`, text: `${ds[i]}${eun(ds[i])} 어느 자리?`, visual: A.bignum(val(ds)),
      choices: [names[i], ...names.filter((_, k) => k !== i)].map(txt), answer: names[i],
      hint: { say: '오른쪽부터 일, 십, 백, 천, 만' } });
  }
  if (kind === 'skip') { // 뛰어 세기
    const step = pick(d === 0 ? [1000, 10000] : d === 1 ? [1000, 10000, 100] : [10000, 100, 10]);
    const start = int(1, 5) * 10000 + int(0, 9) * 1000 + (step <= 100 ? int(0, 9) * 100 : 0) + (step === 10 ? int(0, 9) * 10 : 0);
    const list = [0, 1, 2, 3].map(k => start + k * step);
    const pos = int(1, 3);
    const ans = list[pos];
    list[pos] = null;
    return Q({ say: `${step}씩 뛰어 세어봐`, text: `${step}씩 뛰어 세기`, visual: A.track(list),
      choices: numOpts(ans, 4, 1, 999999, 1, [ans + step, ans - step, ans + step * 10]), answer: ans, layout: 'wide',
      hint: { say: `${readKo(step)}의 자리가 하나씩 커져` } });
  }
  // 크기 비교
  const ds = digits5(zeros);
  const x = val(ds);
  const i = d === 2 ? int(2, 4) : int(0, 2);
  const c = ds.slice();
  c[i] = (c[i] + int(1, 8)) % 10;
  if (i === 0 && c[0] === 0) c[0] = 1;
  const y = val(c) === x ? x + 1 : val(c);
  const big = int(0, 1) === 0;
  return Q({ say: `더 ${big ? '큰' : '작은'} 수를 골라봐`, text: `더 ${big ? '큰' : '작은'} 수`, visual: '',
    choices: [num(x), num(y)], answer: big ? Math.max(x, y) : Math.min(x, y),
    hint: { say: '만의 자리부터 비교해' } });
}

export const LEVELS = [
  { id: 'count5', age: '만 4세', title: '하나 둘 셋 세기', icon: '🐥', color: '#FFE3B8', young: true, gen: fromUnits(['L-1-4', 'L-1-5', 'L1-1']) },
  { id: 'count10', age: '만 5세', title: '열까지 세기', icon: '🐰', color: '#FFD9E2', young: true, gen: fromUnits(['L1-1', 'L1-2', 'L1-3', 'L1-4']) },
  { id: 'add10', age: '만 6세', title: '50까지 더하기·빼기', icon: '🐶', color: '#DDEFFF', gen: upTo50 },
  { id: 'big5', age: '만 7세', title: '다섯 자리 수', icon: '🐯', color: '#FFF1C9', gen: fiveDigit },
  { id: 'times', age: '초2', title: '구구단', icon: '🐼', color: '#EDE3FF', gen: d => times(d === 0 ? [2, 5] : d === 1 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 7, 8, 9]) },
];
export const LEVEL = Object.fromEntries(LEVELS.map(l => [l.id, l]));
