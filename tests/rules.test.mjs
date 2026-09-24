import test from 'node:test';
import assert from 'node:assert/strict';
import { drawInterval, initStickerState, onSeatStart, countProblem, PRAISE } from '../js/stickers.js';
import { startDiag, diagAnswer, diagResult } from '../js/diagnostic.js';
import { newProfile, applyStart, beginSeating, nextQuestion, answer, complete, currentUnit, unitSt, passCond, endSeating, day, touch } from '../js/engine.js';
import { AGE } from '../js/config.js';
import { HOUR, DAY, MIN } from '../js/util.js';

test('가변비율 기대값: 5~8세 3.00 / 4세 약 2.3 (동일값 3연속 금지 포함)', () => {
  for (const [age, lo, hi] of [[6, 2.9, 3.1], [4, 2.25, 2.55]]) {
    const recent = [];
    let sum = 0;
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const v = drawInterval(age, recent);
      recent.push(v);
      if (recent.length > 4) recent.shift();
      sum += v;
    }
    const m = sum / N;
    assert.ok(m > lo && m < hi, `age ${age} mean ${m}`);
  }
});

test('같은 값 3연속 금지', () => {
  for (let i = 0; i < 2000; i++) {
    assert.notEqual(drawInterval(6, [3, 3]), 3);
    assert.notEqual(drawInterval(6, [2, 2]), 2);
    assert.equal(drawInterval(4, [2, 2]), 3);
  }
});

test('신규 프로필 첫 스티커는 2문제', () => {
  const st = initStickerState();
  onSeatStart(st, 6, 0);
  assert.equal(countProblem(st, 6, 1), false);
  assert.equal(countProblem(st, 6, 2), true);
  assert.ok(st.firstGiven);
});

test('카운터 이월: 최대 2문제, 48시간', () => {
  const st = { progress: 2, interval: 3, recent: [3], lastAt: 0, firstGiven: true };
  onSeatStart(st, 6, 24 * HOUR);
  assert.equal(st.progress, 2);
  assert.equal(countProblem(st, 6, 24 * HOUR + 1), true); // 어제 2 + 오늘 1
  const st2 = { progress: 2, interval: 3, recent: [3], lastAt: 0, firstGiven: true };
  onSeatStart(st2, 6, 49 * HOUR);
  assert.equal(st2.progress, 0);
});

test('상한 정합성: 하루 < 착석 × 2', () => {
  for (const g of Object.values(AGE)) assert.ok(g.dayCap < g.seatCap * 2);
});

test('칭찬 문구 20종 이상, 15자 이내', () => {
  const all = Object.values(PRAISE).flat();
  assert.ok(new Set(all).size >= 20);
  for (const p of all) assert.ok(p.length <= 15, p);
});

test('진단: 전부 맞음 → dmax 레벨 첫 단원, 그 위로 안 올림', () => {
  const st = startDiag(6);
  for (let i = 0; i < 6; i++) diagAnswer(st, 'ok');
  assert.equal(diagResult(st).start, 'L5-1'); // d3→d7(최고) → L5
});

test('진단: 틀린 최저 난이도 − 1 레벨의 첫 단원', () => {
  const st = startDiag(7);          // d4 시작
  diagAnswer(st, 'ok');             // d4 ok → d5
  diagAnswer(st, 'no');             // d5 no → d4
  diagAnswer(st, 'ok');             // d4 ok → d5
  diagAnswer(st, 'no');
  diagAnswer(st, 'ok');
  diagAnswer(st, 'no');
  assert.equal(diagResult(st).start, 'L2-1'); // dmin=5 → d4 → L2
});

test('진단: 전부 틀림/미측정 3개 → 나이 기준보다 한 레벨 아래', () => {
  const a = startDiag(8);
  for (let i = 0; i < 6; i++) diagAnswer(a, 'no');
  assert.equal(diagResult(a).start, 'L1-1'); // 만8 기준 L2 → L1
  const b = startDiag(4);
  for (let i = 0; i < 6; i++) diagAnswer(b, 'skip');
  assert.equal(diagResult(b).start, 'L-1-1');
});

function simulate(p, n, right = true, t0 = Date.now()) {
  let t = t0;
  const outs = [];
  for (let i = 0; i < n; i++) {
    nextQuestion(p, t);
    t += 2000;
    touch(p, t);
    const q = p.cur.q;
    if (!right) {
      const wrong = q.kind === 'choice' ? q.choices.find(c => c.v !== q.answer)?.v : [];
      answer(p, wrong, t);
      t += 1500;
    }
    const v = q.kind === 'choice' ? q.answer : q.mode === 'pattern' ? ['a', 'b', 'a', 'b', 'a', 'b'] : q.target;
    const r = answer(p, v, t);
    assert.ok(r.ok);
    outs.push(complete(p, t));
    t += 1000;
  }
  return { outs, t };
}

test('착석당 스티커 상한을 넘지 않고, 상한 뒤에도 학습은 계속', () => {
  const p = newProfile({ name: '테스트', age: 6 });
  applyStart(p, 'L0-2');
  const t0 = new Date(2026, 8, 24, 10).getTime();
  beginSeating(p, t0);
  const { outs } = simulate(p, 40, true, t0);
  assert.equal(p.seating.stickers, AGE.g56.seatCap);
  assert.ok(outs.some(o => o.capped));
  assert.ok(day(p, t0).afterCap > 0);
});

test('통과: 15문제 이상 + 최근 10개 중 9개 정답 + 힌트 2개 이하', () => {
  const u = { n: 15, win: Array(10).fill({ c: true, h: false }), skipTest: false };
  assert.ok(passCond(u));
  assert.ok(!passCond({ ...u, n: 14 }));
  assert.ok(!passCond({ ...u, win: [...Array(8).fill({ c: true, h: false }), { c: false, h: false }, { c: false, h: false }] }));
  assert.ok(!passCond({ ...u, win: [...Array(7).fill({ c: true, h: false }), ...Array(3).fill({ c: true, h: true })] }));
});

test('한 착석에서 통과 단원 최대 2개', () => {
  const p = newProfile({ name: '빠른아이', age: 8 });
  applyStart(p, 'L2-1');
  p.reviewQueue = [];
  const t0 = new Date(2026, 8, 24, 10).getTime();
  beginSeating(p, t0);
  simulate(p, 150, true, t0);
  assert.ok(p.seating.passed.length <= 2, `passed ${p.seating.passed}`);
});

test('오답 사다리: 3연속 오답 → 4단계, 그 후 2연속 오답 → 자연 종료', () => {
  const p = newProfile({ name: 't', age: 7 });
  applyStart(p, 'L1-3');
  const t0 = new Date(2026, 8, 24, 10).getTime();
  beginSeating(p, t0);
  const { outs } = simulate(p, 5, false, t0);
  assert.ok(p.seating.step4 || outs.some(o => o.end === 'tired'));
  assert.equal(outs[4].end, 'tired');
});

test('3일 이상 쉬면 윈도우 비우고 복습 5문제', () => {
  const p = newProfile({ name: 't', age: 7 });
  applyStart(p, 'L1-3');
  const t0 = new Date(2026, 8, 24, 10).getTime();
  beginSeating(p, t0);
  simulate(p, 6, true, t0);
  endSeating(p, t0 + 10 * MIN);
  const cur = currentUnit(p, 'num');
  const before = unitSt(p, cur).win.length;
  beginSeating(p, t0 + 4 * DAY);
  if (before > 0) assert.equal(unitSt(p, cur).win.length, 0);
  assert.equal(p.reviewQueue.length, 5);
});
