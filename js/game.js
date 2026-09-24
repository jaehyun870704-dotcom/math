// 게임 상태 — 이름·프로필 없이 한 기기에 하나. DOM 없음 (Node 테스트 가능)
import { RULES } from './config.js';
import { shuffle } from './util.js';
import { LEVEL } from './levels.js';
import { newSticker, pickPraise } from './stickers.js';

export function newState() {
  return { v: 3, levelId: null, lv: {}, progress: 0, album: [], total: 0, cur: null, praiseRecent: [] };
}

export const lvSt = (s, id) => (s.lv[id] ||= { diff: 0, streak: 0, wrongRun: 0, solved: 0 });
export const maxChoices = id => (LEVEL[id].young ? 3 : 4);

export function fitChoices(q, max) {
  if (q.kind !== 'choice') return q;
  const ans = q.choices.find(c => c.v === q.answer);
  const kept = new Set([ans, ...q.choices.filter(c => c !== ans).slice(0, max - 1)]);
  q.choices = q.fixedOrder ? q.choices.filter(c => kept.has(c)) : shuffle([...kept]);
  return q;
}

export function nextQuestion(s, now = Date.now()) {
  const id = s.levelId;
  const L = LEVEL[id], st = lvSt(s, id);
  let q;
  for (let i = 0; i < 8; i++) {
    q = L.gen(st.diff);
    if (q.key !== s.cur?.q?.key) break;
  }
  fitChoices(q, maxChoices(id));
  s.cur = { q, attempts: 0, hinted: false, counted: false, t0: now };
  return s.cur;
}

// 틀리면: 1번째 다시 해보기(힌트는 3초 뒤) → 2번째 그림 다시 보여주기 → 3번째부터 보기 2개로
export function answer(s, value) {
  const c = s.cur;
  if (value === c.q.answer) return { ok: true };
  c.attempts++;
  const stage = c.attempts === 1 ? 'retry' : c.attempts === 2 ? 'concrete' : 'reduce';
  if (stage !== 'retry') c.hinted = true;
  return { ok: false, stage };
}

export function complete(s, photos = [], now = Date.now()) {
  const c = s.cur, st = lvSt(s, s.levelId);
  const out = { sticker: null, levelUp: false, levelDown: false };
  const first = c.attempts === 0 && !c.hinted;
  if (first) {
    st.wrongRun = 0;
    if (++st.streak >= RULES.diffUpStreak && st.diff < 2) { st.diff++; st.streak = 0; out.levelUp = true; }
  } else {
    st.streak = 0;
    if (++st.wrongRun >= RULES.diffDownWrong && st.diff > 0) { st.diff--; st.wrongRun = 0; out.levelDown = true; }
  }
  st.solved++;
  s.total++;
  s.progress++;
  if (s.progress >= RULES.stickerEvery) {
    s.progress = 0;
    out.sticker = newSticker(s.album, photos, now);
    s.album.push(out.sticker);
  }
  out.praise = pickPraise({ retried: c.attempts > 0, hinted: c.hinted, counted: c.counted }, s.praiseRecent);
  s.praiseRecent = [...s.praiseRecent, out.praise].slice(-5);
  s.cur = null;
  return out;
}
