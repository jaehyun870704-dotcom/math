// 아이 화면 — 프로필 / 설정 / 진단 / 풀이 / 쉼터 / 끝(보드) / 자유 놀이
import { load, save, getPhotos } from './store.js';
import { initVoice, speak, hush, sfx, unlockAudio } from './audio.js';
import { RULES } from './config.js';
import { NATIVE, readKo, sleep, pick, sample, ageGroup, rand } from './util.js';
import { diagItem } from './curriculum.js';
import { startDiag, diagAnswer, diagResult, diagDone, DOOR_ANIMALS } from './diagnostic.js';
import * as E from './engine.js';
import * as A from './art.js';
import { openParent } from './parent.js';

const $app = document.getElementById('app');
const $ = sel => $app.querySelector(sel);
const $$ = sel => [...$app.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = load();
let P = null;
let photos = [];
let screen = '';
let busy = false;
let wantRest = false;
let hintT = null;
let idleT = null;
let idleFn = null;
let timers = [];

const WRONG_LINES = ['음, 다시 한번 볼까?', '거의 다 왔어', '이거 헷갈리는 거 맞아'];
const DECOS = ['👑', '🎀', '🌈', '🎉', '🌟', '🦋', '🌸', '🍀'];
const ANIMALS = ['🐻', '🐰', '🐶', '🐱', '🦊', '🐼', '🐯', '🐸'];

const cfg = () => E.cfgOf(P);
const commit = () => save(S);
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function clearTimers() { timers.forEach(clearTimeout); timers = []; clearTimeout(hintT); }

// ── 무입력 감시 (90초 자동 마감) ──
function armIdle(fn) { idleFn = fn; clearTimeout(idleT); if (fn) idleT = setTimeout(fn, RULES.idleCloseMs); }
document.addEventListener('pointerdown', () => {
  unlockAudio();
  if (idleFn) armIdle(idleFn);
  if (P && (screen === 'play' || screen === 'rest')) E.touch(P);
}, true);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  hush();
  if (screen === 'parent') showProfiles(); // 백그라운드 시 즉시 잠금
  if (P && screen === 'play') { E.touch(P); commit(); }
});

function applyAgeStyle() {
  const c = cfg(), r = document.documentElement.style;
  r.setProperty('--tap', c.tap + 'px');
  r.setProperty('--gap', c.gap + 'px');
  r.setProperty('--home', c.home + 'px');
  document.body.dataset.age = ageGroup(P.age);
}

// ── 부모 진입점: 우하단 44px, 불투명도 50%, 2초 길게 누르기 ──
const parentEntry = () => `<button class="parent-entry" aria-label="보호자 메뉴">⚙️</button>`;
function bindParentEntry() {
  const b = $('.parent-entry');
  if (!b) return;
  let t = null;
  const cancel = () => { clearTimeout(t); b.classList.remove('holding'); };
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    b.classList.add('holding');
    t = setTimeout(() => { cancel(); goParent(); }, RULES.parentHoldMs);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, cancel));
}
function goParent() {
  clearTimers();
  armIdle(null);
  hush();
  screen = 'parent';
  document.body.dataset.age = '';
  openParent($app, {
    S, commit,
    photos: () => photos,
    reloadPhotos: async () => { photos = await getPhotos(); },
    exit: showProfiles,
    addProfile: () => showSetup(true),
    stickerHTML,
    setScreen: s => { screen = s; },
  });
}

// ═════════ 프로필 선택 ═════════
function showProfiles() {
  clearTimers();
  armIdle(null);
  screen = 'profiles';
  P = null;
  document.body.dataset.age = '';
  const list = S.order.map(id => S.profiles[id]).filter(Boolean);
  $app.innerHTML = `
  <div class="screen profiles">
    <h1 class="logo">우리집 산수</h1>
    <div class="plist">
      ${list.map(p => `<button class="pcard" data-act="pick" data-id="${p.id}"><span class="ava">${p.animal}</span><b>${esc(p.name)}</b></button>`).join('')}
      ${list.length ? '' : `<button class="pcard add" data-act="setup"><span class="ava">🌱</span><b>처음 시작하기</b></button>`}
    </div>
    ${parentEntry()}
  </div>`;
  bindParentEntry();
  $app.onpointerdown = null;
  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'setup') showSetup(false);
    if (b.dataset.act === 'pick') enterProfile(b.dataset.id);
  };
}

