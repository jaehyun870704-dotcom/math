// 학습 엔진 — 프로필 상태를 바꾸는 순수 로직 (DOM·저장소 없음)
import { AGE, RULES } from './config.js';
import { ageGroup, dayKey, rand, pick, shuffle, mean, MIN, DAY, uid } from './util.js';
import { UNIT, AREA_SEQ, SHARED, LEVELS, levelFirst, isLevelLast, ageStart } from './curriculum.js';
import { initStickerState, onSeatStart, countProblem, caps, newSticker, pickPraise } from './stickers.js';

export const cfgOf = p => AGE[ageGroup(p.age)];

// ── 프로필 ─────────────────────────────────────────
export function newProfile({ name, age, animal = '🐻' }, now = Date.now()) {
  const g = ageGroup(age);
  return {
    id: uid(), name, age, animal, created: now,
    together: g !== 'g78',          // 4세 강제, 5~6세 권장(기본 ON), 초1~2 불필요
    timeLimitMin: 0,                // 부모가 켠 경우에만 하드 컷
    diagDone: false, diag: null,
    units: {},
    stk: initStickerState(),
    seating: null,
    seatHist: [],                   // 최근 착석 id
    days: {},
    pending: [],                    // 받았지만 아직 안 붙인 스티커
    board: [],                      // 현재 보드에 붙은 스티커
    boards: [],                     // 완성한 보드
    wrongLog: [],
    events: [],                     // 부모 알림
    flags: {},                      // unitId → 같은 개념 3세션 연속 4단계
    step4Seats: {},
    block: null,
    reviewQueue: [],
    rtBase: null, rtN: 0,
    lastCalib: null,
    praiseRecent: [],
    cur: null,                      // 진행 중 문제 (재진입 복원용)
  };
}

export function day(p, now = Date.now()) {
  const k = dayKey(now);
  return (p.days[k] ||= { problems: 0, correct: 0, stickers: 0, seatings: 0, activeMs: 0, lastAt: 0, capHit: false, afterCap: 0, earlyExits: 0, solo: 0, levelUps: 0, passed: 0 });
}

export function unitSt(p, id) {
  return (p.units[id] ||= { n: 0, win: [], first: [], diff: 0, streak: 0, passed: false, assumed: false, lastAt: 0, calibDone: false, skipTest: false, skipN: 0, reviewMix: false, midRun: 0, deferred: false });
}
export const isPassed = (p, id) => !!p.units[id]?.passed;

function log(p, now, type, text) {
  p.events.unshift({ at: now, type, text });
  p.events = p.events.slice(0, 60);
}

// ── 시작 지점 (§3) ─────────────────────────────────
export function applyStart(p, numStart) {
  const mark = id => { const u = unitSt(p, id); u.passed = true; u.assumed = true; };
  for (const id of AREA_SEQ.num) { if (id === numStart) break; mark(id); }
  const st = ageStart(p.age);
  for (const area of ['shape', 'pattern', 'data']) {
    for (const id of AREA_SEQ[area]) {
      if (id === st[area]) break;
      if (!SHARED.has(id)) mark(id);
    }
  }
  p.diagDone = true;
}

// ── 단원 가용성 ────────────────────────────────────
export function available(p, id, area) {
  if (area === 'num') return true;
  const u = UNIT[id];
  if (u.req && !u.req.every(r => isPassed(p, r))) return false;
  if (u.minAge == null) return true;
  return p.age >= u.minAge || (u.after && isPassed(p, u.after));
}
export function currentUnit(p, area) {
  for (const id of AREA_SEQ[area]) {
    if (isPassed(p, id)) continue;
    if (area === 'num') return id;
    if (available(p, id, area)) return id;
  }
  return null;
}
export const levelOfNum = p => { const id = currentUnit(p, 'num'); return id ? UNIT[id].level : 'L6'; };

