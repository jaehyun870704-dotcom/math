// 보호자 화면 — 우하단 2초 길게 누르기 + 곱셈 확인 뒤에만 열림
import { RULES } from './config.js';
import { LEVELS } from './levels.js';
import { allDesigns, designKey } from './stickers.js';
import { newState } from './game.js';
import { int, shuffle, uid } from './util.js';
import { putPhoto, deletePhoto } from './store.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STEP = ['쉬움', '보통', '어려움'];
let idle = null;

export function openParent(root, api) {
  showGate(root, api);
}

function armLock(root, api) {
  const reset = () => { clearTimeout(idle); idle = setTimeout(() => api.exit(), RULES.parentIdleLockMs); };
  root.onpointerdown = reset;
  reset();
}

// 두 자리 × 한 자리 (매번 새 문제 + 숫자판 섞기). 3번 틀리면 60초 잠금
function showGate(root, api) {
  const g = api.S.gate;
  const left = g.lockUntil - Date.now();
  root.onpointerdown = null;
  if (left > 0) {
    root.innerHTML = `<div class="screen gate"><p class="gq">잠시 후 다시 해 주세요</p><p class="gmsg">${Math.ceil(left / 1000)}초</p><button class="btn" data-k="back">돌아가기</button></div>`;
    root.onclick = e => { if (e.target.closest('[data-k="back"]')) { clearTimeout(idle); api.exit(); } };
    idle = setTimeout(() => { if (root.querySelector('.gate')) showGate(root, api); }, 1000);
    return;
  }
  const a = int(23, 89), b = int(6, 9);
  let input = '';
  const keys = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  root.innerHTML = `
  <div class="screen gate">
    <p class="sub">보호자 확인</p>
    <p class="gq">${a} × ${b} = ?</p>
    <div class="gin">&nbsp;</div>
    <div class="keypad">${keys.map(k => `<button data-k="${k}">${k}</button>`).join('')}<button data-k="del">⌫</button><button data-k="ok" class="primary">확인</button></div>
    <button class="btn" data-k="back">돌아가기</button>
  </div>`;
  const out = root.querySelector('.gin');
  root.onclick = e => {
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k == null) return;
    if (k === 'back') return api.exit();
    if (k === 'del') input = input.slice(0, -1);
    else if (k === 'ok') {
      if (+input === a * b) { g.fails = 0; api.commit(); return showPanel(root, api); }
      if (++g.fails >= RULES.gateMaxFails) { g.fails = 0; g.lockUntil = Date.now() + RULES.gateFailLockMs; }
      api.commit();
      return showGate(root, api);
    } else if (input.length < 4) input += k;
    out.textContent = input || ' ';
  };
}

function card(title, body) { return `<section class="card"><h3>${title}</h3>${body}</section>`; }

function showPanel(root, api) {
  armLock(root, api);
  const S = api.S, ph = api.photos();
  const designs = allDesigns(ph);
  const have = new Set(S.album.map(designKey));
  const got = designs.filter(d => have.has(designKey(d))).length;
  const rows = LEVELS.map(l => {
    const st = S.lv[l.id];
    return `<li><span>${l.icon} ${l.age} · ${l.title}</span><span>${st ? `${st.solved}문제 · ${STEP[st.diff]}` : '-'}</span></li>`;
  }).join('');
  const photos = ph.map(p => `
    <li class="phrow">
      <img class="sp small" src="${p.data}" alt="">
      <span>${esc(p.name)}</span>
      <select data-change="weight" data-id="${p.id}">
        ${[['low', '낮음'], ['mid', '보통'], ['high', '높음']].map(([k, t]) => `<option value="${k}" ${p.weight === k ? 'selected' : ''}>나올 확률 ${t}</option>`).join('')}
      </select>
      <button class="btn" data-a="delphoto" data-id="${p.id}">삭제</button>
    </li>`).join('');
  root.innerHTML = `
  <div class="screen parent">
    <header><h2>보호자 화면</h2><button class="btn" data-a="lock">🔒 잠그기</button></header>
    <main class="pmain">
      ${card('기록', `<p>푼 문제 모두 <b>${S.total}</b>문제 · 스티커 <b>${S.album.length}</b>장 (모음 ${got}/${designs.length}종)</p>
        <ul class="ulist">${rows}</ul>
        <p class="sub">난이도 안에서 5문제 연속으로 한 번에 맞히면 한 단계 어려워지고, 2문제 연속 틀리면 한 단계 쉬워져요.</p>`)}
      ${card(`내 사진 스티커 <small>${ph.length}/${RULES.photoMax}</small>`, `
        <p class="sub">가족 사진을 넣으면 스티커로 나와요. PNG·JPG·WebP, 이 기기에만 저장돼요.</p>
        <label class="btn primary file">+ 내 사진 넣기<input type="file" accept="image/png,image/jpeg,image/webp" data-change="photo" hidden></label>
        <ul class="ulist">${photos}</ul>`)}
      ${card('초기화', `<div class="row" style="justify-content:flex-start">
        <button class="btn" data-a="resetlv">난이도 진행만 처음으로</button>
        <button class="btn danger" data-a="resetall">스티커까지 모두 지우기</button></div>`)}
      ${card('기기 설정 안내', `<ul class="ulist">
        <li><span><b>iPad</b> 설정 › 손쉬운 사용 › 사용법 유도 켜기 → 앱에서 측면 버튼 3번</span></li>
        <li><span><b>안드로이드</b> 설정 › 보안 › 앱 고정</span></li>
        <li><span>브라우저 메뉴 › <b>홈 화면에 추가</b>하면 전체 화면으로 열려요.</span></li></ul>
        <button class="btn" data-a="exitfs">전체 화면 나가기</button>`)}
    </main>
  </div>`;
  root.onclick = e => { const a = e.target.closest('[data-a]'); if (a) act(a.dataset.a, a, root, api); };
  root.querySelectorAll('[data-change]').forEach(el => el.addEventListener('change', () => act(el.dataset.change, el, root, api)));
}