function enterProfile(id) {
  P = S.profiles[id];
  applyAgeStyle();
  if (!P.diagDone) return showDiag();
  const s = P.seating;
  // 재진입: 묻지 않고 조용히 이어서
  if (s && !s.ended && Date.now() - s.lastAt < RULES.newSeatingGapMs) return startPlay();
  showHome();
}

// ═════════ 프로필 만들기 (부모가 입력) ═════════
function showSetup(fromParent) {
  screen = 'setup';
  const st = { age: null, animal: '🐻' };
  $app.innerHTML = `
  <div class="screen setup">
    <h2>아이 프로필 만들기</h2>
    <p class="sub">보호자가 입력해 주세요. 다음 화면에서 아이가 동물 친구들과 인사합니다 (약 1분).</p>
    <label class="fld">이름 <input id="nm" maxlength="8" autocomplete="off" placeholder="예: 서윤"></label>
    <div class="fld">만 나이</div>
    <div class="ages">${[4, 5, 6, 7, 8].map(a => `<button data-age="${a}">만 ${a}세${a === 7 ? '<small>초1</small>' : a === 8 ? '<small>초2</small>' : ''}</button>`).join('')}</div>
    <div class="fld">친구 동물</div>
    <div class="animals">${ANIMALS.map(a => `<button data-ani="${a}" class="${a === st.animal ? 'on' : ''}">${a}</button>`).join('')}</div>
    <div class="row">
      <button class="btn" data-act="cancel">취소</button>
      <button class="btn primary" data-act="ok">다음</button>
    </div>
    <p class="warn" hidden></p>
  </div>`;
  $app.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.age) { st.age = +b.dataset.age; $$('.ages button').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.ani) { st.animal = b.dataset.ani; $$('.animals button').forEach(x => x.classList.toggle('on', x === b)); }
    if (b.dataset.act === 'cancel') fromParent ? goParent() : showProfiles();
    if (b.dataset.act === 'ok') {
      const name = $('#nm').value.trim();
      if (!name || !st.age) { const w = $('.warn'); w.hidden = false; w.textContent = '이름과 나이를 골라 주세요.'; return; }
      P = E.newProfile({ name, age: st.age, animal: st.animal });
      S.profiles[P.id] = P;
      S.order.push(P.id);
      commit();
      applyAgeStyle();
      showDiag();
    }
  };
}

// ═════════ 진단: "동물 친구 인사" (§3-2) ═════════
// 점수·별·진행바 없음. 맞아도 틀려도 같은 연출. 8초 무응답 → 다음 문. 결과는 말하지 않음.
function showDiag() {
  clearTimers();
  screen = 'diag';
  armIdle(null);
  const st = startDiag(P.age);
  const t0 = Date.now();
  let k = 0;
  $app.innerHTML = `
  <div class="screen diag">
    <div class="doors">${DOOR_ANIMALS.map((a, i) => `<div class="door" data-k="${i}"><div class="dani">${a}</div><div class="dleaf"></div></div>`).join('')}</div>
    <div class="dq"><div class="visual"></div><div class="choices"></div></div>
  </div>`;
  const dq = $('.dq');
  const finish = () => {
    clearTimers();
    const r = diagResult(st);
    P.diag = { log: st.log, start: r.start, rule: r.rule, at: Date.now() };
    E.applyStart(P, r.start);
    commit();
    startPlay();
  };
  const next = async () => {
    if (diagDone(st) || Date.now() - t0 > RULES.diagTotalMs) return finish();
    const door = $(`.door[data-k="${k}"]`);
    k++;
    door.classList.add('open');
    sfx.door();
    await sleep(600);
    if (screen !== 'diag') return;
    const q = E.fitChoices(diagItem(st.cur), cfg().maxChoices);
    let done = false;
    const reply = res => {
      if (done) return;
      done = true;
      clearTimers();
      diagAnswer(st, res);
      dq.classList.remove('show');
      door.classList.add('met');
      sfx.door();
      speak('안녕!');
      later(next, 1100);
    };
    dq.querySelector('.visual').innerHTML = q.visual || '';
    dq.querySelector('.choices').innerHTML = q.choices.map((c, i) => `<button class="ch" data-i="${i}">${c.html}</button>`).join('');
    dq.classList.add('show');
    dq.onclick = e => {
      const b = e.target.closest('.ch');
      if (b) reply(q.choices[+b.dataset.i].v === q.answer ? 'ok' : 'no');
    };
    speak(q.say);
    later(() => reply('skip'), RULES.diagTimeoutMs);
  };
  speak('동물 친구들이 인사하러 왔어!').then(() => { if (screen === 'diag') next(); });
}

