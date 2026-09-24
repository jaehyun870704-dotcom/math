// 난이도 카드 — 나이보다 한 해 앞선 수준 (2022 개정 교육과정 / 누리과정 기준)
// 고른 카드의 문제만 나오고, 카드 안에서는 d=0→2 (학기 순서)로 서서히 어려워진다.
import { int, pick, sample, rand, eun, wa, readKo } from './util.js';
import { UNIT, Q, numOpts } from './curriculum.js';
import * as A from './art.js';

export const ANIMALS = [
  ['🐶', '강아지'], ['🐱', '고양이'], ['🐰', '토끼'], ['🐻', '곰'], ['🐥', '병아리'],
  ['🐸', '개구리'], ['🐧', '펭귄'], ['🐼', '판다'], ['🦊', '여우'], ['🐷', '돼지'],
];
const SNACKS = [['🍪', '쿠키'], ['🍓', '딸기'], ['🍬', '사탕'], ['🍎', '사과'], ['🥕', '당근']];

const unit = (id, d) => ({ ...UNIT[id].gen(d, { passed: () => false }), unit: id });

// [가중치, 문제 만들기, 유형 이름] 중에서 하나
function mix(list) {
  const live = list.filter(([w]) => w > 0);
  const total = live.reduce((s, [w]) => s + w, 0);
  let r = rand() * total;
  let hit = live[live.length - 1];
  for (const x of live) if ((r -= x[0]) < 0) { hit = x; break; }
  const q = hit[1]();
  if (hit[2]) q.topic = hit[2];
  return q;
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

function times(tables, bMax = 9) {
  const a = pick(tables), b = int(1, bMax);
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

// ── 만 6세 → 초1 수준 (0~50, 1학년 2학기: 두 자리 ± 받아올림 없음, 10 만들기, 십몇−몇)
//    + 요청에 따라 곱셈(몇씩 몇 묶음)·나눗셈(똑같이 나누기). 교육과정상 곱셈은 2학년, 나눗셈은 3학년 ──
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
  [[3, 2, 1.5][d], g1.twoOne],
  [[2, 1, 0.5][d], g1.tens],
  [[0, 1.5, 1.5][d], g1.make10],
  [[0, 1.5, 1.5][d], g1.teenSub],
  [[0, 0, 1][d], g1.twoTwo],
  // 곱셈: 몇씩 몇 묶음 (쉬움 2·5씩 → 2~5씩, 5묶음까지, 곱 25 이하)
  [1.5, () => times(d === 0 ? [2, 5] : [2, 3, 4, 5], 5)],
  // 나눗셈: 똑같이 나누기 (쉬움 ÷2 → ÷2~3 → ÷2~4, 20 이하)
  [1.5, () => { const k = pick([[2], [2, 2, 3], [2, 3, 4]][d]); return share(k * int(1, d === 0 ? 4 : 5), k); }],
]);

// ── 만 7세 → 초2 수준 (곱셈구구, 받아올림 있는 두 자리 ±, 세 자리·네 자리 수) ──
function carry2() {
  if (int(0, 1)) { let a, b; do { a = int(12, 89); b = int(12, 89); } while ((a % 10) + (b % 10) < 10 || a + b >= 100); return arith('+', a, b, true); }
  let a, b; do { a = int(30, 98); b = int(12, a - 10); } while ((a % 10) >= (b % 10)); return arith('-', a, b, true);
}
// ── 교과서·익힘책 유형 공통 도구 ──
const jw = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); };
const iga = n => (eun(n) === '은' ? '이' : '가');
const withU = u => v => ({ v, html: `<b class="num">${v}<small>${u}</small></b>` });
const strs = (ans, wrong) => [...new Set([ans, ...wrong])].map(v => ({ v, html: `<b class="txt">${v}</b>` }));
const boxed = s => s.replace('□', '<span class="box">□</span>');
// 식을 읽는 말: "□ + 18 = 67" → "네모 더하기 18은 67, 네모는?"
function readExpr(s) {
  const words = t => t.trim().replace(/×/g, '곱하기').replace(/÷/g, '나누기').replace(/\+/g, '더하기').replace(/−/g, '빼기').replace(/□/g, '네모');
  const [left, right] = s.split('=');
  const lw = words(left), last = left.trim().split(' ').pop();
  const josa = /^\d+$/.test(last) ? eun(+last) : '는';
  const r = right.trim();
  if (r === '?' || r === '□') return `${lw}${josa}?`;
  return `${lw}${josa} ${r}, 네모는?`;
}
const NAMES = ['지우', '서아', '도하', '수아', '민재', '하루'];
const THINGS2 = [['사탕', '개'], ['구슬', '개'], ['색종이', '장'], ['연필', '자루'], ['딱지', '장'], ['귤', '개']];

