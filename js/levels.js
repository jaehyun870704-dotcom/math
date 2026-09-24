// 난이도(레벨) — 고른 레벨의 문제만 나온다. 레벨 안에서는 d=0→2로 서서히 어려워짐.
import { int, pick, eun } from './util.js';
import { UNIT, Q, numOpts } from './curriculum.js';

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
  const blocks = Math.max(a, b, ans) > 20;
  return Q({
    say: `${a} ${add ? '더하기' : '빼기'} ${b}${eun(b)}?`,
    text: `${a} ${add ? '+' : '−'} ${b} = ?`,
    visual: '',
    anim: { type: (blocks ? 'b' : '') + (add ? 'add' : 'sub'), a, b, e, name },
    choices: numOpts(ans, 4, 0, 199, 2, blocks ? (add ? [ans + 10, ans - 10, ans + 1] : [ans + 10, ans - 10, ans - 1]) : add ? [ans + 1, ans - 1] : [ans - 1, ans + 1, a + b]),
    answer: ans,
    hint: { say: blocks ? '일의 자리부터 봐' : '동물을 하나씩 눌러 세어봐' },
    key: `${a}${op}${b}`,
  });
}

function times(tables) {
  return () => {
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
  };
}

export const LEVELS = [
  {
    id: 'count5', age: '만 4세', title: '하나 둘 셋 세기', icon: '🐥', color: '#FFE3B8',
    young: true, gen: fromUnits(['L-1-4', 'L-1-5', 'L1-1']),
  },
  {
    id: 'count10', age: '만 5세', title: '열까지 세기', icon: '🐰', color: '#FFD9E2',
    young: true, gen: fromUnits(['L1-1', 'L1-2', 'L1-3', 'L1-4']),
  },
  {
    id: 'add10', age: '만 6세', title: '10까지 더하기·빼기', icon: '🐶', color: '#DDEFFF',
    gen: d => {
      const max = d === 0 ? 5 : 10;
      if (d === 0 || int(0, 1) === 0) { const a = int(1, max - 1); return arith('+', a, int(1, max - a)); }
      const a = int(2, max);
      return arith('-', a, int(1, a - 1));
    },
  },
  {
    id: 'add20', age: '초1', title: '20까지 더하기·빼기', icon: '🐻', color: '#E2F5E4',
    gen: d => {
      if (d === 0 || int(0, 1) === 0) {
        const a = d === 0 ? pick([8, 9]) : int(5, 9);
        return arith('+', a, int(11 - a, 9));
      }
      const o = int(1, 8), b = int(o + 1, 9);
      return arith('-', 10 + o, b);
    },
  },
  {
    id: 'add100', age: '초1~2', title: '두 자리 더하기·빼기', icon: '🦊', color: '#FFF1C9',
    gen: d => {
      const add = int(0, 1) === 0;
      let a, b;
      if (d === 0) { // 받아올림·내림 없이
        do { a = int(21, 89); b = int(1, 9); } while (add ? (a % 10) + b >= 10 : (a % 10) < b);
      } else if (d === 1) { // 두 자리 ± 한 자리, 받아올림·내림
        do { a = int(21, 89); b = int(2, 9); } while (add ? (a % 10) + b < 10 || a + b >= 100 : (a % 10) >= b);
      } else { // 두 자리 ± 두 자리
        do { a = int(21, 89); b = int(12, 69); } while (add ? a + b >= 100 : b >= a);
      }
      return arith(add ? '+' : '-', a, b);
    },
  },
  {
    id: 'times', age: '초2', title: '구구단', icon: '🐼', color: '#EDE3FF',
    gen: d => times(d === 0 ? [2, 5] : d === 1 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 7, 8, 9])(),
  },
];
export const LEVEL = Object.fromEntries(LEVELS.map(l => [l.id, l]));
