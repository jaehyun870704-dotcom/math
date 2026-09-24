// 그림 요소 — HTML/SVG 문자열만 만든다 (DOM 불필요)
import { rand, shuffle, int } from './util.js';

export const COLORS = {
  red: '#EF6461', blue: '#4E8CF7', yellow: '#F6C343', green: '#48B87E',
  purple: '#9B7BEA', orange: '#F59B42', pink: '#F48FB1', teal: '#34B3B0',
};
export const COLOR_KO = { red: '빨간', blue: '파란', yellow: '노란', green: '초록' };

const f1 = v => (Math.round(v * 10) / 10).toString();

// ── 물건 늘어놓기 ───────────────────────────────
// layout: 'grid'(5개씩 줄) | 'scatter'(흩어짐) | 'line'(한 줄)
export function items(e, n, { layout = 'grid', count = false, cross = 0 } = {}) {
  const list = Array.isArray(e) ? e : Array(n).fill(e);
  const cls = i => `it${count ? ' cnt' : ''}${i >= list.length - cross ? ' crossed' : ''}`;
  if (layout === 'scatter') {
    const cells = shuffle([...Array(15).keys()]).slice(0, list.length);
    return `<div class="items scatter">${list.map((x, i) => {
      const c = cells[i];
      const l = (c % 5) * 19 + 2 + rand() * 5;
      const t = Math.floor(c / 5) * 31 + 3 + rand() * 7;
      return `<span class="${cls(i)}" style="left:${f1(l)}%;top:${f1(t)}%">${x}</span>`;
    }).join('')}</div>`;
  }
  if (layout === 'line') {
    return `<div class="items line">${list.map((x, i) => `<span class="${cls(i)}">${x}</span>`).join('')}</div>`;
  }
  const rows = [];
  for (let i = 0; i < list.length; i += 5) rows.push(list.slice(i, i + 5).map((x, k) => [x, i + k]));
  return `<div class="items grid">${rows.map(r => `<div class="irow">${r.map(([x, i]) => `<span class="${cls(i)}">${x}</span>`).join('')}</div>`).join('')}</div>`;
}

// 두 줄 비교 (많다/적다). spreadFewer: 적은 쪽을 넓게 벌림(수 보존 함정)
export function rows(list, { spreadFewer = false, pair = false } = {}) {
  const min = Math.min(...list.map(r => r[1]));
  return `<div class="rows${pair ? ' paired' : ''}">${list.map(([e, n]) => {
    const spread = spreadFewer && n === min && !pair;
    return `<div class="rrow${spread ? ' spread' : ''}">${Array(n).fill(`<span class="it">${e}</span>`).join('')}</div>`;
  }).join('')}</div>`;
}

// ── 10칸 틀 ──────────────────────────────────────
function frameSvg(cells) {
  let s = '';
  for (let i = 0; i < 10; i++) {
    const x = 4 + (i % 5) * 38, y = 4 + Math.floor(i / 5) * 38;
    s += `<rect x="${x}" y="${y}" width="36" height="36" rx="5" class="fc"/>`;
    const c = cells[i];
    if (c) {
      const col = c % 10 === 1 ? 'var(--c1)' : 'var(--c2)';
      s += `<circle cx="${x + 18}" cy="${y + 18}" r="13" fill="${col}"${c > 10 ? ' opacity=".35"' : ''}/>`;
      if (c > 10) s += `<path d="M${x + 8} ${y + 8}L${x + 28} ${y + 28}M${x + 28} ${y + 8}L${x + 8} ${y + 28}" class="xo"/>`;
    }
  }
  return `<svg class="frame" viewBox="0 0 196 84">${s}</svg>`;
}
// a개(1색) + b개(2색), 끝에서 cross개 지움
export function frames(a, b = 0, cross = 0) {
  const cells = [...Array(a).fill(1), ...Array(b).fill(2)];
  for (let i = 0; i < cross && i < cells.length; i++) cells[cells.length - 1 - i] += 10;
  const n = Math.max(1, Math.ceil(cells.length / 10));
  let out = '';
  for (let f = 0; f < n; f++) out += frameSvg(cells.slice(f * 10, f * 10 + 10));
  return `<div class="frames">${out}</div>`;
}