// 문장제: 문장을 크게 보여 주고 읽어 줌
function story(sentence, answer, choices, hint = '무엇을 구하는지 다시 읽어봐') {
  return Q({ say: sentence, text: '문장제', visual: `<div class="story">${sentence}</div>`, choices, answer, hideText: true, layout: 'wide', hint: { say: hint }, key: sentence });
}
// □ 구하기·세 수 계산 같은 식 문제
function exprQ(expr, answer, choices, hint) {
  return Q({ say: readExpr(expr), text: expr, visual: A.eq(boxed(expr)), choices, answer, hideText: true, hint: { say: hint }, key: expr });
}
const nums = (ans, extra, hi = 99999) => numOpts(ans, 4, 0, hi, 2, extra);

// ── 초2 ──
function timesBox() { // 곱셈구구 □ 구하기
  const a = int(2, 9), b = int(2, 9), right = int(0, 1);
  const expr = right ? `${a} × □ = ${a * b}` : `□ × ${b} = ${a * b}`;
  const ans = right ? b : a;
  return exprQ(expr, ans, nums(ans, [ans + 1, ans - 1, a * b - (right ? a : b)], 9), '구구단을 거꾸로 생각해');
}
function zeroOne() { // 0의 곱, 1의 곱
  const z = pick([0, 1]), n = int(2, 9);
  const [a, b] = int(0, 1) ? [z, n] : [n, z];
  return exprQ(`${a} × ${b} = ?`, a * b, nums(a * b, [a + b, n, z === 0 ? 1 : 0], 20), z === 0 ? '0을 곱하면 항상 0' : '1을 곱하면 그대로야');
}
function threeNum() { // 세 수의 계산 (앞에서부터)
  const a = int(30, 50), b = int(11, 19), c = int(3, 15); // 앞에서부터 빼도 음수가 안 나오게
  const plus = int(0, 1) === 0;
  const ans = plus ? a + b - c : a - b + c;
  return exprQ(`${a} ${plus ? '+' : '−'} ${b} ${plus ? '−' : '+'} ${c} = ?`, ans, nums(ans, [plus ? a + b + c : a - b - c, ans + 10, ans - 10]), '앞에서부터 차례로 계산해');
}
function boxAS() { // 덧셈·뺄셈 □ 구하기 (덧셈과 뺄셈의 관계)
  const x = int(12, 40), a = int(11, 29), t = int(0, 3);
  const [expr, ans] = [[`□ + ${a} = ${x + a}`, x], [`${a} + □ = ${x + a}`, x], [`${x + a} − □ = ${a}`, x], [`□ − ${a} = ${x}`, x + a]][t];
  return exprQ(expr, ans, nums(ans, [ans + 10, ans - 10, x + a + a]), t === 3 ? '빼기를 더하기로 바꿔 봐' : '더하기를 빼기로 바꿔 봐');
}
function word2(d) {
  const [n1, n2] = sample(NAMES, 2);
  const [th, u] = pick(THINGS2);
  const U = withU(u), ul = jw(u, '을', '를');
  const t = pick([['join', 'sep', 'groups'], ['join', 'sep', 'cmp', 'groups', 'times'], ['cmp', 'times', 'some', 'bus', 'sep']][d]);
  if (t === 'join') {
    let a, b; do { a = int(15, 48); b = int(12, 29); } while ((a % 10) + (b % 10) < 10 || a + b >= 100);
    return story(`${n1}는 ${jw(th, '을', '를')} ${a}${u} 가지고 있어요. ${b}${ul} 더 받았어요. 모두 몇 ${u}일까요?`, a + b, nums(a + b, [a + b - 10, a - b, a + b + 10]).map(c => U(c.v)));
  }
  if (t === 'sep') {
    let a, b; do { a = int(31, 70); b = int(12, a - 10); } while ((a % 10) >= (b % 10));
    return story(`${jw(th, '이', '가')} ${a}${u} 있었는데 친구에게 ${b}${ul} 주었어요. 남은 ${jw(th, '은', '는')} 몇 ${u}일까요?`, a - b, nums(a - b, [a + b, a - b + 10, a - b - 10]).map(c => U(c.v)));
  }
  if (t === 'cmp') {
    const a = int(30, 70), b = int(12, a - 11);
    return story(`${n1}는 ${jw(th, '을', '를')} ${a}${u}, ${n2}는 ${b}${u} 가지고 있어요. ${n1}는 ${n2}보다 몇 ${u} 더 많이 가지고 있을까요?`, a - b, nums(a - b, [a + b, a - b + 10, a - b - 1]).map(c => U(c.v)));
  }
  if (t === 'groups') {
    const a = int(2, 6), b = int(2, 6);
    return story(`한 상자에 ${jw(th, '이', '가')} ${a}${u}씩 들어 있어요. ${b}상자에 들어 있는 ${jw(th, '은', '는')} 모두 몇 ${u}일까요?`, a * b, nums(a * b, [a + b, a * b + a, a * b - b]).map(c => U(c.v)), `${a}씩 ${b}묶음이야`);
  }
  if (t === 'times') {
    const a = int(2, 6), b = int(2, 5);
    return story(`${n1}는 ${jw(th, '을', '를')} ${a}${u} 가지고 있어요. ${n2}는 ${n1}의 ${b}배만큼 가지고 있어요. ${n2}는 몇 ${u} 가지고 있을까요?`, a * b, nums(a * b, [a + b, a * b + a, a * b - a]).map(c => U(c.v)), `${a}의 ${b}배는 ${a}씩 ${b}번`);
  }
  if (t === 'some') {
    const x = int(10, 40), a = int(11, 29);
    return story(`어떤 수에 ${a}${eul_(a)} 더했더니 ${x + a}${iga(x + a)} 되었어요. 어떤 수는 얼마일까요?`, x, nums(x, [x + a + a, x + 10, x - 10]), '거꾸로 빼 봐');
  }
  const a = int(20, 35), b = int(5, 12), c = int(4, 12);
  return story(`버스에 ${a}명이 타고 있었어요. 이번 정류장에서 ${b}명이 내리고 ${c}명이 탔어요. 지금 버스에 탄 사람은 몇 명일까요?`, a - b + c, nums(a - b + c, [a + b + c, a - b - c, a - b + c + 10]).map(c2 => withU('명')(c2.v)), '내린 건 빼고 탄 건 더해');
}
const eul_ = n => (eun(n) === '은' ? '을' : '를');

