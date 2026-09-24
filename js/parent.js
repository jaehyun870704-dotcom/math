// 부모 화면 (§10) — 3중 잠금 뒤에만 열림
import { RULES, AGE } from './config.js';
import { UNIT, AREA_SEQ, AREA_NAME, LEVEL_NAME, UNITS } from './curriculum.js';
import * as E from './engine.js';
import { int, shuffle, dayKey, DAY, ageGroup, uid } from './util.js';
import { putPhoto, deletePhoto } from './store.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hm = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const mins = ms => Math.round((ms || 0) / 60000);

let idle = null;
let view = { pid: null, tab: 'today' };

export function openParent(root, api) {
  api.setScreen('parent');
  showGate(root, api);
}

function armLock(root, api) {
  const reset = () => { clearTimeout(idle); idle = setTimeout(() => api.exit(), RULES.parentIdleLockMs); };
  root.onpointerdown = reset;
  reset();
}

// ── 3층: 연산 게이트 (두 자리 × 한 자리, 매번 난수 + 키패드 셔플) ──
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
    <p class="gmsg"></p>
  </div>`;
  const out = root.querySelector('.gin');
  root.onclick = e => {
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k == null) return;
    if (k === 'back') return api.exit();
    if (k === 'del') input = input.slice(0, -1);
    else if (k === 'ok') {
      if (+input === a * b) {
        g.fails = 0;
        api.commit();
        return showDash(root, api);
      }
      g.fails++;
      if (g.fails >= RULES.gateMaxFails) { g.fails = 0; g.lockUntil = Date.now() + RULES.gateFailLockMs; }
      api.commit();
      return showGate(root, api);
    } else if (input.length < 4) input += k;
    out.textContent = input || ' ';
  };
}

// ── 대시보드 ──
const TABS = [['today', '오늘'], ['week', '주간'], ['mastery', '진도'], ['stuck', '막힌 곳'], ['alerts', '알림'], ['stickers', '스티커 꾸미기'], ['missions', '미션 카드'], ['settings', '설정']];

function showDash(root, api) {
  armLock(root, api);
  const S = api.S;
  if (!S.profiles[view.pid]) view.pid = S.order[0] || null;
  const P = S.profiles[view.pid];
  const tabs = P ? TABS : [['settings', '설정']];
  if (!P) view.tab = 'settings';
  root.innerHTML = `
  <div class="screen parent">
    <header>
      <h2>보호자 화면</h2>
      ${S.order.length ? `<select class="psel">${S.order.map(id => `<option value="${id}" ${id === view.pid ? 'selected' : ''}>${S.profiles[id].animal} ${esc(S.profiles[id].name)} (만 ${S.profiles[id].age}세)</option>`).join('')}</select>` : ''}
      <button class="btn" data-a="lock">🔒 잠그기</button>
    </header>
    <nav>${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === view.tab ? 'on' : ''}">${l}</button>`).join('')}</nav>
    <main class="pmain">${P || view.tab === 'settings' ? render[view.tab](P, api) : ''}</main>
  </div>`;
  root.querySelector('.psel')?.addEventListener('change', e => { view.pid = e.target.value; showDash(root, api); });
  root.onclick = e => {
    const t = e.target.closest('[data-tab]');
    if (t) { view.tab = t.dataset.tab; return showDash(root, api); }
    const a = e.target.closest('[data-a]');
    if (a) act(a.dataset.a, a, root, api, P);
  };
  root.querySelectorAll('[data-change]').forEach(el => el.addEventListener('change', () => act(el.dataset.change, el, root, api, P)));
}

function card(title, body) { return `<section class="card"><h3>${title}</h3>${body}</section>`; }
function kv(list) { return `<dl class="kv">${list.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`; }
function lastDays(n, off = 0) { return Array.from({ length: n }, (_, i) => dayKey(Date.now() - (i + off) * DAY)).reverse(); }

const render = {
  today(P) {
    const d = P.days[dayKey()] || {};
    const acc = d.problems ? Math.round((d.correct / d.problems) * 100) : 0;
    const g = E.cfgOf(P);
    const lines = [
      ['착석', `${d.seatings || 0}회`],
      ['총 시간', `${mins(d.activeMs)}분 <small>(권장 한 번에 ${g.recommend})</small>`],
      ['마지막 학습', d.lastAt ? hm(d.lastAt) : '-'],
      ['푼 문제', `${d.problems || 0}문제`],
      ['받은 스티커', `${d.stickers || 0}장 <small>(하루 상한 ${g.dayCap}장)</small>`],
    ];
    if (d.capHit) lines.push(['상한', `<b>상한 도달, 이후 ${d.afterCap}문제 추가 진행</b>`]);
    if (P.together && P.age <= 4) lines.push(['함께하기', `혼자 진행한 구간(추정) ${d.solo || 0}문제`]);
    if (d.earlyExits) lines.push(['일찍 끝냄', `${d.earlyExits}회`]);
    return card('오늘', kv(lines) + `<details><summary>정답률 보기</summary><p>첫 시도 정답 ${d.correct || 0}/${d.problems || 0} (${acc}%) — 아이에게는 보이지 않습니다.</p></details>`);
  },

  week(P) {
    const days = lastDays(7);
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];
    const stamps = days.map(k => {
      const d = P.days[k];
      const dow = DOW[new Date(k + 'T12:00').getDay()];
      return `<div class="stamp ${d?.problems ? 'on' : ''}"><b>${dow}</b><span>${d?.problems ? '🐾' : '·'}</span><small>${d ? mins(d.activeMs) + '분' : ''}</small></div>`;
    }).join('');
    const sum = (ks, f) => ks.reduce((s, k) => s + (P.days[k]?.[f] || 0), 0);
    const prev = lastDays(7, 7);
    const trend = sum(days, 'problems') - sum(prev, 'problems');
    return card('주간 도장', `<div class="stamps">${stamps}</div>` + kv([
      ['총 시간', `${mins(sum(days, 'activeMs'))}분`],
      ['착석', `${sum(days, 'seatings')}회`],
    ])) + card('동기 상태', kv([
      ['최근 7일', `${sum(days, 'problems')}문제`],
      ['이전 7일', `${sum(prev, 'problems')}문제 <small>(${trend >= 0 ? '+' : ''}${trend})</small>`],
      ['조기 종료', `최근 7일 ${sum(days, 'earlyExits')}회 <small>(5문제 전에 스스로 끝낸 횟수)</small>`],
    ]));
  },

  mastery(P) {
    const cur = E.currentUnit(P, 'num');
    let html = card('지금 단계', `<p>${cur ? `${UNIT[cur].level} ${LEVEL_NAME[UNIT[cur].level]} — <b>${UNIT[cur].name}</b>` : '수와 연산 전 단원 통과'}</p>`);
    for (const area of ['num', 'shape', 'pattern', 'data']) {
      const seq = AREA_SEQ[area];
      const done = seq.filter(id => E.isPassed(P, id)).length;
      const now = E.currentUnit(P, area);
      const rows = seq.map(id => {
        const u = P.units[id];
        const passed = u?.passed;
        const st = passed ? (u.assumed ? '<span class="chip-s skip">건너뜀</span>' : '<span class="chip-s ok">통과</span>')
          : id === now ? `<span class="chip-s now">진행 중 · ${u?.n || 0}문제 · 최근 ${u?.win.filter(x => x.c).length || 0}/${u?.win.length || 0}${u?.deferred ? ' · 다음 착석에 통과' : ''}</span>`
          : E.available(P, id, area) ? '<span class="chip-s">대기</span>' : '<span class="chip-s lock">잠김</span>';
        return `<li><span>${id} ${UNIT[id].name}</span>${st}</li>`;
      }).join('');
      html += card(`${AREA_NAME[area]} <small>${done}/${seq.length}</small>`, `<div class="bar"><i style="width:${(done / seq.length) * 100}%"></i></div><details><summary>단원 보기</summary><ul class="ulist">${rows}</ul></details>`);
    }
    return html;
  },

  stuck(P) {
    const hard = [];
    for (const area of ['num', 'shape', 'pattern', 'data']) {
      const id = E.currentUnit(P, area);
      const u = id && P.units[id];
      if (u && u.win.length >= 5 && u.win.filter(x => x.c).length / u.win.length < 0.6) hard.push(id);
    }
    for (const id of Object.keys(P.flags)) if (!hard.includes(id)) hard.push(id);
    const stuck = hard.length
      ? `<ul class="ulist">${hard.map(id => `<li><span><b>${UNIT[id].name}</b>${P.flags[id] ? ' <span class="chip-s lock">3세션 연속</span>' : ''}<br><small>🏠 집에서: ${UNIT[id].home || '생활 속에서 함께 세어 보기'}</small></span></li>`).join('')}</ul>`
      : '<p>지금 특별히 어려워하는 단원은 없어요.</p>';
    const wl = P.wrongLog.length
      ? `<ul class="ulist">${P.wrongLog.map(w => `<li><span>${hm(w.at)} · ${UNIT[w.unit]?.name || w.unit}<br><small>${esc(w.text)} → 정답 ${esc(w.answer)} (${w.tries}번 만에)</small></span></li>`).join('')}</ul>`
      : '<p>기록이 없어요.</p>';
    return card('지금 어려워하는 것', stuck) + card('최근 오답 20개', wl);
  },

  alerts(P) {
    const list = P.events.length
      ? `<ul class="ulist">${P.events.map(e => `<li><span>${hm(e.at)} · ${esc(e.text)}</span></li>`).join('')}</ul>`
      : '<p>알림이 없어요.</p>';
    return card('알림', list + '<p class="sub">보드 완성 알림이 오면 실물 보상 타이밍이에요. 아이 화면에는 경고나 알림을 띄우지 않습니다.</p>');
  },

  stickers(P, api) {
    const ph = api.photos();
    const list = ph.map(p => `
      <li class="phrow">
        <img class="sp small" src="${p.data}" alt="">
        <span>${esc(p.name)}</span>
        <select data-change="weight" data-id="${p.id}">
          ${[['low', '낮음'], ['mid', '보통'], ['high', '높음']].map(([k, l]) => `<option value="${k}" ${p.weight === k ? 'selected' : ''}>등장 ${l}</option>`).join('')}
        </select>
        <button class="btn" data-a="delphoto" data-id="${p.id}">삭제</button>
      </li>`).join('');
    return card(`내 사진 스티커 <small>${ph.length}/${RULES.photoMax}</small>`, `
      <p class="sub">PNG·JPG·WebP / 권장 512×512 이상 정사각 / 5MB 초과 시 자동 축소 / 이 기기에만 저장 (서버 업로드 없음)</p>
      <label class="btn primary file">+ 내 사진 넣기<input type="file" accept="image/png,image/jpeg,image/webp" data-change="photo" hidden></label>
      <ul class="ulist">${list}</ul>`) +
      card('완성한 보드', P.boards.length ? `<div class="stamps">${P.boards.map(b => `<div class="stamp on"><b>${b.deco}</b><small>${hm(b.at)}</small></div>`).join('')}</div>` : '<p>아직 없어요.</p>');
  },

  missions(P) {
    const cards = UNITS.filter(u => u.mission);
    const near = new Set(['num', 'shape', 'pattern', 'data'].map(a => E.currentUnit(P, a)));
    return card('실물 감각 미션 카드', `<p class="sub">탭으로는 안 되는 활동이에요. 앱 밖에서 함께 해 주세요.</p><ul class="ulist">${cards.map(u => `<li><span>${near.has(u.id) ? '⭐ ' : ''}<b>${u.name}</b><br><small>${u.mission}</small></span></li>`).join('')}</ul>`);
  },

  settings(P) {
    let html = '';
    if (P) {
      const g = ageGroup(P.age);
      html += card('프로필', `
        <div class="frow"><label>이름 <input data-change="name" value="${esc(P.name)}" maxlength="8"></label></div>
        <div class="frow"><label>만 나이 <select data-change="age">${[4, 5, 6, 7, 8].map(a => `<option ${a === P.age ? 'selected' : ''}>${a}</option>`).join('')}</select></label></div>
        <div class="frow"><label><input type="checkbox" data-change="together" ${P.together ? 'checked' : ''} ${g === 'g4' ? 'disabled' : ''}> 함께하기 모드 ${g === 'g4' ? '<small>(만 4세는 해제 불가)</small>' : ''}</label></div>
        <div class="frow"><label>시간 제한 <select data-change="limit">${[0, 10, 15, 20, 30].map(m => `<option value="${m}" ${P.timeLimitMin === m ? 'selected' : ''}>${m ? m + '분 (2분 전 예고)' : '끔 — 강제 종료 없음'}</option>`).join('')}</select></label></div>
        <p class="sub">권장 착석 ${AGE[g].recommend} · 쉼터 ${AGE[g].rest[0]}분/${AGE[g].rest[1]}분 · 알림 ${AGE[g].rest[2]}분</p>
        <div class="row"><button class="btn" data-a="rediag">진단 다시 하기</button><button class="btn danger" data-a="delprofile">프로필 삭제</button></div>`);
    }
    html += card('가족', '<button class="btn primary" data-a="addprofile">+ 아이 프로필 추가</button>');
    html += card('기기 설정 안내', `
      <p>아이가 다른 앱으로 나가지 않게 OS 기능을 켜 두세요.</p>
      <ul class="ulist"><li><span><b>iPad</b> 설정 › 손쉬운 사용 › 사용법 유도(가이드 접근) 켜기 → 앱에서 측면 버튼 3번</span></li>
      <li><span><b>안드로이드</b> 설정 › 보안 › 앱 고정 켜기 → 최근 앱에서 고정</span></li>
      <li><span>브라우저 메뉴 › <b>홈 화면에 추가</b> 하면 전체 화면으로 열려요.</span></li></ul>
      <button class="btn" data-a="exitfs">전체 화면 나가기</button>`);
    return html;
  },
};

async function act(a, el, root, api, P) {
  const S = api.S;
  switch (a) {
    case 'lock': clearTimeout(idle); return api.exit();
    case 'addprofile': clearTimeout(idle); return api.addProfile();
    case 'exitfs': try { await document.exitFullscreen?.(); } catch {} return;
    case 'name': P.name = el.value.trim() || P.name; break;
    case 'age': {
      P.age = +el.value;
      if (ageGroup(P.age) === 'g4') P.together = true;
      break;
    }
    case 'together': P.together = el.checked; break;
    case 'limit': P.timeLimitMin = +el.value; break;
    case 'rediag':
      if (!confirm('진단을 다시 하면 진도 기록이 처음부터 다시 시작돼요. 스티커와 보드는 그대로예요. 할까요?')) return;
      P.units = {}; P.diagDone = false; P.diag = null; P.seating = null; P.cur = null; P.reviewQueue = [];
      break;
    case 'delprofile':
      if (!confirm(`${P.name} 프로필을 삭제할까요? 되돌릴 수 없어요.`)) return;
      delete S.profiles[P.id];
      S.order = S.order.filter(id => id !== P.id);
      view.pid = null;
      break;
    case 'weight': {
      const p = api.photos().find(x => x.id === el.dataset.id);
      if (p) { p.weight = el.value; await putPhoto(p); await api.reloadPhotos(); }
      return;
    }
    case 'delphoto':
      if (!confirm('이 사진 스티커를 지울까요? 이미 붙인 자리는 별 모양으로 바뀌어요.')) return;
      await deletePhoto(el.dataset.id);
      await api.reloadPhotos();
      break;
    case 'photo': {
      const f = el.files?.[0];
      el.value = '';
      if (f) return cropFlow(f, root, api);
      return;
    }
  }
  api.commit();
  showDash(root, api);
}

// ── 사진 → 원형 크롭 → 512×512 WebP ──
function cropFlow(file, root, api) {
  if (api.photos().length >= RULES.photoMax) return alert(`사진은 ${RULES.photoMax}개까지 넣을 수 있어요.`);
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return alert('PNG, JPG, WebP만 넣을 수 있어요.');
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const minSide = Math.min(img.width, img.height);
    const notes = [];
    if (minSide < RULES.photoMinSide) notes.push(`사진이 작아요 (${img.width}×${img.height}). 흐리게 보일 수 있어요.`);
    if (file.size > RULES.photoMaxBytes) notes.push('5MB가 넘어서 자동으로 줄여서 저장해요.');
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
      showDash(root, api);
    };
  };
  img.onerror = () => alert('사진을 열 수 없어요.');
  img.src = url;
}
