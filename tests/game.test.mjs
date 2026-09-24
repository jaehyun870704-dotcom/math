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
    assert.ok(q.answer >= 0 && Number.isInteger(q.answer), `${L.id} ${q.answer}`);
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

test('더하기·빼기 모션 정보: 20 이하는 동물, 두 자리는 블록', () => {
  for (let i = 0; i < 300; i++) {
    for (const id of ['add10', 'add20']) {
      const qq = LEVEL[id].gen(2); if (id === 'add10') assert.ok(Math.max(qq.anim.a, qq.answer) <= 30);
      const q = LEVEL[id].gen(2);
      assert.ok(['add', 'sub'].includes(q.anim.type), id);
      assert.equal(q.answer, q.anim.type === 'add' ? q.anim.a + q.anim.b : q.anim.a - q.anim.b);
    }
    const b = LEVEL.add100.gen(2);
    assert.ok(['badd', 'bsub'].includes(b.anim.type));
    assert.ok(b.answer < 100);
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
  s.levelId = 'add20';
  solve(s, 5);
  assert.equal(lvSt(s, 'add20').diff, 1);
  solve(s, 2, true);
  assert.equal(lvSt(s, 'add20').diff, 0);
});

test('만 6세: 쉬움 10까지 → 보통 20까지 → 어려움 30까지, 모두 동물 모션', () => {
  for (const [d, max] of [[0, 10], [1, 20], [2, 30]]) {
    let top = 0;
    for (let i = 0; i < 400; i++) {
      const q = LEVEL.add10.gen(d);
      const big = Math.max(q.anim.a, q.anim.a + (q.anim.type === 'add' ? q.anim.b : 0));
      assert.ok(big <= max, `d${d} ${q.text}`);
      assert.ok(['add', 'sub'].includes(q.anim.type));
      top = Math.max(top, big);
    }
    assert.equal(top, max);
  }
});