function passedIn(p, area) {
  return AREA_SEQ[area].filter(id => isPassed(p, id));
}
function prevPassed(p, area, id) {
  const s = AREA_SEQ[area];
  for (let i = s.indexOf(id) - 1; i >= 0; i--) if (isPassed(p, s[i])) return s[i];
  return null;
}

// ── 착석 (§4, §5-3) ────────────────────────────────
export function beginSeating(p, now = Date.now()) {
  const s = p.seating;
  if (s && !s.ended && now - s.lastAt < RULES.newSeatingGapMs) {
    return { resumed: true };
  }
  if (s && !s.ended) endSeating(p, s.lastAt, 'gap');
  const d = day(p, now);
  d.seatings++;
  p.seating = {
    id: now, start: now, lastAt: now, activeMs: 0, problems: 0, stickers: 0,
    recoveryGiven: false, restStage: 0, lastRestAt: now, alerted: false, warned: false,
    passed: [], wrongStreak: 0, step4: false, after4: 0, playMode: false,
    hist: [], rapid: [], unitStats: {}, lastParentAt: now, ended: false, streakDone: 0,
  };
  p.seatHist = [...p.seatHist, now].slice(-10);
  onSeatStart(p.stk, p.age, now);
  p.block = null;
  p.cur = null;

  // 3일 이상 쉰 단원: 윈도우 비우고 복습 5문제부터
  p.reviewQueue = [];
  for (const area of Object.keys(AREA_SEQ)) {
    const id = currentUnit(p, area);
    if (!id) continue;
    const u = unitSt(p, id);
    if (u.n > 0 && now - u.lastAt >= RULES.staleMs && !p.reviewQueue.length) {
      u.win = [];
      const prev = prevPassed(p, area, id) || id;
      p.reviewQueue = Array(RULES.staleReview).fill(prev);
    }
  }
  // 지난 착석에서 미뤄진 통과 처리
  for (const [id, u] of Object.entries(p.units)) {
    if (u.deferred && !u.passed) { u.deferred = false; tryPass(p, id, now, {}); }
  }
  return { resumed: false };
}

export function touch(p, now = Date.now()) {
  const s = p.seating;
  if (!s || s.ended) return;
  const dt = Math.min(Math.max(0, now - s.lastAt), 30_000);
  s.activeMs += dt;
  day(p, now).activeMs += dt;
  s.lastAt = now;
  day(p, now).lastAt = now;
}

// reason: 'child'(아이가 끝냄) | 'auto'(무입력) | 'tired'(오답 사다리 5단계) | 'limit' | 'gap'
export function endSeating(p, now = Date.now(), reason = 'child') {
  const s = p.seating;
  if (!s || s.ended) return;
  s.ended = true;
  s.endReason = reason;
  const d = day(p, now);
  if (reason === 'child' && s.problems < 5) d.earlyExits++;
  if (reason === 'auto') log(p, now, 'auto', `무입력 90초로 자동 마감 (${s.problems}문제)`);
  // 정답률 50~60%가 두 세션 지속 → 선행 복습 30% 섞기
  for (const [id, st] of Object.entries(s.unitStats)) {
    const u = unitSt(p, id);
    if (st.n < 5) continue;
    const acc = st.c / st.n;
    u.midRun = acc >= 0.5 && acc <= 0.6 ? u.midRun + 1 : 0;
    if (u.midRun >= 2) u.reviewMix = true;
  }
  p.block = null;
  p.cur = null;
}

// ── 문제 고르기 (§2-8) ─────────────────────────────
function chooseArea(p) {
  const young = p.age <= 5;
  const s = p.seating;
  const avail = ['num', 'shape', 'pattern', 'data'].filter(a => currentUnit(p, a));
  if (!avail.length) return null;
  let cands = avail.filter(a => a !== p.block?.area);
  if (!cands.length) cands = avail;
  if (s?.playMode) {
    const nonNum = cands.filter(a => a !== 'num');
    if (nonNum.length) cands = nonNum;
  }
  // 만 6세 이후: 수 60% + 나머지 13%씩. 만 4~5세: 병행
  const w = a => (a === 'num' ? (young ? 0.4 : 0.6) : young ? 0.2 : 0.13);
  const total = cands.reduce((t, a) => t + w(a), 0);
  let r = rand() * total;
  for (const a of cands) if ((r -= w(a)) < 0) return a;
  return cands[cands.length - 1];
}