// ── 수 모형 (백/십/일) ────────────────────────────
export function base10(h, t, o) {
  let x = 4, s = '';
  for (let i = 0; i < h; i++) {
    s += `<rect x="${x}" y="4" width="100" height="100" class="b100"/>`;
    for (let k = 1; k < 10; k++) s += `<path d="M${x + k * 10} 4v100M${x} ${4 + k * 10}h100" class="bl"/>`;
    x += 110;
  }
  for (let i = 0; i < t; i++) {
    s += `<rect x="${x}" y="4" width="10" height="100" class="b10"/>`;
    for (let k = 1; k < 10; k++) s += `<path d="M${x} ${4 + k * 10}h10" class="bl"/>`;
    x += 15;
  }
  if (o) x += 6;
  for (let i = 0; i < o; i++) {
    const col = Math.floor(i / 5), row = i % 5;
    s += `<rect x="${x + col * 14}" y="${94 - row * 14}" width="10" height="10" class="b1"/>`;
  }
  x += Math.ceil(o / 5) * 14;
  return `<svg class="b10s" viewBox="0 0 ${Math.max(x + 4, 40)} 108">${s}</svg>`;
}

// ── 모양 ─────────────────────────────────────────
export function polyPts(n, r = 42, rot = -90, cx = 50, cy = 52) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const star = () => pts(Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 18 : 44, a = ((-90 + i * 36) * Math.PI) / 180;
  return [50 + r * Math.cos(a), 52 + r * Math.sin(a)];
}));
const SHAPES = {
  circle: () => `<circle cx="50" cy="50" r="40"/>`,
  ellipse: () => `<ellipse cx="50" cy="50" rx="45" ry="25"/>`,
  egg: () => `<path d="M50 8C74 8 86 48 86 64 86 82 70 92 50 92 30 92 14 82 14 64 14 48 26 8 50 8Z"/>`,
  arc: () => `<path d="M24 80A38 38 0 1 1 76 80"/>`,
  triangle: () => `<polygon points="${pts(polyPts(3, 46, -90, 50, 58))}"/>`,
  rtri: () => `<polygon points="14,88 88,88 14,18"/>`,
  ttri: () => `<polygon points="50,6 72,92 28,92"/>`,
  wtri: () => `<polygon points="6,76 94,76 60,26"/>`,
  openTri: () => `<polyline points="20,88 50,14 80,88 62,88"/>`,
  curveTri: () => `<path d="M50 10L90 88Q50 58 10 88Z"/>`,
  roundTri: () => `<path d="M42 18Q50 6 58 18L86 74Q92 88 76 88H24Q8 88 14 74Z"/>`,
  square: () => `<rect x="14" y="14" width="72" height="72"/>`,
  rect: () => `<rect x="6" y="26" width="88" height="48"/>`,
  tall: () => `<rect x="28" y="6" width="44" height="88"/>`,
  trap: () => `<polygon points="30,24 70,24 94,78 6,78"/>`,
  para: () => `<polygon points="28,24 94,24 72,78 6,78"/>`,
  openSq: () => `<polyline points="30,14 14,14 14,86 86,86 86,14 60,14"/>`,
  roundSq: () => `<rect x="14" y="14" width="72" height="72" rx="24"/>`,
  pent: () => `<polygon points="${pts(polyPts(5, 44))}"/>`,
  hex: () => `<polygon points="${pts(polyPts(6, 44, 0))}"/>`,
  star: () => `<polygon points="${star()}"/>`,
  heart: () => `<path d="M50 86C20 64 8 48 8 32 8 18 20 10 32 10 40 10 46 14 50 22 54 14 60 10 68 10 80 10 92 18 92 32 92 48 80 64 50 86Z"/>`,
};
export const SHAPE_KINDS = Object.keys(SHAPES);
export function shape(kind, { fill = COLORS.blue, rot = 0, scale = 1 } = {}) {
  const open = kind === 'openTri' || kind === 'openSq' || kind === 'arc';
  return `<svg class="shp" viewBox="0 0 100 100"><g transform="rotate(${rot} 50 50) translate(50 50) scale(${scale}) translate(-50 -50)" fill="${open ? 'none' : fill}" stroke="${open ? fill : 'rgba(0,0,0,.18)'}" stroke-width="${open ? 7 : 2}" stroke-linejoin="round" stroke-linecap="round">${SHAPES[kind]()}</g></svg>`;
}

