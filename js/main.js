// 아이 화면 — 난이도 고르기 / 풀이 / 스티커 모음
import { save, load, getPhotos } from './store.js';
import { initVoice, speak, hush, sfx, unlockAudio } from './audio.js';
import { RULES } from './config.js';
import { NATIVE, readKo, sleep, pick } from './util.js';
import { LEVELS, LEVEL } from './levels.js';
import * as G from './game.js';
import { allDesigns, designKey } from './stickers.js';
import { play as playAnim } from './anim.js';
import { openParent } from './parent.js';

const $app = document.getElementById('app');
const $ = sel => $app.querySelector(sel);
const $$ = sel => [...$app.querySelectorAll(sel)];

const S = load();
let photos = [];
let screen = '';
let busy = false;
let hintT = null;

const WRONG_LINES = ['음, 다시 한번 볼까?', '거의 다 왔어', '이거 헷갈리는 거 맞아'];
const commit = () => save(S);

document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  hush();
  if (screen === 'parent') showHome(); // 백그라운드로 가면 부모 화면 잠금
});

function stickerHTML(st) {
  if (st.kind === 'photo') {
    const p = photos.find(x => x.id === st.ref);
    return p ? `<img class="sp" src="${p.data}" alt="">` : `<span class="se">⭐</span>`;
  }
  return `<span class="se">${st.ref}</span>`;
}

// ── 부모 진입점: 우하단, 2초 길게 누르기 ──
function bindParentEntry() {
  const b = $('.parent-entry');
  if (!b) return;
  let t = null;
  const cancel = () => { clearTimeout(t); b.classList.remove('holding'); };
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    b.classList.add('holding');
    t = setTimeout(() => {
      cancel();
      hush();
      screen = 'parent';
      openParent($app, { S, commit, photos: () => photos, reloadPhotos: async () => { photos = await getPhotos(); }, exit: showHome, stickerHTML });
    }, RULES.parentHoldMs);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, cancel));
}

// ═════════ 처음 화면: 난이도만 고르기 ═════════
function showHome() {
  screen = 'home';
  clearTimeout(hintT);
  document.body.dataset.young = '';
  const designs = allDesigns(photos);
  const have = new Set(S.album.map(designKey));
  const got = designs.filter(d => have.has(designKey(d))).length;
  $app.innerHTML = `
  <div class="screen home">
    <h1 class="logo">우리집 산수</h1>
    <div class="levels">
      ${LEVELS.map(l => `
        <button class="lvcard" data-lv="${l.id}" style="background:${l.color}">
          <span class="lvi">${l.icon}</span>
          <span class="lva">${l.age}</span>
          <b>${l.title}</b>
        </button>`).join('')}
    </div>
    <button class="album-btn" data-act="album">🎒 스티커 모음 <b>${got}</b> / ${designs.length}</button>
    <button class="parent-entry" aria-label="보호자 메뉴">⚙️</button>
  </div>`;
  bindParentEntry();
  $app.onpointerdown = null;
  $app.onclick = e => {
    const lv = e.target.closest('[data-lv]');
    if (lv) return startLevel(lv.dataset.lv);
    if (e.target.closest('[data-act="album"]')) showAlbum();
  };
}

// ═════════ 풀이 ═════════
function startLevel(id) {
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  if (S.levelId !== id) S.cur = null;
  S.levelId = id;
  commit();
  const L = LEVEL[id];
  document.body.dataset.young = L.young ? '1' : '';
  screen = 'play';
  $app.innerHTML = `
  <div class="screen play">
    <button class="speak-btn" data-act="say" aria-label="다시 듣기">🔊</button>
    <div class="paws">${Array.from({ length: RULES.stickerEvery }, (_, i) => `<span class="paw${i < S.progress ? ' on' : ''}">🐾</span>`).join('')}<span class="goal">🎁</span></div>
    <button class="home-btn" data-act="home" aria-label="처음으로">🏠</button>
    <div class="stage"><div class="prompt"></div><div class="visual"></div></div>
    <div class="choices"></div>
    <div class="mascot">${L.icon}</div>
    <button class="hint-btn" data-act="hint" aria-label="도움" hidden>💡</button>
    <div class="bubble" hidden></div>
  </div>`;
  $app.onclick = onPlayClick;
  $app.onpointerdown = onCountTap;
  if (S.cur) renderProblem(true);
  else nextProblem();
}