export function pickUnit(p) {
  if (p.reviewQueue.length) return { id: p.reviewQueue.shift(), review: true };
  let area = p.block && p.block.left > 0 && currentUnit(p, p.block.area) ? p.block.area : null;
  if (!area) {
    area = chooseArea(p);
    if (!area) {
      // 전부 통과: 복습 무제한
      const all = Object.keys(p.units).filter(id => isPassed(p, id) && UNIT[id]);
      return { id: pick(all.length ? all : ['L-1-1']), review: true };
    }
    const len = area === 'num' ? (p.age <= 5 ? 3 : 5) : 3;
    p.block = { area, left: len };
  }
  p.block.left--;
  const id = currentUnit(p, area);
  const u = unitSt(p, id);
  if (u.reviewMix && rand() < 0.3) {
    const prev = prevPassed(p, area, id);
    if (prev) return { id: prev, review: true };
  }
  // 조건은 채웠지만 진도 상한으로 미룬 단원: 복습 섞기
  if (u.deferred && rand() < 0.5) {
    const done = passedIn(p, area);
    if (done.length) return { id: pick(done), review: true };
  }
  return { id, review: false };
}

// 선택지 수를 연령에 맞추고 섞기
export function fitChoices(q, max) {
  if (q.kind !== 'choice') return q;
  const ans = q.choices.find(c => c.v === q.answer);
  const others = q.choices.filter(c => c !== ans).slice(0, max - 1);
  const kept = new Set([ans, ...others]);
  q.choices = q.fixedOrder ? q.choices.filter(c => kept.has(c)) : shuffle([...kept]);
  return q;
}

export function nextQuestion(p, now = Date.now()) {
  const { id, review } = pickUnit(p);
  const u = unitSt(p, id);
  let diff = review ? Math.min(1, u.diff) : u.diff;
  if (p.seating?.playMode) diff = 0;
  const ctx = { age: p.age, passed: x => isPassed(p, x) };
  let q;
  for (let i = 0; i < 6; i++) {
    q = UNIT[id].gen(diff, ctx);
    if (q.key !== p.cur?.q?.key) break;
  }
  q.unit = id;
  fitChoices(q, cfgOf(p).maxChoices);
  p.cur = { q, review, attempts: 0, hinted: false, concrete: false, rapidWrong: false, rt: null, t0: now, counted: false };
  return p.cur;
}

// ── 답하기 (§9 개입 사다리 1~3단계) ─────────────────
export function checkBuild(q, vals) {
  if (q.mode === 'pattern') {
    if (vals.length !== q.slots || vals.some(v => v == null)) return false;
    if (new Set(vals).size < 2) return false;
    return [2, 3].some(per => vals.every((v, i) => v === vals[i % per]));
  }
  return q.target.every((t, i) => vals[i] === t);
}

export function answer(p, value, now = Date.now()) {
  const c = p.cur;
  const rt = now - c.t0;
  if (c.rt == null) c.rt = rt;
  c.t0 = now;
  const q = c.q;
  const ok = q.kind === 'build' ? checkBuild(q, value) : value === q.answer;
  if (ok) return { ok: true };
  c.attempts++;
  const rapid = rt < RULES.rapidMs && q.kind === 'choice';
  if (rapid) {
    c.rapidWrong = true;   // 이 문제는 스티커 카운트 제외, 힌트 모드로 재제시
    p.seating?.rapid.push(now);
  }
  const g = cfgOf(p);
  let stage;
  if (!g.eliminate) stage = 'concrete';          // 4세: 소거 없음, 즉시 힌트
  else if (rapid && c.attempts === 1) stage = 'hint';
  else stage = c.attempts === 1 ? 'retry' : c.attempts === 2 ? 'concrete' : 'reduce';
  if (stage === 'concrete') c.concrete = true;
  if (stage === 'hint') c.hinted = true;
  return { ok: false, stage };
}

