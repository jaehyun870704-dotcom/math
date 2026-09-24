import test from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, UNIT, AREA_SEQ, diagItem, AGE_START } from '../js/curriculum.js';
import { fitChoices } from '../js/game.js';

test('단원 수: 수와 연산 42 + 도형과 측정 16 + 변화와 관계 5 + 자료와 가능성 7 = 70', () => {
  const by = a => UNITS.filter(u => u.area === a).length;
  assert.equal(by('num'), 42);
  assert.equal(by('shape'), 16);
  assert.equal(by('pattern'), 5);
  assert.equal(by('data'), 7);
  assert.equal(UNITS.length, 70);
  assert.equal(new Set(UNITS.map(u => u.id)).size, 70);
});

test('레벨별 단원 수 (§2-2)', () => {
  const want = { 'L-1': 7, L0: 3, L1: 5, L2: 5, L3: 4, L4: 5, L5: 6, L6: 7 };
  for (const [lv, n] of Object.entries(want)) assert.equal(UNITS.filter(u => u.level === lv).length, n, lv);
});

test('영역 순서와 시작표가 실제 단원을 가리킴', () => {
  for (const seq of Object.values(AREA_SEQ)) for (const id of seq) assert.ok(UNIT[id], id);
  for (const st of Object.values(AGE_START)) for (const id of Object.values(st)) assert.ok(UNIT[id], id);
  for (const u of UNITS) for (const r of [...(u.req || []), ...(u.after ? [u.after] : [])]) assert.ok(UNIT[r], `${u.id} → ${r}`);
});

const passedAll = { passed: () => true, age: 8 };

test('모든 단원·난이도에서 문제가 올바르게 만들어짐 (각 60회)', () => {
  for (const u of UNITS) {
    for (let d = 0; d <= 2; d++) {
      for (let i = 0; i < 60; i++) {
        const q = u.gen(d, passedAll);
        const tag = `${u.id} d${d}`;
        assert.ok(q.say && typeof q.say === 'string', `${tag} say`);
        assert.ok(q.text.length <= 15, `${tag} 화면 문구 15자 초과: "${q.text}"`);
        assert.ok(q.say.length <= 22, `${tag} 음성 문구 너무 김: "${q.say}"`);
        assert.ok(!/undefined|NaN/.test(q.say + q.text + (q.visual || '')), `${tag} undefined/NaN`);
        if (q.kind === 'build') {
          if (q.mode === 'pattern') assert.ok(q.symbols.length >= 2 && q.slots === 6);
          else assert.equal(q.labels.length, q.target.length);
          continue;
        }
        const vals = q.choices.map(c => c.v);
        assert.equal(new Set(vals).size, vals.length, `${tag} 선택지 중복 ${JSON.stringify(vals)}`);
        assert.ok(vals.includes(q.answer), `${tag} 정답이 선택지에 없음 ${JSON.stringify(vals)} / ${q.answer}`);
        assert.ok(vals.length >= 2, `${tag} 선택지 2개 미만`);
        for (const max of [3, 4]) {
          const f = fitChoices({ ...q, choices: q.choices.slice() }, max);
          assert.ok(f.choices.length <= max);
          assert.ok(f.choices.some(c => c.v === q.answer), `${tag} 자른 뒤 정답 사라짐`);
        }
        if (typeof q.answer === 'number') assert.ok(q.answer >= 0, `${tag} 음수 정답`);
      }
    }
  }
});

test('진단 7문항', () => {
  for (let k = 1; k <= 7; k++) {
    const q = diagItem(k);
    assert.ok(q.choices.some(c => c.v === q.answer), `d${k}`);
  }
});
