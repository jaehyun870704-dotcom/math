import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, LEVEL } from '../js/levels.js';
import { newState, nextQuestion, answer, complete, lvSt } from '../js/game.js';
import { EMOJI_STICKERS } from '../js/stickers.js';

const N = 400;
const each = (id, fn) => { for (let d = 0; d <= 2; d++) for (let i = 0; i < N; i++) fn(LEVEL[id].gen(d), d); };
const nums = q => (q.text + ' ' + q.say).match(/\d+/g)?.map(Number) || [];
const carry = (a, b) => (a % 10) + (b % 10) >= 10;
const borrow = (a, b) => (a % 10) < (b % 10);

test('모든 카드·단계에서 문제가 올바르게 만들어짐', () => {
  for (const L of LEVELS) each(L.id, (q, d) => {
    const vals = q.choices.map(c => c.v);
    assert.ok(vals.includes(q.answer), `${L.id} d${d} ${q.say}`);
    assert.equal(new Set(vals).size, vals.length, `${L.id} 중복`);
    if (typeof q.answer === 'number') assert.ok(q.answer >= 0 && Number.isInteger(q.answer), `${L.id} ${q.answer}`);
    if (q.anim?.type === 'div') assert.equal(q.anim.n % q.anim.k, 0);
  });
});

test('만 4세 카드 = 5세 수준: 10까지 세기·순서·비교만, 계산 없음', () => {
  each('k5', q => {
    assert.ok(['L1-1', 'L1-2', 'L1-4', 'L0-3', 'L1-5'].includes(q.unit), q.unit);
    assert.ok(!q.anim);
    if (typeof q.answer === 'number') assert.ok(q.answer <= 10);
  });
});

test('만 5세 카드 = 초1 준비: 덧셈·뺄셈은 9 이하, 수는 50까지', () => {
  each('pre1', q => {
    if (q.anim) {
      assert.ok(['add', 'sub'].includes(q.anim.type));
      assert.ok(q.anim.a <= 9 && q.anim.b <= 9 && q.answer <= 9, q.text);
    } else assert.ok(['L1-2', 'L2-1', 'L3-1', 'L3-2'].includes(q.unit), q.unit);
    for (const n of nums(q)) assert.ok(n <= 51, q.say);
  });
});

test('만 6세 카드 = 초1 수준: 0~50, 받아올림은 (몇)+(몇)·(십몇)−(몇)만, 똑같이 나누기 20 이하', () => {
  let div = 0;
  each('g1', q => {
    const { type, a, b, n, k } = q.anim;
    if (type === 'div') { div++; assert.ok(n <= 20 && k >= 2 && k <= 5, q.text); return; }
    assert.ok(Math.max(a, b, q.answer) <= 50, q.text);
    if (type === 'add' && carry(a, b)) assert.ok(a < 10 && b < 10, `초1 범위 밖 받아올림: ${q.text}`);
    if (type === 'sub' && borrow(a, b)) assert.ok(a < 20 && b < 10, `초1 범위 밖 받아내림: ${q.text}`);
  });
  assert.ok(div > N * 3 * 0.1, `나누기 비율 ${div}`);
});

test('만 7세 카드 = 초2 수준: 구구단(2~9단), 받아올림 있는 두 자리 ±, 세·네 자리 수', () => {
  let mul = 0;
  each('g2', (q, d) => {
    if (q.anim?.type === 'mul') {
      mul++;
      assert.ok(q.anim.a >= 2 && q.anim.a <= 9 && q.anim.b <= 9);
      if (d === 0) assert.ok([2, 5].includes(q.anim.a));
    } else if (q.anim) {
      assert.ok(['badd', 'bsub'].includes(q.anim.type));
      assert.ok(q.anim.a < 100 && q.anim.b < 100);
      assert.ok(q.anim.type === 'badd' ? carry(q.anim.a, q.anim.b) : borrow(q.anim.a, q.anim.b), q.text);
    } else assert.ok(['L6-2', 'L6-3'].includes(q.unit), q.unit);
  });
  assert.ok(mul > N * 3 * 0.35, `구구단 비율 ${mul}`);
});

test('만 8세 카드 = 초3 수준: 구구단 범위 나눗셈, 세 자리 ±, 두 자리 × 한 자리', () => {
  each('g3', q => {
    if (q.anim) {
      assert.equal(q.anim.type, 'div');
      assert.ok(q.anim.k >= 2 && q.anim.k <= 9 && q.answer >= 1 && q.answer <= 9, q.text);
      return;
    }
    const [a, b] = nums(q);
    if (q.text.includes('×')) assert.ok(a >= 10 && a < 100 && b >= 2 && b <= 9, q.text);
    else assert.ok(a >= 100 && a < 1000 && b >= 100 && b < 1000 && q.answer < 1000, q.text);
  });
});

test('도전 카드 = 초4 큰 수: 다섯 자리 수만', () => {
  each('big5', (q, d) => {
    const shown = (q.visual + q.choices.map(c => c.html).join('')).replace(/<[^>]+>/g, ' ');
    assert.ok(/\d{5}/.test(shown) || q.answer === 10000, `d${d} ${q.say}`);
  });
});

function solve(s, n, wrongFirst = false) {
  const outs = [];
  for (let i = 0; i < n; i++) {
    nextQuestion(s);
    const q = s.cur.q;
    if (wrongFirst) answer(s, q.choices.find(c => c.v !== q.answer).v);
    assert.ok(answer(s, q.answer).ok);
    outs.push(complete(s));
  }
  return outs;
}

test('7문제마다 스티커 1장, 새 디자인이 먼저', () => {
  const s = newState();
  s.levelId = 'g1';
  const outs = solve(s, 70);
  outs.forEach((o, i) => assert.equal(!!o.sticker, (i + 1) % 7 === 0, `문제 ${i + 1}`));
  assert.equal(s.album.length, 10);
  assert.equal(new Set(s.album.map(x => x.ref)).size, 10);
  const t = newState();
  t.levelId = 'g3';
  assert.equal(solve(t, 7, true).filter(o => o.sticker).length, 1);
});

test('40종을 다 모으면 그다음부터 겹칠 수 있음', () => {
  const s = newState();
  s.levelId = 'k5';
  solve(s, 7 * 41);
  assert.equal(new Set(s.album.map(x => x.ref)).size, EMOJI_STICKERS.length);
  assert.equal(s.album[40].isNew, false);
});

test('카드 안 난이도: 5연속 정답 → 올라감, 2연속 오답 → 내려감', () => {
  const s = newState();
  s.levelId = 'g2';
  solve(s, 5);
  assert.equal(lvSt(s, 'g2').diff, 1);
  solve(s, 2, true);
  assert.equal(lvSt(s, 'g2').diff, 0);
});