export function useHint(p) { if (p.cur) p.cur.hinted = true; }

// ── 통과 판정 (§4-5, §4-6) ─────────────────────────
export function passCond(u) {
  if (u.skipTest) {
    if (u.skipN < RULES.skipTestN) return false;
    const last = u.win.slice(-RULES.skipTestN);
    return last.length === RULES.skipTestN && last.every(x => x.c && !x.h);
  }
  if (u.n < RULES.passMin || u.win.length < RULES.passWindow) return false;
  const w = u.win.slice(-RULES.passWindow);
  return w.filter(x => x.c).length >= RULES.passCorrect && w.filter(x => x.h).length <= RULES.passMaxHint;
}

function tryPass(p, id, now, out) {
  const u = unitSt(p, id);
  if (u.passed || !passCond(u)) return false;
  const s = p.seating, d = day(p, now);
  const numLevelUp = UNIT[id].area === 'num' && isLevelLast(id);
  if ((s && s.passed.length >= RULES.maxPassPerSeating) || (numLevelUp && d.levelUps >= RULES.maxLevelPerDay)) {
    u.deferred = true;
    return false;
  }
  u.passed = true; u.passedAt = now; u.deferred = false; u.skipTest = false;
  s?.passed.push(id);
  d.passed++;
  if (numLevelUp) d.levelUps++;
  out.passed = id;
  return true;
}

// ── 자동 보정 (§3-3) ───────────────────────────────
function calibrate(p, id, now) {
  const u = unitSt(p, id);
  if (u.calibDone || u.first.length < RULES.calibN) return;
  u.calibDone = true;
  const f = u.first;
  const acc = f.filter(x => x.c).length / f.length;
  const rt = mean(f.map(x => x.rt));
  const hints = f.filter(x => x.h).length;
  const strong = f.filter(x => x.s).length;
  const area = UNIT[id].area;
  const seq = AREA_SEQ[area];

  if (acc >= 0.95 && rt <= 3000 && hints === 0) {
    const twice = p.lastCalib === 'easy';
    p.lastCalib = 'easy';
    if (area === 'num') {
      const lv = UNIT[id].level;
      const rest = seq.filter(x => UNIT[x].level === lv && x !== id && !isPassed(p, x));
      if (twice && day(p, now).levelUps < RULES.maxLevelPerDay && LEVELS.indexOf(lv) < LEVELS.length - 1) {
        // 두 단원 연속 너무 쉬움 → 다음 레벨 첫 단원으로 점프
        for (const x of [id, ...rest]) { const v = unitSt(p, x); v.passed = true; v.assumed = true; }
        day(p, now).levelUps++;
        p.lastCalib = null;
        log(p, now, 'jump', `너무 쉬워서 ${LEVELS[LEVELS.indexOf(lv) + 1]} 레벨로 건너뜀`);
        return;
      }
      for (const x of rest) unitSt(p, x).skipTest = true;
    } else {
      const i = seq.indexOf(id);
      if (seq[i + 1] && !SHARED.has(seq[i + 1])) unitSt(p, seq[i + 1]).skipTest = true;
    }
    return;
  }
  if (acc <= 0.5 || strong / f.length >= 0.5) {
    // 너무 어려움 → 한 단원 아래로 조용히
    p.lastCalib = 'hard';
    const i = seq.indexOf(id);
    const prev = i > 0 ? seq[i - 1] : null;
    if (prev && (area === 'num' || !SHARED.has(prev))) {
      const v = unitSt(p, prev);
      v.passed = false; v.assumed = false; v.win = []; v.calibDone = true; v.diff = 0;
      log(p, now, 'down', `${UNIT[id].name} → ${UNIT[prev].name} (한 단원 아래로)`);
    } else {
      u.diff = 0;
    }
    return;
  }
  p.lastCalib = 'ok';
}

