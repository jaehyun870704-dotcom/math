import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, LEVEL } from '../js/levels.js';
import { newState, nextQuestion, answer, complete, lvSt } from '../js/game.js';
import { EMOJI_STICKERS } from '../js/stickers.js';

test('모든 난이도·단계에서 문제가 올바르게 만들어짐', () => {
  for (const L of LEVELS) for (let d = 0; d <= 2; d++) for (let i = 0; i < 200; i++) {
    const q = L.gen(d);
    const vals = q.choices.map(c => c.v);
    assert.ok(vals.includes(q.answer), `${L.id} d${d}`);
    assert.equal(new Set(vals).size, vals.length, `${L.id} 중복`);
    if (typeof q.answer === 'number') assert.ok(q.answer >= 0 && Number.isInteger(q.answer), `${L.id} ${q.answer}`);
    else assert.ok(q.answer.length > 0, `${L.id} ${q.answer}`);
  }
});

test('만 4세는 세기만, 초2는 구구단만 나옴', () => {
  for (let d = 0; d <= 2; d++) for (let i = 0; i < 200; i++) {
    const c = LEVEL.count5.gen(d);
    assert.ok(['L-1-4', 'L-1-5', 'L1-1'].includes(c.unit));
    assert.ok(c.answer >= 1 && c.answer <= 5);
    const t = LEVEL.times.gen(d);
    assert.equal(t.anim.type, 'mul');
    assert.equal(t.answer, t.anim.a * t.anim.b);
  }
});

test('만 6세: 0~50, 쉬움 20까지 → 보통 두 자리±한 자리 → 어려움 두 자리±두 자리, 동물 모션', () => {
  for (let d = 0; d <= 2; d++) for (let i = 0; i < 500; i++) {
    const q = LEVEL.add10.gen(d), { a, b, type } = q.anim;
    assert.ok(['add', 'sub'].includes(type));
    assert.equal(q.answer, type === 'add' ? a + b : a - b);
    assert.ok(Math.max(a, q.answer) <= (d === 0 ? 20 : 50), q.text);
    if (d === 2) assert.ok(a >= 10 && b >= 10, q.text);
    if (d === 1) assert.ok(a >= 10 && b <= 9, q.text);
  }
});

test('만 7세: 다섯 자리 수만', () => {
  for (let d = 0; d <= 2; d++) for (let i = 0; i < 500; i++) {
    const q = LEVEL.big5.gen(d);
    const shown = (q.visual + q.choices.map(c => c.html).join('')).replace(/<[^>]+>/g, ' ');
    assert.ok(/\d{5}/.test(shown) || q.answer === 10000, `d${d} ${q.say}`);
    if (typeof q.answer === 'number' && q.answer !== 10000) assert.ok(q.answer >= 10000 && q.answer <= 99999 || q.answer < 10000 && /\d{5}/.test(shown), `d${d} ${q.say} → ${q.answer}`);
  }
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
  s.levelId = 'add10';
  const outs = solve(s, 70);
  outs.forEach((o, i) => assert.equal(!!o.sticker, (i + 1) % 7 === 0, `문제 ${i + 1}`));
  assert.equal(s.album.length, 10);
  assert.equal(new Set(s.album.map(x => x.ref)).size, 10);
  assert.ok(s.album.every(x => x.isNew));
  // 틀려도 끝까지 풀면 셈
  const t = newState();
  t.levelId = 'times';
  assert.equal(solve(t, 7, true).filter(o => o.sticker).length, 1);
});

test('40종을 다 모으면 그다음부터 겹칠 수 있음', () => {
  const s = newState();
  s.levelId = 'count5';
  solve(s, 7 * 41);
  assert.equal(new Set(s.album.map(x => x.ref)).size, EMOJI_STICKERS.length);
  assert.equal(s.album[40].isNew, false);
});

test('레벨 안 난이도: 5연속 정답 → 올라감, 2연속 오답 → 내려감', () => {
  const s = newState();
  s.levelId = 'add10';
  solve(s, 5);
  assert.equal(lvSt(s, 'add10').diff, 1);
  solve(s, 2, true);
  assert.equal(lvSt(s, 'add10').diff, 0);
});