// 공 모양 색 덩어리
export function blob(color) {
  return `<svg class="shp" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="${color}"/><circle cx="36" cy="36" r="10" fill="#fff" opacity=".45"/></svg>`;
}

// 꼭짓점·변 세기용 다각형 (탭하면 표시)
export function polyCount(points, mode) {
  const p = pts(points);
  let s = `<polygon points="${p}" class="pc-body"/>`;
  if (mode === 'edge') {
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="cnt edge"/>`;
    });
  } else {
    points.forEach(([x, y]) => { s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="7" class="cnt vtx"/>`; });
  }
  return `<svg class="shp big" viewBox="-4 -4 108 108">${s}</svg>`;
}

// ── 입체 (상자·기둥·공) ───────────────────────────
function solidG(kind, x, y, s = 1) {
  const g = inner => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;
  if (kind === 'box') return g(`<polygon points="0,14 26,0 56,12 30,26" fill="#F7B36B"/><polygon points="0,14 30,26 30,60 0,48" fill="#E9964A"/><polygon points="30,26 56,12 56,46 30,60" fill="#D27F35"/>`);
  if (kind === 'cyl') return g(`<rect x="4" y="10" width="48" height="44" fill="#7FB8F0"/><ellipse cx="28" cy="54" rx="24" ry="8" fill="#6AA4DE"/><rect x="4" y="10" width="48" height="44" fill="#7FB8F0"/><ellipse cx="28" cy="10" rx="24" ry="8" fill="#A9D1F7"/>`);
  return g(`<circle cx="28" cy="32" r="26" fill="#F48FB1"/><circle cx="19" cy="22" r="7" fill="#fff" opacity=".5"/>`);
}
export function solid(kind) {
  return `<svg class="shp" viewBox="-4 -4 66 70">${solidG(kind, 0, 0)}</svg>`;
}
export const SOLID_KO = { box: '상자 모양', cyl: '기둥 모양', ball: '공 모양' };
// 여러 입체로 만든 모양: 아래 두 개, 위 한 개
export function solidBuild(kinds) {
  const [a, b, c] = kinds;
  return `<svg class="shp big" viewBox="-4 -4 130 128">${solidG(a, 0, 60)}${solidG(b, 62, 60)}${solidG(c, 31, 2)}</svg>`;
}

// ── 쌓기나무 (등각) ───────────────────────────────
// grid[r][c] = 높이
export function iso(grid) {
  const dx = 20, dy = 10, h = 22, ox = 100, oy = 86;
  const cubes = [];
  grid.forEach((row, r) => row.forEach((ht, c) => { for (let z = 0; z < ht; z++) cubes.push([r, c, z]); }));
  cubes.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
  let s = '';
  for (const [r, c, z] of cubes) {
    const X = ox + (c - r) * dx - 30, Y = oy + (c + r) * dy - z * h - 30;
    s += `<polygon points="${X},${Y} ${X + dx},${Y + dy} ${X},${Y + 2 * dy} ${X - dx},${Y + dy}" class="cu-t"/>`;
    s += `<polygon points="${X - dx},${Y + dy} ${X},${Y + 2 * dy} ${X},${Y + 2 * dy + h} ${X - dx},${Y + dy + h}" class="cu-l"/>`;
    s += `<polygon points="${X},${Y + 2 * dy} ${X + dx},${Y + dy} ${X + dx},${Y + dy + h} ${X},${Y + 2 * dy + h}" class="cu-r"/>`;
  }
  return `<svg class="iso" viewBox="0 -10 160 160">${s}</svg>`;
}

// ── 위치 장면 (위/아래/옆, 안/밖) ─────────────────
export function scene(kind, pos, e) {
  const t = (x, y) => `<text x="${x}" y="${y}" font-size="30" text-anchor="middle">${e}</text>`;
  if (kind === 'table') {
    const who = { 위: t(60, 50), 아래: t(60, 95), 옆: t(108, 95) }[pos];
    return `<svg class="scene" viewBox="0 0 130 104"><rect x="20" y="56" width="80" height="7" rx="3" fill="#B7825A"/><rect x="26" y="62" width="6" height="38" fill="#9C6B45"/><rect x="88" y="62" width="6" height="38" fill="#9C6B45"/><rect x="0" y="100" width="130" height="4" fill="#DDD"/>${who}</svg>`;
  }
  const back = `<polygon points="30,52 90,52 96,44 36,44" fill="#E3A866"/>`;
  const front = `<rect x="30" y="52" width="60" height="46" fill="#F2B872"/><rect x="30" y="52" width="60" height="5" fill="#D99550"/>`;
  const inside = pos === '안';
  return `<svg class="scene" viewBox="0 0 130 104">${back}${inside ? t(62, 72) : ''}${front}${inside ? '' : t(112, 96)}<rect x="0" y="98" width="130" height="4" fill="#DDD"/></svg>`;
}