function nextProblem() {
  G.nextQuestion(S);
  commit();
  renderProblem(false);
}

async function renderProblem(restored) {
  busy = false;
  clearTimeout(hintT);
  const c = S.cur, q = c.q, young = LEVEL[S.levelId].young;
  if (restored) c.t0 = Date.now();
  $('.prompt').textContent = young ? '' : q.text;
  $('.prompt').hidden = young;
  $('.visual').innerHTML = q.visual || '';
  $('.visual').classList.remove('glow');
  $('.choices').innerHTML = q.choices.map((o, i) => `<button class="ch" data-act="pick" data-i="${i}">${o.html}</button>`).join('');
  $('.hint-btn').hidden = !(restored && c.attempts > 0);
  $('.bubble').hidden = true;
  if (q.anim) {
    $('.choices').classList.add('wait');
    await playAnim($('.visual'), q.anim, speak);
    if (S.cur === c) $('.choices')?.classList.remove('wait');
  } else {
    $('.choices').classList.remove('wait');
    speak(q.say);
  }
}

function onPlayClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b || !S.cur && b.dataset.act !== 'home') return;
  switch (b.dataset.act) {
    case 'home': hush(); $('.visual')._tok = null; return showHome();
    case 'say': return replay();
    case 'hint': return doHint();
    case 'pick': if (!busy && !b.disabled) onPick(b); return;
  }
}

async function replay() {
  const q = S.cur.q;
  if (q.anim) {
    $('.choices').classList.add('wait');
    const c = S.cur;
    await playAnim($('.visual'), q.anim, speak);
    if (S.cur === c) $('.choices')?.classList.remove('wait');
  } else speak(q.say);
}

// 탭하며 세기: 누른 것에 표시가 남음
function onCountTap(e) {
  const t = e.target.closest('.cnt');
  if (!t || t.classList.contains('on') || busy) return;
  t.classList.add('on');
  const k = $$('.visual .cnt.on').length;
  speak(k <= 10 ? NATIVE[k] : readKo(k));
  if (S.cur) S.cur.counted = true;
  if (S.cur?.q.assist && k === $$('.visual .cnt').length) setTimeout(() => speak('다 세면 몇 개?'), 700);
}

function onPick(btn) {
  const q = S.cur.q;
  const r = G.answer(S, q.choices[+btn.dataset.i].v);
  commit();
  if (r.ok) onCorrect(btn);
  else onWrong(r.stage, btn);
}

// 틀렸을 때: 연회색으로 물러남 (빨강·흔들림 없음), 힌트는 3초 뒤
async function onWrong(stage, btn) {
  const young = LEVEL[S.levelId].young;
  if (!young) sfx.wrong();
  mascot('curious');
  if (!young) { btn.classList.add('out'); btn.disabled = true; }
  const line = pick(WRONG_LINES);
  bubble(line);
  await speak(line);
  if (!S.cur) return;
  if (stage === 'retry' && !young) return scheduleHint();
  if (stage === 'reduce' && !young) return reduceChoices();
  showConcrete();
  scheduleHint();
}

function scheduleHint() {
  clearTimeout(hintT);
  hintT = setTimeout(() => { const h = $('.hint-btn'); if (h && S.cur) { h.hidden = false; h.classList.add('appear'); } }, RULES.hintDelayMs);
}
function doHint() {
  if (!S.cur) return;
  S.cur.hinted = true;
  commit();
  const q = S.cur.q;
  speak(q.hint?.say);
  $('.visual').classList.add('glow');
}
// 두 번째 오답: 동물 모션을 다시 보여주거나 구체물 등장
function showConcrete() {
  const q = S.cur.q;
  if (q.anim) return replay();
  if (q.concrete) $('.visual').innerHTML = q.concrete;
  else if (q.assist) assistCount(q.assist);
  else doHint();
}
async function assistCount(n) {
  for (const el of $$('.visual .cnt:not(.on)').slice(0, n)) {
    await sleep(500);
    el.classList.add('on');
    speak(NATIVE[$$('.visual .cnt.on').length]);
  }
}
function reduceChoices() {
  const q = S.cur.q;
  const btns = $$('.ch[data-act="pick"]:not(:disabled)');
  const ans = btns.find(b => q.choices[+b.dataset.i].v === q.answer);
  btns.filter(b => b !== ans).slice(1).forEach(b => { b.classList.add('gone'); b.disabled = true; });
}