// ═════════ 아이 홈 ═════════
function showHome() {
  clearTimers();
  screen = 'home';
  armIdle(showProfiles);
  $app.innerHTML = `
  <div class="screen home">
    <button class="home-btn" data-act="exit" aria-label="처음으로">🏠</button>
    <div class="hello">${P.animal}</div>
    <div class="tiles">
      <button class="tile play" data-act="play"><span>🧩</span><b>놀이하기</b></button>
      <button class="tile explore" data-act="explore"><span>🎨</span><b>자유 놀이</b></button>
    </div>
    ${parentEntry()}
  </div>`;
  bindParentEntry();
  speak(`${P.name}, 안녕!`);
  $app.onpointerdown = null;
  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'exit') showProfiles();
    if (b.dataset.act === 'play') startPlay();
    if (b.dataset.act === 'explore') showExplore();
  };
}

// ═════════ 풀이 ═════════
const PLAY_WIDGETS = new Set(['root', 'props', 'speaker', 'home', 'stage', 'choices', 'mascot', 'hint', 'bubble', 'restTile']);
// 풀이 화면 화이트리스트: 스티커 수·남은 수·정답률 같은 수량 위젯은 등록 불가
function guardWhitelist() {
  for (const el of $$('[data-w]')) if (!PLAY_WIDGETS.has(el.dataset.w)) el.remove();
  for (const el of $$('.board, .counter, .score, .progress')) el.remove();
}

function startPlay() {
  clearTimers();
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  E.beginSeating(P);
  commit();
  renderPlayShell();
  if (P.cur) renderProblem(P.cur, true);
  else nextProblem();
}

function renderPlayShell() {
  screen = 'play';
  busy = false;
  wantRest = false;
  armIdle(autoClose);
  $app.innerHTML = `
  <div class="screen play" data-w="root">
    <div class="props" data-w="props"></div>
    <button class="speak-btn" data-w="speaker" data-act="say" aria-label="다시 듣기">🔊</button>
    <button class="home-btn" data-w="home" data-act="home" aria-label="그만하기">🏠</button>
    <div class="stage" data-w="stage"></div>
    <div class="choices" data-w="choices"></div>
    <div class="mascot" data-w="mascot">${P.animal}</div>
    <button class="hint-btn" data-w="hint" data-act="hint" aria-label="도움" hidden>💡</button>
    <div class="bubble" data-w="bubble" hidden></div>
    <button class="rest-tile" data-w="restTile" data-act="rest" hidden>🛋️ 잠깐 쉬기</button>
  </div>`;
  guardWhitelist();
  renderProps();
  $app.onclick = onPlayClick;
  $app.onpointerdown = onPlayPointer;
}

function nextProblem() {
  const cur = E.nextQuestion(P);
  commit();
  renderProblem(cur, false);
}

function renderProblem(cur, restored) {
  busy = false;
  clearTimeout(hintT);
  if (restored) cur.t0 = Date.now();
  const q = cur.q, c = cfg();
  const wide = q.layout === 'wide' || (q.kind === 'build' && q.mode === 'bars');
  $('.play').classList.toggle('wide', wide);
  const vis = q.kind === 'build' && q.mode === 'pattern' ? `<div class="palette">${q.symbols.join(' ')}</div>` : q.visual || '';
  $('.stage').innerHTML = `${c.showText ? `<div class="prompt">${q.text}</div>` : ''}<div class="visual">${vis}</div>`;
  if (q.kind === 'choice') {
    $('.choices').innerHTML = q.choices.map((o, i) => `<button class="ch" data-act="pick" data-i="${i}">${o.html}</button>`).join('');
  } else {
    renderBuild();
  }
  $('.hint-btn').hidden = !(restored && cur.attempts > 0);
  $('.bubble').hidden = true;
  $('.rest-tile').hidden = true;
  guardWhitelist();
  speak(q.say);
}

function onPlayClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  switch (b.dataset.act) {
    case 'say': if (P.cur) speak(P.cur.q.say); break;
    case 'home': if (!busy) showConfirm(); break;
    case 'hint': doHint(); break;
    case 'pick': if (!busy && !b.disabled) onPick(b); break;
    case 'rest': wantRest = true; b.hidden = true; break;
    case 'cell': if (!busy) onCell(b); break;
    case 'done': if (!busy) onBuildDone(); break;
  }
}

// 탭하며 세기: 탭한 항목에 표시가 남아 두 번 세기를 막음
function onPlayPointer(e) {
  const t = e.target.closest('.cnt');
  if (!t || t.classList.contains('on') || busy) return;
  t.classList.add('on');
  const k = $$('.visual .cnt.on').length;
  speak(k <= 10 ? NATIVE[k] : readKo(k));
  if (P.cur) P.cur.counted = true;
  if (P.cur?.q.assist && k === $$('.visual .cnt').length) later(() => speak('다 세면 몇 개?'), 700);
}

function onPick(btn) {
  const q = P.cur.q;
  const r = E.answer(P, q.choices[+btn.dataset.i].v);
  commit();
  if (r.ok) onCorrect(btn);
  else onWrong(r.stage, btn);
}

// §9-1 틀렸을 때: 연회색으로 물러남, 흔들림·빨강 없음, 힌트는 3초 뒤
async function onWrong(stage, btn) {
  const c = cfg();
  if (c.wrongSound) sfx.wrong();
  mascot('curious');
  if (btn && c.eliminate) { btn.classList.add('out'); btn.disabled = true; }
  const line = pick(WRONG_LINES);
  bubble(line);
  if (stage === 'retry') { speak(line); scheduleHint(); return; }
  await speak(line);
  if (!P.cur) return;
  if (stage === 'hint') doHint();
  else if (stage === 'concrete') { showConcrete(); scheduleHint(); }
  else if (stage === 'reduce') reduceChoices();
}

function scheduleHint() {
  clearTimeout(hintT);
  hintT = setTimeout(() => { const h = $('.hint-btn'); if (h && P.cur) { h.hidden = false; h.classList.add('appear'); } }, RULES.hintDelayMs);
}

function doHint() {
  if (!P.cur) return;
  E.useHint(P);
  commit();
  const q = P.cur.q;
  speak(q.hint?.say);
  if (q.kind === 'build') markBuildWrong();
  else if (q.hint?.visual) $('.visual').innerHTML = q.hint.visual;
  else $('.visual')?.classList.add('glow');
}

// 2차 오답: 구체물 등장 (7+5면 블록 7개와 5개)
function showConcrete() {
  const q = P.cur.q;
  if (q.kind === 'build') return buildAssist(1);
  if (q.concrete) $('.visual').innerHTML = q.concrete;
  else if (q.assist) assistCount(q.assist);
  else doHint();
}

// 강한 힌트: 앱이 처음 몇 개를 대신 세어줌
async function assistCount(n) {
  const items = $$('.visual .cnt:not(.on)').slice(0, n);
  for (const el of items) {
    await sleep(500);
    el.classList.add('on');
    speak(NATIVE[$$('.visual .cnt.on').length]);
  }
}

// 3차 오답: 선택지를 조용히 2개로
function reduceChoices() {
  const q = P.cur.q;
  if (q.kind === 'build') return buildAssist(99);
  const btns = $$('.ch[data-act="pick"]:not(:disabled)');
  const ans = btns.find(b => q.choices[+b.dataset.i].v === q.answer);
  const others = btns.filter(b => b !== ans);
  others.slice(1).forEach(b => { b.classList.add('gone'); b.disabled = true; });
}

async function onCorrect(btn) {
  busy = true;
  clearTimeout(hintT);
  btn?.classList.add('right');
  sfx.right();
  mascot('happy');
  const q = P.cur.q;
  const out = E.complete(P, Date.now(), photos);
  commit();
  $('.hint-btn').hidden = true;
  $('.rest-tile').hidden = false; // 문제 사이 전환 구간의 "잠깐 쉬기"
  if (q.after) await speak(q.after);
  // 과정 피드백 선행 게이트: 스티커는 피드백 완료 콜백에서만 시작
  await feedbackThen(out.praise, async () => {
    for (const st of out.stickers) await revealSticker(st);
  });
  if (screen !== 'play') return;
  if (out.capped) addProp(); // 상한 후: 스티커 대신 배경 소품
  if (out.passed) { toast('✨ 새 놀이가 열렸어'); await speak('새 놀이가 열렸어'); }
  if (out.warn) { bubble('조금 뒤에 쉬는 시간이야'); await speak('조금 뒤에 쉬는 시간이야'); }
  $('.rest-tile').hidden = true;
  if (out.end) return finishSeating(out.end);
  if (out.rest || wantRest) {
    const k = out.rest || 'self';
    wantRest = false;
    return showRest(k);
  }
  await sleep(250);
  if (screen === 'play') nextProblem();
}