// 바구니 (분류)
export function basket(list) {
  return `<div class="basket"><div class="bk-in">${list.map(x => `<span>${x}</span>`).join('')}</div><div class="bk">🧺</div></div>`;
}

// ── 수·규칙 ───────────────────────────────────────
export function track(list) {
  return `<div class="track">${list.map(v => v == null ? `<span class="tk q">?</span>` : `<span class="tk">${v}</span>`).join('')}</div>`;
}
export function seq(list) {
  return `<div class="seq">${list.map(v => v == null ? `<span class="sq q">?</span>` : `<span class="sq">${v}</span>`).join('')}</div>`;
}
export const eq = (s, big = true) => `<div class="eq${big ? ' big' : ''}">${s}</div>`;
export const bignum = n => `<div class="bignum">${n}</div>`;
export const target = e => `<div class="target">${e}</div>`;
export const note = s => `<div class="note">${s}</div>`;

// 가르기 (체리 그림)
export function split(total, a, b) {
  const c = (x, y, v) => `<circle cx="${x}" cy="${y}" r="26" class="sp-c${v == null ? ' q' : ''}"/><text x="${x}" y="${y + 11}" text-anchor="middle" class="sp-t">${v ?? '?'}</text>`;
  return `<svg class="split" viewBox="0 0 200 150"><path d="M100 50L50 100M100 50L150 100" class="sp-l"/>${c(100, 32, total)}${c(50, 112, a)}${c(150, 112, b)}</svg>`;
}

// 묶음 (k묶음 × m개)
export function groups(k, m, e) {
  return `<div class="groups">${Array.from({ length: k }, () => `<div class="grp">${Array(m).fill(`<span>${e}</span>`).join('')}</div>`).join('')}</div>`;
}
// 점 배열 rows × cols, 마지막 줄 강조
export function dotArray(r, c, hiLast = false) {
  let s = '';
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    s += `<circle cx="${14 + j * 24}" cy="${14 + i * 24}" r="9" fill="${hiLast && i === r - 1 ? 'var(--c2)' : 'var(--c1)'}"/>`;
  }
  return `<svg class="dots" viewBox="0 0 ${c * 24 + 4} ${r * 24 + 4}">${s}</svg>`;
}
// 둘씩 짝지은 점 (짝수·홀수)
export function pairs(n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const col = Math.floor(i / 2), row = i % 2;
    s += `<circle cx="${16 + col * 28}" cy="${16 + row * 28}" r="10" fill="var(--c1)"/>`;
  }
  const cols = Math.ceil(n / 2);
  for (let k = 0; k < Math.floor(n / 2); k++) s += `<rect x="${3 + k * 28}" y="3" width="26" height="54" rx="13" class="pr"/>`;
  return `<svg class="dots" viewBox="0 0 ${cols * 28 + 6} 62">${s}</svg>`;
}
// 늘어나는 탑
export function towers(hs, qLast = true) {
  const max = Math.max(...hs.filter(h => h != null), 1);
  let s = '', x = 6;
  hs.forEach(h => {
    if (h == null) {
      s += `<rect x="${x}" y="${(max - 1) * 22 + 6}" width="24" height="22" class="tw-q" rx="4"/><text x="${x + 12}" y="${max * 22}" text-anchor="middle" class="tw-t">?</text>`;
    } else {
      for (let i = 0; i < h; i++) s += `<rect x="${x}" y="${(max - 1 - i) * 22 + 6}" width="24" height="20" rx="3" class="tw"/>`;
    }
    x += 40;
  });
  return `<svg class="towers" viewBox="0 0 ${x} ${max * 22 + 12}">${s}</svg>`;
}
export function tower(h) {
  let s = '';
  for (let i = 0; i < h; i++) s += `<rect x="6" y="${(h - 1 - i) * 22 + 6}" width="24" height="20" rx="3" class="tw"/>`;
  return `<svg class="towers one" viewBox="0 0 36 ${h * 22 + 12}">${s}</svg>`;
}