async function onCorrect(btn) {
  busy = true;
  clearTimeout(hintT);
  $('.visual')._tok = null; // 진행 중인 모션 멈춤
  btn.classList.add('right');
  sfx.right();
  mascot('happy');
  const q = S.cur.q;
  const out = G.complete(S, photos);
  commit();
  $('.hint-btn').hidden = true;
  if (q.after) await speak(q.after);
  bubble(out.praise, 2000);
  // 발자국 채우기
  const paws = $$('.paw');
  const filled = out.sticker ? RULES.stickerEvery : S.progress;
  paws.forEach((p, i) => p.classList.toggle('on', i < filled));
  paws[filled - 1]?.classList.add('just');
  await Promise.all([speak(out.praise), sleep(RULES.feedbackMs)]);
  if (screen !== 'play') return;
  if (out.sticker) {
    await revealSticker(out.sticker);
    paws.forEach(p => p.classList.remove('on', 'just'));
  }
  if (out.levelUp) { toast('✨ 한 단계 올라갔어!'); await speak('한 단계 올라갔어!'); }
  if (screen === 'play') nextProblem();
}

function revealSticker(st) {
  return new Promise(res => {
    const el = document.createElement('div');
    el.className = 'stk-pop';
    el.innerHTML = `<div class="stk-card"><div class="stk${st.sparkle ? ' sparkle' : ''}">${stickerHTML(st)}</div>${st.isNew ? '<div class="new-badge">NEW!</div>' : ''}<p>스티커를 받았어!</p></div>`;
    document.body.appendChild(el);
    sfx.sticker();
    speak(st.isNew ? '새 스티커를 받았어! 모음에 넣어둘게' : '스티커를 받았어!');
    setTimeout(() => el.classList.add('away'), RULES.stickerMs - 500);
    setTimeout(() => { el.remove(); res(); }, RULES.stickerMs);
  });
}

function mascot(state) {
  const m = $('.mascot');
  if (!m) return;
  m.className = `mascot ${state}`;
  setTimeout(() => { if (m.isConnected) m.className = 'mascot'; }, 1300);
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
  setTimeout(() => t.remove(), 2400);
}

// ═════════ 스티커 모음 ═════════
function showAlbum() {
  screen = 'album';
  const designs = allDesigns(photos);
  const count = {};
  const sparkle = {};
  for (const s of S.album) { const k = designKey(s); count[k] = (count[k] || 0) + 1; if (s.sparkle) sparkle[k] = true; }
  const got = designs.filter(d => count[designKey(d)]).length;
  $app.innerHTML = `
  <div class="screen album">
    <button class="home-btn" data-act="home" aria-label="처음으로">🏠</button>
    <h2>🎒 내 스티커 모음 <span>${got} / ${designs.length}</span></h2>
    <div class="abar"><i style="width:${(got / designs.length) * 100}%"></i></div>
    <div class="agrid">
      ${designs.map(d => {
        const k = designKey(d), n = count[k];
        return n
          ? `<div class="acell got${sparkle[k] ? ' sparkle' : ''}">${stickerHTML(d)}${n > 1 ? `<small>×${n}</small>` : ''}</div>`
          : `<div class="acell">?</div>`;
      }).join('')}
    </div>
    <p class="atotal">지금까지 받은 스티커 ${S.album.length}장 · 7문제마다 1장</p>
  </div>`;
  speak(got ? `스티커 ${got}개를 모았어!` : '문제를 풀면 스티커를 모을 수 있어');
  $app.onpointerdown = null;
  $app.onclick = e => { if (e.target.closest('[data-act="home"]')) showHome(); };
}

// ═════════ 시작 ═════════
initVoice();
getPhotos().then(p => { photos = p; if (screen === 'home') showHome(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
showHome();