// ── 만 7세 → 초2 수준 (2학년 1·2학기 교과서·익힘책 유형) ──
const grade2 = d => mix([
  [[3, 2.5, 2][d], () => times([[2, 5], [2, 3, 4, 5], [2, 3, 4, 5, 6, 7, 8, 9]][d]), '곱셈구구'],
  [[0, 0.7, 1.2][d], timesBox, '곱셈구구 □'],
  [[0, 0.5, 0.5][d], zeroOne, '0과 1의 곱'],
  [[2, 1.2, 1][d], carry2, '받아올림·받아내림'],
  [[0, 0.7, 1][d], threeNum, '세 수의 계산'],
  [[0.5, 1, 1.2][d], boxAS, '□ 구하기'],
  [[1.2, 1.5, 2][d], () => word2(d), '문장제'],
  [[1, 0.5, 0.3][d], () => unit('L6-2', Math.max(0, d - 1)), '세 자리 수'],
  [[0, 0.5, 0.5][d], () => unit('L6-3', Math.max(0, d - 1)), '네 자리 수'],
  [[0, 0.8, 1][d], () => unit('B14', Math.max(0, d - 1)), '시각 읽기'],
  [[0, 0, 0.8][d], () => unit(pick(['B10', 'B12', 'B15']), 1), '길이·시간'],
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
function divBox() { // 곱셈과 나눗셈의 관계
  const k = int(2, 7), q = int(2, 7), t = int(0, 2);
  const [expr, ans] = [[`□ ÷ ${k} = ${q}`, k * q], [`${k * q} ÷ □ = ${q}`, k], [`${k} × ${q} = □`, k * q]][t];
  return exprQ(expr, ans, nums(ans, [ans + k, ans - 1, q + k], 99), t === 0 ? '곱셈으로 바꿔 봐' : '구구단을 떠올려 봐');
}
function threeByOne() { // 세 자리 × 한 자리
  let a, b; do { a = int(112, 299); b = int(2, 5); } while (a * b >= 1500);
  return plain('×', a, b);
}
function twoByTwo() { // 두 자리 × 두 자리
  return plain('×', int(12, 29), int(11, 19));
}
function twoDivOne() { // 두 자리 ÷ 한 자리 (나머지 없음)
  const k = int(2, 4), q = int(11, Math.min(24, Math.floor(99 / k))), n = k * q;
  return exprQ(`${n} ÷ ${k} = ?`, q, nums(q, [q + 10, q - 1, q + 1], 99), '십의 자리부터 나눠 봐');
}
const remLabel = (q, r) => `몫 ${q} · 나머지 ${r}`;
function remDiv() { // 나머지가 있는 나눗셈
  const k = int(3, 6), q = int(2, 6), r = int(1, k - 1), n = k * q + r;
  const ans = remLabel(q, r);
  return Q({ say: `${n} 나누기 ${k}의 몫과 나머지는?`, text: `${n} ÷ ${k}`, visual: A.eq(`${n} ÷ ${k} = ? … ?`), hideText: true, layout: 'wide',
    choices: strs(ans, [remLabel(q + 1, r), remLabel(q, r === k - 1 ? r - 1 : r + 1), remLabel(q - 1, r + k)]), answer: ans,
    hint: { say: '나머지는 나누는 수보다 작아야 해' }, key: `${n}r${k}` });
}
const fracHTML = (a, b) => `<span class="frac"><i>${a}</i><i>${b}</i></span>`;
function fraction(d) {
  if (d === 0) { // 색칠한 부분은 전체의 몇 분의 몇
    const n = pick([2, 3, 4, 5, 6, 8]), k = int(1, n - 1);
    const opt = (a, b) => ({ v: `${a}/${b}`, html: `<b class="num">${fracHTML(a, b)}</b>` });
    const cands = [[k, n], [n - k, n], [k, n + 1], [k + 1, n], [k, n - 1]].filter(([a, b]) => a >= 1 && a < b); // 진분수만
    const seen = new Set(), choices = [];
    for (const [a, b] of cands) if (!seen.has(`${a}/${b}`)) { seen.add(`${a}/${b}`); choices.push(opt(a, b)); }
    return Q({ say: '색칠한 부분은 전체의 몇 분의 몇일까?', text: '몇 분의 몇?', visual: A.fracBar(n, k), choices, answer: `${k}/${n}`, hint: { say: '전체를 똑같이 몇 칸으로 나눴는지 봐' }, key: `f${k}/${n}` });
  }
  const m = pick([2, 3, 4, 5]), each = int(2, 4), whole = m * each;
  const kk = d === 1 || m === 2 ? 1 : int(2, m - 1), ans = each * kk;
  return Q({ say: `${whole}의 ${m}분의 ${kk}${eun(kk)} 얼마일까?`, text: '분수만큼', visual: `<div class="eq big">${whole}의 ${fracHTML(kk, m)}</div>`, hideText: true,
    choices: nums(ans, [whole - ans, each, ans + each], 99), answer: ans,
    concrete: `<div class="eq big">${whole}의 ${fracHTML(kk, m)}</div>` + A.groups(m, each, '🍓'), hint: { say: `${whole}${eul_(whole)} ${m}묶음으로 나눠 봐` }, key: `f${whole}:${kk}/${m}` });
}
function decimal() {
  const t = int(0, 2), k = int(1, 9), a = int(1, 9);
  if (t === 0) return Q({ say: `0.1이 ${k}개인 수는?`, text: '소수', visual: A.eq(`0.1이 ${k}개`), hideText: true, choices: strs(`0.${k}`, [`${k}`, `0.0${k}`, `${k}.1`]), answer: `0.${k}`, hint: { say: '0.1이 10개면 1이야' } });
  if (t === 1) return Q({ say: `${a}${wa(a)} 0.${k}만큼인 수는?`, text: '소수', visual: A.eq(`${a}${wa(a)} 0.${k}`), hideText: true, choices: strs(`${a}.${k}`, [`${k}.${a}`, `${a + k}`, `0.${a}${k}`, `${a + 1}.${k}`]), answer: `${a}.${k}`, hint: { say: '자연수 뒤에 점을 찍고 써' } });
  return Q({ say: `${a}.${k}는 0.1이 몇 개일까?`, text: '소수', visual: A.eq(`${a}.${k} = 0.1이 □개`), hideText: true, choices: nums(a * 10 + k, [a + k, a * 100 + k, k], 999), answer: a * 10 + k, hint: { say: '1은 0.1이 10개야' } });
}
function units3(d) {
  const t = pick([['mm', 'sec'], ['mm', 'km', 'sec', 'tadd'], ['km', 'tadd', 'L', 'kg', 'tsub']][d]);
  const conv = (say, expr, ans, u, wrong, hint) => Q({ say, text: '단위 바꾸기', visual: A.eq(boxed(expr)), hideText: true, choices: nums(ans, wrong).map(c => withU(u)(c.v)), answer: ans, hint: { say: hint } });
  if (t === 'mm') { const c = int(2, 15), m = int(1, 9); return conv(`${c}센티미터 ${m}밀리미터는 몇 밀리미터?`, `${c} cm ${m} mm = □ mm`, c * 10 + m, 'mm', [c + m, c * 100 + m], '1 cm는 10 mm야'); }
  if (t === 'km') { const k = int(1, 9), m = pick([50, 100, 250, 400, 500, 750, 80]); return conv(`${k}킬로미터 ${m}미터는 몇 미터?`, `${k} km ${m} m = □ m`, k * 1000 + m, 'm', [k * 100 + m, k * 1000 + m * 10, k + m], '1 km는 1000 m야'); }
  if (t === 'sec') { const mi = int(1, 4), s = int(5, 55); return conv(`${mi}분 ${s}초는 몇 초?`, `${mi}분 ${s}초 = □초`, mi * 60 + s, '초', [mi * 100 + s, mi + s, mi * 60 + s + 10], '1분은 60초야'); }
  if (t === 'L') { const l = int(1, 5), ml = pick([200, 350, 500, 800, 50]); return conv(`${l}리터 ${ml}밀리리터는 몇 밀리리터?`, `${l} L ${ml} mL = □ mL`, l * 1000 + ml, 'mL', [l * 100 + ml, l * 1000 + ml * 10, l + ml], '1 L는 1000 mL야'); }
  if (t === 'kg') { const k = int(1, 5), g = pick([300, 450, 700, 60, 900]); return conv(`${k}킬로그램 ${g}그램은 몇 그램?`, `${k} kg ${g} g = □ g`, k * 1000 + g, 'g', [k * 100 + g, k * 1000 + g * 10, k + g], '1 kg은 1000 g이야'); }
  const h1 = int(1, 3), m1 = int(20, 50), h2 = int(1, 2), m2 = int(15, 45);
  const f = mins => `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
  if (t === 'tadd') {
    const tot = (h1 + h2) * 60 + m1 + m2;
    return Q({ say: `${h1}시간 ${m1}분 더하기 ${h2}시간 ${m2}분은?`, text: '시간의 덧셈', visual: A.eq(`${h1}시간 ${m1}분 + ${h2}시간 ${m2}분`, false), hideText: true, layout: 'wide',
      choices: strs(f(tot), [`${h1 + h2}시간 ${m1 + m2}분`, f(tot + 60), f(tot - 10)]), answer: f(tot), hint: { say: '60분은 1시간으로 바꿔' } });
  }
  const big = (h1 + 2) * 60 + m1, small = h2 * 60 + m2, diff = big - small;
  return Q({ say: `${h1 + 2}시간 ${m1}분 빼기 ${h2}시간 ${m2}분은?`, text: '시간의 뺄셈', visual: A.eq(`${h1 + 2}시간 ${m1}분 − ${h2}시간 ${m2}분`, false), hideText: true, layout: 'wide',
    choices: strs(f(diff), [f(diff + 60), f(diff + 10), f(Math.max(0, diff - 60))]), answer: f(diff), hint: { say: '분끼리 먼저 빼 봐' } });
}
function word3(d) {
  const [th, u] = pick(THINGS2);
  const U = withU(u), ul = jw(u, '을', '를');
  const t = pick([['mul', 'div', 'add'], ['mul', 'div', 'rem', 'add'], ['mul', 'rem', 'div2', 'time', 'sub']][d]);
  if (t === 'mul') { const a = int(12, 25), b = int(2, 5); return story(`한 봉지에 ${jw(th, '이', '가')} ${a}${u}씩 들어 있어요. ${b}봉지에 들어 있는 ${jw(th, '은', '는')} 모두 몇 ${u}일까요?`, a * b, nums(a * b, [a + b, a * b + 10, a * b - a]).map(c => U(c.v)), `${a}씩 ${b}묶음이야`); }
  if (t === 'div') { const k = int(2, 6), q = int(2, 6); return story(`${th} ${k * q}${ul} ${k}명에게 똑같이 나누어 주려고 해요. 한 명에게 몇 ${u}씩 줄 수 있을까요?`, q, nums(q, [q + 1, k, q - 1], 99).map(c => U(c.v)), `${k}단 구구단을 떠올려 봐`); }
  if (t === 'div2') { const k = int(2, 3), q = int(11, 19); return story(`${th} ${k * q}${ul} ${k}명에게 똑같이 나누어 주려고 해요. 한 명에게 몇 ${u}씩 줄 수 있을까요?`, q, nums(q, [q + 10, q - 1, k * q - k], 99).map(c => U(c.v)), '십의 자리부터 나눠 봐'); }
  if (t === 'rem') {
    const k = int(3, 6), q = int(2, 6), r = int(1, k - 1), n = k * q + r;
    const lab = (a, b) => `${a}봉지, ${b}${u} 남음`;
    return story(`${th} ${n}${ul} 한 봉지에 ${k}${u}씩 담으면 몇 봉지가 되고 몇 ${u}${jw(u, '이', '가').slice(u.length)} 남을까요?`, lab(q, r), strs(lab(q, r), [lab(q + 1, r), lab(q - 1, r + k), lab(q, r + 1 < k ? r + 1 : r - 1)]), '나머지는 봉지에 못 담아');
  }
  if (t === 'add') {
    let a, b; do { a = int(145, 489); b = int(112, 299); } while ((a % 10) + (b % 10) < 10 || a + b >= 1000);
    return story(`도서관에 동화책이 ${a}권, 과학책이 ${b}권 있어요. 두 가지 책은 모두 몇 권일까요?`, a + b, nums(a + b, [a + b - 10, a + b + 100, a + b - 100]).map(c => withU('권')(c.v)), '일의 자리부터 더해');
  }
  if (t === 'sub') {
    let a, b; do { a = int(312, 700); b = int(108, 299); } while ((a % 10) >= (b % 10));
    return story(`줄넘기를 지우는 ${a}번, 도하는 ${b}번 했어요. 지우는 도하보다 몇 번 더 했을까요?`, a - b, nums(a - b, [a - b + 10, a + b, a - b - 100]).map(c => withU('번')(c.v)), '큰 수에서 작은 수를 빼');
  }
  const h = int(1, 9), m = 5 * int(1, 8), dh = 1, dm = 5 * int(2, 9);
  const end = h * 60 + m + dh * 60 + dm, lab = x => `${Math.floor(x / 60)}시 ${x % 60}분`;
  return story(`${h}시 ${m}분에 집에서 출발해서 ${dh}시간 ${dm}분 뒤에 할머니 댁에 도착했어요. 도착한 시각은 몇 시 몇 분일까요?`, lab(end), strs(lab(end), [`${h + dh}시 ${m + dm}분`, lab(end + 60), lab(end - 10)]), '60분은 1시간으로 바꿔');
}

// ── 만 8세 → 초3 수준 (3학년 1·2학기 교과서·익힘책 유형) ──
const grade3 = d => mix([
  [[2.5, 1.5, 1][d], () => divide([[2, 3, 4, 5], [2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 7, 8, 9]][d]), '나눗셈'],
  [[1, 1, 1][d], divBox, '곱셈과 나눗셈의 관계'],
  [[1.5, 1, 0.7][d], () => three(d === 0 ? 1 : pick([1, 2])), '세 자리 덧셈·뺄셈'],
  [[1.5, 1.2, 0.8][d], () => twoByOne(d === 0 ? 1 : 2), '두 자리 × 한 자리'],
  [[0, 0.8, 1][d], threeByOne, '세 자리 × 한 자리'],
  [[0, 0, 1][d], twoByTwo, '두 자리 × 두 자리'],
  [[0, 1, 1.2][d], remDiv, '나머지 있는 나눗셈'],
  [[0, 0, 0.8][d], twoDivOne, '두 자리 ÷ 한 자리'],
  [[1, 1, 1][d], () => fraction(d), '분수'],
  [[0, 0.6, 0.5][d], decimal, '소수'],
  [[1, 1, 1.2][d], () => units3(d), '단위'],
  [[1.2, 1.5, 2][d], () => word3(d), '문장제'],
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
  { id: 'g1', age: '만 6세', lv: '초1 수준', title: '50까지 + − × ÷', icon: '🐶', color: '#DDEFFF', gen: grade1 },
  { id: 'g2', age: '만 7세', lv: '초2 수준', title: '구구단·받아올림', icon: '🐼', color: '#EDE3FF', gen: grade2 },
  { id: 'g3', age: '만 8세', lv: '초3 수준', title: '나눗셈·세 자리 수', icon: '🐻', color: '#E2F5E4', gen: grade3 },
  { id: 'big5', age: '도전', lv: '초4 수준', title: '다섯 자리 수', icon: '🐯', color: '#FFF1C9', gen: fiveDigit },
];
export const LEVEL = Object.fromEntries(LEVELS.map(l => [l.id, l]));