function feedbackThen(praise, onDone) {
  bubble(praise, 2200);
  return Promise.all([sleep(RULES.feedbackGateMs), speak(praise)]).then(onDone);
}

function revealSticker(st) {
  return new Promise(res => {
    const ms = cfg().stickerMs;
    const el = document.createElement('div');
    el.className = 'stk-pop';
    el.innerHTML = `<div class="stk${st.sparkle ? ' sparkle' : ''}">${stickerHTML(st)}</div>`;
    document.body.appendChild(el);
    sfx.sticker();
    setTimeout(() => el.classList.add('away'), ms - 450);
    setTimeout(() => { el.remove(); res(); }, ms);
  });
}

export function stickerHTML(st) {
  if (st.kind === 'photo') {
    const p = photos.find(x => x.id === st.ref);
    return p ? `<img class="sp" src="${p.data}" alt="">` : `<span class="se">⭐</span>`;
  }
  return `<span class="se">${st.ref}</span>`;
}

function mascot(state) {
  const m = $('.mascot');
  if (!m) return;
  m.className = `mascot ${state}`;
  later(() => { m.className = 'mascot'; }, 1300);
}
function bubble(text, ms = 2000) {
  const b = $('.bubble');
  if (!b) return;
  b.textContent = text;
  b.hidden = false;
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, ms);
}
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const PROPS = ['🌷', '🌼', '🍄', '🌳', '🐞', '🌻', '🐌', '🌵', '🪺', '🦔'];
function addProp() {
  const s = P.seating;
  s.props ||= [];
  if (s.props.length < 14) s.props.push({ e: pick(PROPS), x: Math.round(rand() * 92) });
  commit();
  renderProps();
}
function renderProps() {
  const el = $('.props');
  if (el) el.innerHTML = (P.seating?.props || []).map(p => `<span style="left:${p.x}%">${p.e}</span>`).join('');
}

// ── 만들기형 (표 채우기·그래프 만들기·규칙 만들기) ──
function renderBuild() {
  const cur = P.cur, q = cur.q;
  cur.vals ||= q.mode === 'pattern' ? Array(q.slots).fill(null) : q.labels.map(() => 0);
  const v = cur.vals;
  let body = '';
  if (q.mode === 'counter') {
    body = `<div class="bcounter">${q.labels.map((l, i) => `<div class="bc"><div class="bl">${l}</div><button class="bcell" data-act="cell" data-i="${i}">${v[i]}</button></div>`).join('')}</div>`;
  } else if (q.mode === 'bars') {
    body = `<div class="bbars">${q.labels.map((l, i) => `<div class="bcol">${Array.from({ length: q.max }, (_, k) => {
      const lv = q.max - k;
      return `<button class="bslot${lv <= v[i] ? ' on' : ''}" data-act="cell" data-i="${i}" data-lv="${lv}">${lv <= v[i] ? '○' : ''}</button>`;
    }).join('')}<div class="bl">${l}</div></div>`).join('')}</div>`;
  } else {
    body = `<div class="bpat">${v.map((x, i) => `<button class="pslot" data-act="cell" data-i="${i}">${x ?? ''}</button>`).join('')}</div>`;
  }
  $('.choices').innerHTML = `<div class="build">${body}<button class="ch done" data-act="done">다 했어 👍</button></div>`;
}
function onCell(b) {
  const q = P.cur.q, v = P.cur.vals, i = +b.dataset.i;
  if (q.mode === 'counter') v[i] = (v[i] + 1) % (q.max + 1);
  else if (q.mode === 'bars') { const lv = +b.dataset.lv; v[i] = v[i] === lv ? lv - 1 : lv; }
  else { const s = q.symbols; v[i] = s[v[i] == null ? 0 : (s.indexOf(v[i]) + 1) % s.length]; }
  sfx.tap();
  commit();
  renderBuild();
}
function onBuildDone() {
  const q = P.cur.q, vals = P.cur.vals.slice();
  const r = E.answer(P, vals);
  commit();
  if (r.ok) {
    if (q.mode === 'pattern') {
      $('.visual').innerHTML = A.seq([...vals, ...vals]);
      speak('규칙이 계속 이어져!');
    }
    return onCorrect(null);
  }
  onWrong(r.stage, null);
}
function markBuildWrong() {
  const q = P.cur.q;
  if (q.mode === 'pattern') return;
  $$('[data-act="cell"]').forEach(b => {
    const i = +b.dataset.i;
    if (P.cur.vals[i] !== q.target[i]) b.closest('.bc, .bcol')?.classList.add('chk');
  });
}
// 오답 뒤 도움: n칸을 바르게 채워 줌
function buildAssist(n) {
  const q = P.cur.q, v = P.cur.vals;
  if (q.mode === 'pattern') {
    const s = q.symbols;
    const fill = n >= 99 ? [s[0], s[1], s[0], s[1], s[0], null] : [s[0], s[1], null, null, null, null];
    fill.forEach((x, i) => { if (x) v[i] = x; });
  } else {
    let left = n;
    q.target.forEach((t, i) => { if (left > 0 && v[i] !== t && (n < 99 || i > 0)) { v[i] = t; left--; } });
  }
  commit();
  renderBuild();
  markBuildWrong();
}