// ── 문제 완료 ──────────────────────────────────────
// 정답을 맞힌 순간 호출. UI는 결과를 받아 연출 순서대로 보여준다.
export function complete(p, now = Date.now(), photos = []) {
  const c = p.cur, s = p.seating, d = day(p, now), q = c.q;
  const g = cfgOf(p);
  const firstOk = c.attempts === 0;
  const hinted = c.hinted || c.concrete;
  const out = { stickers: [], passed: null, rest: null, end: null, warn: false, capped: false, praise: '' };

  // 단원 기록
  if (!c.review) {
    const u = unitSt(p, q.unit);
    u.n++;
    u.lastAt = now;
    if (u.skipTest) u.skipN++;
    u.win.push({ c: firstOk, h: hinted });
    if (u.win.length > RULES.passWindow) u.win.shift();
    if (u.first.length < RULES.calibN) u.first.push({ c: firstOk, h: hinted, s: c.concrete, rt: c.rt });
    if (firstOk && !hinted) {
      if (++u.streak >= RULES.diffUpStreak) { u.diff = Math.min(2, u.diff + 1); u.streak = 0; }
    } else u.streak = 0;
    const us = (s.unitStats[q.unit] ||= { n: 0, c: 0 });
    us.n++; if (firstOk) us.c++;
    if (u.skipTest && u.skipN >= RULES.skipTestN && !passCond(u)) u.skipTest = false;
    calibrate(p, q.unit, now);
    tryPass(p, q.unit, now, out);
  }

  s.problems++;
  d.problems++;
  if (firstOk) d.correct++;
  if (!firstOk) {
    p.wrongLog.unshift({ at: now, unit: q.unit, text: q.say, answer: String(q.answer ?? q.target?.join(', ') ?? '규칙 만들기').slice(0, 30), tries: c.attempts });
    p.wrongLog = p.wrongLog.slice(0, RULES.wrongLogMax);
  }
  // 반응시간 기준선 (정답·첫 시도만)
  if (firstOk && c.rt != null && c.rt < 60_000) {
    p.rtN++;
    p.rtBase = p.rtBase == null ? c.rt : p.rtBase + (c.rt - p.rtBase) / Math.min(p.rtN, 30);
  }
  s.hist.push({ c: firstOk, rt: c.rt });
  if (s.hist.length > 12) s.hist.shift();

  // 4세 동석 추정: 쉼터에서 어른 확인이 없으면 이후 문제를 '혼자 진행'으로 셈
  if (p.together && now - s.lastParentAt > g.rest[0] * MIN) d.solo++;

  // ── 스티커 (§5)
  const cp = caps(p.age);
  const canGive = () => s.stickers < cp.seat && d.stickers < cp.day;
  const give = reason => {
    if (!canGive()) return false;
    const st = { ...newSticker(photos, now), reason };
    s.stickers++; d.stickers++;
    p.pending.push(st);
    out.stickers.push(st);
    return true;
  };
  const counts = !c.rapidWrong;
  if (!canGive()) {
    // 상한 도달: 학습은 그대로, 스티커만 조용히 멈춤. 이월·소급 없음
    out.capped = true;
    if (!d.capHit) log(p, now, 'cap', '오늘 스티커 상한 도달');
    d.capHit = true;
    d.afterCap++;
    p.stk.progress = 0;
  } else {
    if (counts && countProblem(p.stk, p.age, now)) give('ratio');
    // 회복 스티커: 오답 후 재도전 성공, 착석당 1회
    if (c.attempts > 0 && !c.rapidWrong && !s.recoveryGiven && give('recovery')) s.recoveryGiven = true;
  }
  if (out.capped) s.streakDone++; else s.streakDone = 0;

  // ── 오답 사다리 4~6단계
  if (!firstOk) s.wrongStreak++; else s.wrongStreak = 0;
  if (s.step4) {
    if (!firstOk) s.after4++;
    else { s.step4 = false; s.after4 = 0; }
    if (s.after4 >= 2) { out.end = 'tired'; give('end'); }
  } else if (s.wrongStreak >= 3) {
    s.step4 = true; s.after4 = 0;
    if (!c.review) { const u = unitSt(p, q.unit); u.diff = Math.max(0, u.diff - 1); }
    const seats = (p.step4Seats[q.unit] ||= []);
    if (!seats.includes(s.id)) seats.push(s.id);
    const last3 = p.seatHist.slice(-3);
    if (last3.length === 3 && last3.every(id => seats.includes(id)) && !p.flags[q.unit]) {
      p.flags[q.unit] = now;
      log(p, now, 'flag', `${UNIT[q.unit].name}: 3세션 연속 어려워함`);
    }
  }

  // ── 시간·피로 (§4-2)
  const mins = s.activeMs / MIN;
  if (!out.end && p.timeLimitMin > 0) {
    if (mins >= p.timeLimitMin) out.end = 'limit';
    else if (!s.warned && mins >= p.timeLimitMin - 2) { s.warned = true; out.warn = true; }
  }
  if (!s.alerted && mins >= g.rest[2]) {
    s.alerted = true;
    log(p, now, 'long', `${Math.round(mins)}분째 학습 중 (권장 ${g.recommend})`);
  }
  if (!out.end) {
    if (s.restStage === 0 && mins >= g.rest[0]) out.rest = 'r1';
    else if (s.restStage === 1 && mins >= g.rest[1]) out.rest = 'r2';
    else if (now - s.lastRestAt > RULES.restCooldownMs && fatigued(p, now)) out.rest = 'fatigue';
  }

  const praiseCtx = { retried: c.attempts > 0, hinted, counted: !!q.count };
  out.praise = out.capped && s.streakDone >= 3 && s.streakDone % 3 === 0
    ? `${s.streakDone}개 연속으로 끝냈네`
    : pickPraise(praiseCtx, p.praiseRecent);
  p.praiseRecent = [...p.praiseRecent, out.praise].slice(-5);
  p.cur = null;
  return out;
}