// ── 측정 ──────────────────────────────────────────
// 길이 막대 비교 (왼쪽 맞춤)
export function bars(list) {
  return `<div class="lbars">${list.map(({ len, color }) => `<div class="lbar" style="width:${len}%;background:${color}"></div>`).join('')}</div>`;
}
export function chip(color) {
  return `<span class="chip" style="background:${color}"></span>`;
}
export function cups(levels, colors) {
  return `<svg class="cups" viewBox="0 0 220 120">${levels.map((lv, i) => {
    const x = 20 + i * 110;
    return `<rect x="${x}" y="${108 - lv}" width="70" height="${lv}" fill="#8EC5F5"/><path d="M${x} 10V108H${x + 70}V10" fill="none" stroke="${colors[i]}" stroke-width="6"/>`;
  }).join('')}</svg>`;
}
export function seesaw(heavy, colors) {
  const tilt = heavy === 0 ? -12 : 12;
  return `<svg class="cups" viewBox="0 0 220 130"><polygon points="110,120 94,92 126,92" fill="#9AA"/><g transform="rotate(${tilt} 110 90)"><rect x="20" y="86" width="180" height="8" rx="4" fill="#B7825A"/><rect x="28" y="${heavy === 0 ? 44 : 60}" width="${heavy === 0 ? 44 : 30}" height="${heavy === 0 ? 42 : 26}" rx="5" fill="${colors[0]}"/><rect x="${heavy === 1 ? 148 : 160}" y="${heavy === 1 ? 44 : 60}" width="${heavy === 1 ? 44 : 30}" height="${heavy === 1 ? 42 : 26}" rx="5" fill="${colors[1]}"/></g></svg>`;
}
export function areas(a, b, colors, overlap) {
  // a, b = [w, h] in cells
  const cell = 16;
  const r = ([w, h], x, y, col, cls = '') => `<rect x="${x}" y="${y}" width="${w * cell}" height="${h * cell}" fill="${col}" opacity=".85" class="${cls}"/>`;
  if (overlap) {
    const big = a[0] * a[1] >= b[0] * b[1] ? 0 : 1;
    const [A, B] = big === 0 ? [a, b] : [b, a];
    const [cA, cB] = big === 0 ? colors : [colors[1], colors[0]];
    return `<svg class="cups" viewBox="0 0 220 130">${r(A, 10, 10, cA)}${r(B, 120, 10, cB, 'slide-over')}</svg>`;
  }
  return `<svg class="cups" viewBox="0 0 220 130">${r(a, 10, 10, colors[0])}${r(b, 120, 10, colors[1])}</svg>`;
}
export function clips(n, color, n2) {
  const u = 36;
  const bar = (len, col, y) => `<rect x="10" y="${y}" width="${len * u}" height="18" rx="9" fill="${col}"/>`;
  const clip = (i, y) => `<rect x="${12 + i * u}" y="${y}" width="${u - 4}" height="12" rx="6" fill="none" stroke="#889" stroke-width="3"/>`;
  let s = bar(n, color, 10);
  for (let i = 0; i < n; i++) s += clip(i, 36);
  if (n2) { s += bar(n2, COLORS.blue, 64); for (let i = 0; i < n2; i++) s += clip(i, 90); }
  return `<svg class="ruler" viewBox="0 0 ${Math.max(n, n2 || 0) * u + 24} ${n2 ? 108 : 54}">${s}</svg>`;
}
export function ruler(start, len, max = 12) {
  const u = 36, x0 = 16;
  let s = `<rect x="4" y="54" width="${max * u + 24}" height="44" rx="4" fill="#FFF3C4" stroke="#D9B64A"/>`;
  for (let i = 0; i <= max; i++) {
    const x = x0 + i * u;
    s += `<line x1="${x}" y1="54" x2="${x}" y2="72" stroke="#555" stroke-width="2"/><text x="${x}" y="92" text-anchor="middle" font-size="15" fill="#444">${i}</text>`;
    if (i < max) s += `<line x1="${x + u / 2}" y1="54" x2="${x + u / 2}" y2="64" stroke="#777" stroke-width="1.5"/>`;
  }
  const a = x0 + start * u, b = x0 + (start + len) * u;
  s += `<rect x="${a}" y="18" width="${b - a - 14}" height="24" fill="#F6C343"/><polygon points="${b - 14},18 ${b},30 ${b - 14},42" fill="#E8B27A"/><rect x="${a}" y="18" width="8" height="24" fill="#EF6461"/>`;
  return `<svg class="ruler" viewBox="0 0 ${max * u + 32} 102">${s}</svg>`;
}