// ── 집 버튼 → "더 할래 / 오늘은 끝" (같은 크기·같은 색, 보드 미끼 없음) ──
function showConfirm() {
  hush();
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="two">
      <button class="big-choice" data-c="more"><span>🧩</span><b>더 할래</b></button>
      <button class="big-choice" data-c="quit"><span>🌙</span><b>오늘은 끝</b></button>
    </div>${P.together ? '<p class="small">어른과 함께 골라요</p>' : ''}`;
  $app.appendChild(o);
  speak('더 할래? 오늘은 끝?');
  o.onclick = e => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    o.remove();
    if (b.dataset.c === 'quit') finishSeating('child');
    else if (P.cur) speak(P.cur.q.say);
  };
}

function autoClose() {
  if (!P) return showProfiles();
  E.endSeating(P, Date.now(), 'auto');
  commit();
  showProfiles();
}

async function finishSeating(reason) {
  clearTimers();
  E.endSeating(P, Date.now(), reason);
  commit();
  if (reason === 'tired') await speak('오늘은 여기까지 하고 놀자');
  if (reason === 'limit') await speak('오늘은 여기까지! 또 만나');
  showEnd();
}

// ═════════ 쉼터 (§4-2) — 비채점 12초, 강제 종료 없음 ═════════
function showRest(kind) {
  clearTimers();
  screen = 'rest';
  E.restShown(P, kind);
  commit();
  armIdle(autoClose);
  $app.onpointerdown = null;
  $app.innerHTML = `
  <div class="screen rest">
    <button class="home-btn" data-act="stop" aria-label="그만하기">🏠</button>
    <div class="rest-anim"><div class="breath">${P.animal}</div><div class="zzz">💤</div></div>
    <div class="rest-line"></div>
    <div class="two rest-choices" hidden>
      <button class="big-choice" data-act="cont"><span>▶️</span><b>계속하기</b></button>
      <button class="big-choice" data-act="stop"><span>🌙</span><b>오늘은 여기까지</b></button>
    </div>
    ${P.together ? '<button class="parent-here" data-act="here">어른이 함께 있어요</button>' : ''}
  </div>`;
  const lines = ['숨을 크게 쉬어볼까?', '팔을 쭉 뻗어봐', '친구도 잠깐 쉬어'];
  lines.forEach((l, i) => later(() => { $('.rest-line').textContent = l; speak(l); }, i * 4000 + 300));
  later(() => { $('.rest-choices').hidden = false; speak('계속할까? 여기까지 할까?'); }, RULES.restSec * 1000);
  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'cont') { clearTimers(); renderPlayShell(); nextProblem(); }
    if (b.dataset.act === 'stop') finishSeating('child');
    if (b.dataset.act === 'here') { E.parentPresent(P); commit(); b.remove(); }
  };
}

// ═════════ 끝 화면 — 보드는 여기서만 열림 ═════════
function showEnd() {
  clearTimers();
  screen = 'end';
  armIdle(showProfiles);
  $app.onpointerdown = null;
  const render = () => {
    const N = E.boardSize(P);
    const cells = Array.from({ length: N }, (_, i) => P.board[i] ? `<div class="slot filled">${stickerHTML(P.board[i])}</div>` : '<div class="slot"></div>').join('');
    const shelf = P.boards.slice(-8).map(b => `<span class="done-board" title="완성한 보드">${b.deco}</span>`).join('');
    $app.innerHTML = `
    <div class="screen end">
      <div class="board-wrap">
        <div class="board" style="--cols:${N === 15 ? 5 : N === 20 ? 5 : 6}">${cells}</div>
        ${shelf ? `<div class="shelf">${shelf}</div>` : ''}
      </div>
      <div class="side">
        <div class="tray">${P.pending.map(st => `<button class="tray-st${st.sparkle ? ' sparkle' : ''}" data-act="stick">${stickerHTML(st)}</button>`).join('')}</div>
        <button class="btn bye" data-act="bye">👋 안녕!</button>
      </div>
      ${parentEntry()}
    </div>`;
    bindParentEntry();
  };
  render();
  speak(P.pending.length ? '스티커를 붙여볼까?' : '오늘도 즐거웠어');
  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'bye') { speak('또 만나!'); return showProfiles(); }
    if (b.dataset.act === 'stick') {
      const r = E.stickOne(P);
      commit();
      sfx.tap();
      render();
      const filled = $$('.slot.filled');
      filled[filled.length - 1]?.classList.add('pop');
      if (r.full) later(showDeco, 700);
    }
  };
  function showDeco() {
    const o = document.createElement('div');
    o.className = 'overlay';
    const opts = sample(DECOS, 3);
    o.innerHTML = `<div class="deco-title">🎉</div><div class="three">${opts.map(d => `<button class="big-choice" data-d="${d}"><span>${d}</span></button>`).join('')}</div>`;
    $app.appendChild(o);
    speak('보드를 다 채웠어! 꾸미기를 하나 골라봐');
    o.onclick = e => {
      const b = e.target.closest('[data-d]');
      if (!b) return;
      E.completeBoard(P, b.dataset.d);
      commit();
      o.remove();
      render();
    };
  }
}

// ═════════ 자유 놀이 — 스티커 로직 없음 (P8 무보상 경로) ═════════
function showExplore() {
  clearTimers();
  screen = 'explore';
  armIdle(showProfiles);
  let mode = 'animal', count = 0;
  const SH = [['circle', '동그라미'], ['triangle', '세모'], ['square', '네모'], ['star', '별'], ['heart', '하트']];
  $app.innerHTML = `
  <div class="screen explore">
    <button class="home-btn" data-act="home" aria-label="돌아가기">🏠</button>
    <div class="modes"><button data-act="m" data-m="animal" class="on">🐾</button><button data-act="m" data-m="shape">🔷</button></div>
    <div class="field"></div>
  </div>`;
  const field = $('.field');
  speak('아무 데나 눌러봐');
  $app.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'home') showHome();
    if (b.dataset.act === 'm') {
      mode = b.dataset.m;
      count = 0;
      field.innerHTML = '';
      $$('.modes button').forEach(x => x.classList.toggle('on', x === b));
    }
  };
  $app.onpointerdown = e => {
    if (!e.target.closest('.field')) return;
    const r = field.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'drop';
    el.style.left = `${e.clientX - r.left}px`;
    el.style.top = `${e.clientY - r.top}px`;
    if (mode === 'animal') {
      if (count >= 10) { count = 0; field.innerHTML = ''; }
      count++;
      el.textContent = pick(['🐶', '🐱', '🐰', '🐻', '🐥', '🐸', '🐼', '🦊']);
      speak(count === 10 ? '열! 열 마리 모였다' : NATIVE[count]);
    } else {
      const [k, name] = pick(SH);
      el.innerHTML = A.shape(k, { fill: pick(Object.values(A.COLORS)) });
      el.classList.add('shape');
      speak(name);
      if (field.children.length > 20) field.firstElementChild.remove();
    }
    field.appendChild(el);
  };
}

// ═════════ 시작 ═════════
initVoice();
getPhotos().then(p => { photos = p; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
showProfiles();