function fatigued(p, now) {
  const s = p.seating, h = s.hist.slice(-RULES.fatigueWindow);
  if (h.length < RULES.fatigueWindow) return false;
  if (h.filter(x => !x.c).length / h.length > RULES.fatigueWrong) return true;
  if (p.rtBase && p.rtN >= 10 && mean(h.map(x => x.rt ?? 0)) > p.rtBase * RULES.fatigueRT) return true;
  return s.rapid.filter(t => now - t < 3 * MIN).length >= RULES.fatigueRapid;
}

// 쉼터를 보여줬을 때
export function restShown(p, kind, now = Date.now()) {
  const s = p.seating;
  s.lastRestAt = now;
  s.hist = [];
  s.rapid = [];
  if (kind === 'r1') s.restStage = 1;
  if (kind === 'r2') {
    // 2차 쉼터 이후: 난이도 한 단 낮추고 놀이형으로 (끊지 않고 부하만 낮춤)
    s.restStage = 2;
    s.playMode = true;
  }
}
export function parentPresent(p, now = Date.now()) {
  if (p.seating) p.seating.lastParentAt = now;
}

// ── 보드 (§5-6) ────────────────────────────────────
export const boardSize = p => cfgOf(p).board;
export function stickOne(p) {
  const st = p.pending.shift();
  if (!st) return { done: true };
  p.board.push(st);
  return { st, full: p.board.length >= boardSize(p) };
}
export function completeBoard(p, deco, now = Date.now()) {
  p.boards.push({ at: now, stickers: p.board, deco });
  p.board = [];
  log(p, now, 'board', '보드 완성 — 실물 보상 타이밍이에요');
}