export function clock(h, m, { mark = null } = {}) {
  let s = `<circle cx="100" cy="100" r="94" fill="#fff" stroke="#556" stroke-width="5"/>`;
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180, r1 = i % 5 ? 86 : 80;
    s += `<line x1="${f1(100 + r1 * Math.sin(a))}" y1="${f1(100 - r1 * Math.cos(a))}" x2="${f1(100 + 90 * Math.sin(a))}" y2="${f1(100 - 90 * Math.cos(a))}" stroke="#889" stroke-width="${i % 5 ? 1.5 : 3}"/>`;
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180, x = 100 + 64 * Math.sin(a), y = 100 - 64 * Math.cos(a);
    if (mark === i) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="15" fill="#FFE08A"/>`;
    s += `<text x="${f1(x)}" y="${f1(y + 7)}" text-anchor="middle" font-size="20" font-weight="700" fill="#334">${i}</text>`;
  }
  const hand = (deg, len, w, col) => {
    const a = (deg * Math.PI) / 180;
    return `<line x1="100" y1="100" x2="${f1(100 + len * Math.sin(a))}" y2="${f1(100 - len * Math.cos(a))}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  s += hand(((h % 12) + m / 60) * 30, 46, 9, '#E0605E');
  s += hand(m * 6, 74, 5, '#3C6FD8');
  s += `<circle cx="100" cy="100" r="6" fill="#334"/>`;
  return `<svg class="clock" viewBox="0 0 200 200">${s}</svg>`;
}

export const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function calendar(startDow, days, mark = null) {
  let s = '<div class="cal">' + DOW.map(d => `<b>${d}</b>`).join('');
  for (let i = 0; i < startDow; i++) s += '<span></span>';
  for (let d = 1; d <= days; d++) s += `<span${d === mark ? ' class="mk"' : ''}>${d}</span>`;
  return s + '</div>';
}

// ── 자료 ──────────────────────────────────────────
export function table(labels, values, { head = '', total = false } = {}) {
  const sum = values.reduce((a, b) => a + b, 0);
  return `<table class="tbl"><tr><th>${head}</th>${labels.map(l => `<th>${l}</th>`).join('')}${total ? '<th>합계</th>' : ''}</tr><tr><td>수</td>${values.map(v => `<td>${v ?? '?'}</td>`).join('')}${total ? `<td>${sum}</td>` : ''}</tr></table>`;
}
export function picto(labels, values) {
  return `<div class="picto">${labels.map((l, i) => `<div class="pcol"><div class="pstack">${Array(values[i]).fill('<i>○</i>').join('')}</div><div class="plab">${l}</div></div>`).join('')}</div>`;
}

// 100 수 배열 일부
export function grid100(start, cols = 5, rowsN = 4, blank) {
  let s = '<div class="g100" style="grid-template-columns:repeat(' + cols + ',1fr)">';
  for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
    const v = start + r * 10 + c;
    s += v === blank ? '<span class="q">?</span>' : `<span>${v}</span>`;
  }
  return s + '</div>';
}
// 덧셈표/곱셈표 조각
export function opTable(rowsV, colsV, op, blank) {
  let s = `<table class="tbl op"><tr><th>${op}</th>${colsV.map(c => `<th>${c}</th>`).join('')}</tr>`;
  rowsV.forEach(r => {
    s += `<tr><th>${r}</th>${colsV.map(c => {
      const v = op === '+' ? r + c : r * c;
      return blank && blank[0] === r && blank[1] === c ? '<td class="q">?</td>' : `<td>${v}</td>`;
    }).join('')}</tr>`;
  });
  return s + '</table>';
}

export function randColor(except = []) {
  const keys = Object.keys(COLORS).filter(k => !except.includes(k));
  return keys[int(0, keys.length - 1)];
}
