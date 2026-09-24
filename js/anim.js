// 더하기·빼기·곱하기 동물(블록) 모션
import { sleep, eul } from './util.js';
import { sfx } from './audio.js';

const ADJ = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
// 세는 말: 3 → "세", 12 → "열두", 20 → "스무"
export const cnt = n => (n === 20 ? '스무' : TENS[Math.floor(n / 10)] + ADJ[n % 10]);
const iga = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? '이' : '가'); };

// el 안에서 an을 재생. 다시 재생하면 이전 재생은 멈춤
export async function play(el, an, say) {
  const tok = {};
  el._tok = tok;
  const alive = () => el._tok === tok && el.isConnected;
  const step = (text, ms = 500) => (alive() ? Promise.all([say(text), sleep(ms)]) : Promise.resolve());
  const wait = ms => sleep(ms);
  if (an.type === 'add' || an.type === 'sub') await animals(el, an, step, wait, alive);
  else if (an.type === 'mul') await groups(el, an, step, wait, alive);
  else await blocks(el, an, step, wait, alive);
  return alive();
}

function span(parent, cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  if (text) s.textContent = text;
  parent.appendChild(s);
  return s;
}

async function animals(el, { type, a, b, e, name }, step, wait, alive) {
  const add = type === 'add';
  const n = add ? a + b : a;
  el.innerHTML = `<div class="zoo ${n > 30 ? 'xs' : n > 20 ? 's' : n > 10 ? 'm' : 'l'}"></div>`;
  const gap = b > 10 ? 120 : 330; // 많이 들어오거나 떠날 때는 빠르게
  const zoo = el.firstChild;
  const base = [];
  for (let i = 0; i < a; i++) base.push(span(zoo, 'an cnt pop', e));
  await step(a ? `${iga(name)} ${cnt(a)} 마리 있어` : `아직 ${iga(name)} 없어`, 700);
  if (!alive()) return;
  if (add) {
    for (let i = 0; i < b; i++) {
      if (!alive()) return;
      span(zoo, 'an cnt new hop', e);
      sfx.tap();
      await wait(gap);
    }
    await step(b ? `${cnt(b)} 마리가 더 왔어!` : '아무도 안 왔어!', 600);
    await step('모두 몇 마리일까?', 100);
  } else {
    const leaving = base.slice(a - b);
    for (const s of leaving) {
      if (!alive()) return;
      s.classList.remove('cnt');
      s.classList.add('bye');
      sfx.tap();
      await wait(gap);
    }
    if (b) await wait(700);
    await step(b ? `${cnt(b)} 마리가 집에 갔어` : '아무도 안 갔어', 600);
    await step('남은 건 몇 마리일까?', 100);
  }
}

async function groups(el, { a, b, e, name }, step, wait, alive) {
  const n = a * b;
  el.innerHTML = `<div class="zoo groups ${n > 45 ? 's' : n > 20 ? 'm' : 'l'}"></div>`;
  const zoo = el.firstChild;
  await step(`${iga(name)} ${cnt(a)} 마리씩 와요`, 300);
  for (let i = 0; i < b; i++) {
    if (!alive()) return;
    const g = span(zoo, 'grp pop');
    for (let k = 0; k < a; k++) span(g, 'an cnt', e);
    sfx.tap();
    await wait(550);
  }
  await step(`${cnt(a)} 마리씩 ${cnt(b)} 묶음이야`, 500);
  await step('모두 몇 마리일까?', 100);
}

async function blocks(el, { type, a, b }, step, wait, alive) {
  const add = type === 'badd';
  el.innerHTML = `<div class="blk"><div class="bt"></div><div class="bo"></div></div>`;
  const T = el.querySelector('.bt'), O = el.querySelector('.bo');
  const put = (n, box, cls) => Array.from({ length: n }, () => span(box, cls));
  put(Math.floor(a / 10), T, 'rod pop');
  put(a % 10, O, 'cube pop');
  if (add) {
    await step(`${a}에 ${b}${eul(b)} 더해볼까?`, 600);
    for (const s of [...put(Math.floor(b / 10), T, 'rod new hop'), ...put(b % 10, O, 'cube new hop')]) {
      if (!alive()) return;
      sfx.tap();
      await wait(180);
      s.dataset.x = 1;
    }
    await wait(500);
    if ((a % 10) + (b % 10) >= 10 && alive()) {
      const ten = [...O.children].slice(0, 10);
      ten.forEach(c => c.classList.add('gather'));
      await step('낱개 열 개는 십 묶음 하나!', 900);
      ten.forEach(c => c.remove());
      span(T, 'rod made pop');
      sfx.tap();
      await wait(500);
    }
    await step('모두 얼마일까?', 100);
  } else {
    await step(`${a}에서 ${b}${eul(b)} 빼볼까?`, 600);
    if ((a % 10) < (b % 10) && alive()) {
      const rods = T.querySelectorAll('.rod');
      const r = rods[rods.length - 1];
      r.classList.add('break');
      await step('십 묶음 하나를 풀어서 낱개 열 개로!', 800);
      r.remove();
      put(10, O, 'cube made pop');
      sfx.tap();
      await wait(600);
    }
    const cubes = [...O.children].slice(-(b % 10) || O.children.length);
    const rods = [...T.children].slice(T.children.length - Math.floor(b / 10));
    for (const s of [...(b % 10 ? cubes : []), ...rods]) {
      if (!alive()) return;
      s.classList.add('bye');
      sfx.tap();
      await wait(200);
    }
    await wait(500);
    await step(`${b}${eul(b)} 뺐어. 남은 건 얼마일까?`, 100);
  }
}