async function act(a, el, root, api) {
  const S = api.S;
  switch (a) {
    case 'lock': clearTimeout(idle); return api.exit();
    case 'exitfs': try { await document.exitFullscreen?.(); } catch {} return;
    case 'resetlv':
      if (!confirm('모든 난이도의 진행을 처음(쉬움)으로 돌릴까요? 스티커는 그대로예요.')) return;
      S.lv = {}; S.cur = null;
      break;
    case 'resetall':
      if (!confirm('스티커 모음과 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
      Object.assign(S, newState());
      break;
    case 'weight': {
      const p = api.photos().find(x => x.id === el.dataset.id);
      if (p) { p.weight = el.value; await putPhoto(p); await api.reloadPhotos(); }
      return;
    }
    case 'delphoto':
      if (!confirm('이 사진 스티커를 지울까요? 이미 받은 자리는 별로 바뀌어요.')) return;
      await deletePhoto(el.dataset.id);
      await api.reloadPhotos();
      break;
    case 'photo': {
      const f = el.files?.[0];
      el.value = '';
      if (f) cropFlow(f, root, api);
      return;
    }
  }
  api.commit();
  showPanel(root, api);
}

// 사진 → 원형으로 자르기 → 512×512 WebP
function cropFlow(file, root, api) {
  if (api.photos().length >= RULES.photoMax) return alert(`사진은 ${RULES.photoMax}개까지 넣을 수 있어요.`);
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return alert('PNG, JPG, WebP만 넣을 수 있어요.');
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const minSide = Math.min(img.width, img.height);
    const notes = [];
    if (minSide < RULES.photoMinSide) notes.push(`사진이 작아요 (${img.width}×${img.height}). 흐리게 보일 수 있어요.`);
    if (file.size > RULES.photoMaxBytes) notes.push('5MB가 넘어서 줄여서 저장해요.');
    const V = 280;
    let zoom = 1, cx = img.width / 2, cy = img.height / 2;
    const o = document.createElement('div');
    o.className = 'overlay crop';
    o.innerHTML = `
      <div class="crop-box">
        <div class="crop-view"><canvas width="${V}" height="${V}"></canvas><div class="crop-ring"></div></div>
        <label>확대 <input type="range" min="1" max="3" step="0.05" value="1"></label>
        <label>이름 <input class="cname" maxlength="10" placeholder="예: 할머니"></label>
        ${notes.map(n => `<p class="warn">${n}</p>`).join('')}
        <div class="row"><button class="btn" data-c="cancel">취소</button><button class="btn primary" data-c="save">저장</button></div>
      </div>`;
    root.appendChild(o);
    const cv = o.querySelector('canvas'), ctx = cv.getContext('2d');
    const clamp = () => {
      const half = minSide / zoom / 2;
      cx = Math.min(Math.max(cx, half), img.width - half);
      cy = Math.min(Math.max(cy, half), img.height - half);
    };
    const draw = (c, size) => {
      const s = size / (minSide / zoom);
      c.clearRect(0, 0, size, size);
      c.drawImage(img, size / 2 - cx * s, size / 2 - cy * s, img.width * s, img.height * s);
    };
    draw(ctx, V);
    let drag = null;
    cv.onpointerdown = e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => {
      if (!drag) return;
      const s = V / (minSide / zoom);
      cx -= (e.clientX - drag[0]) / s;
      cy -= (e.clientY - drag[1]) / s;
      drag = [e.clientX, e.clientY];
      clamp();
      draw(ctx, V);
    };
    cv.onpointerup = () => { drag = null; };
    o.querySelector('input[type=range]').oninput = e => { zoom = +e.target.value; clamp(); draw(ctx, V); };
    o.onclick = async e => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      if (b.dataset.c === 'save') {
        const out = document.createElement('canvas');
        out.width = out.height = RULES.photoSize;
        draw(out.getContext('2d'), RULES.photoSize);
        let data = out.toDataURL('image/webp', 0.85);
        if (!data.startsWith('data:image/webp')) data = out.toDataURL('image/jpeg', 0.9);
        const name = o.querySelector('.cname').value.trim() || '내 사진';
        await putPhoto({ id: uid(), name, weight: 'mid', data, created: Date.now() });
        await api.reloadPhotos();
      }
      URL.revokeObjectURL(url);
      o.remove();
      showPanel(root, api);
    };
  };
  img.onerror = () => alert('사진을 열 수 없어요.');
  img.src = url;
}
