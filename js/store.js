// 저장: 진행 상황은 localStorage(답할 때마다 저장), 사진은 IndexedDB. 서버 업로드 없음.
import { newState } from './game.js';

const KEY = 'sansu.v3';

const blank = () => ({ ...newState(), gate: { fails: 0, lockUntil: 0 } });

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && s.v === 3 ? { ...blank(), ...s } : blank();
  } catch {
    return blank();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('저장 실패', e);
  }
}

// ── 사진 스티커 (IndexedDB) ──
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('sansu', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('photos', mode);
    const out = fn(t.objectStore('photos'));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}
export async function getPhotos() {
  try {
    const list = await tx('readonly', s => s.getAll());
    return (list || []).sort((a, b) => a.created - b.created);
  } catch {
    return [];
  }
}
export const putPhoto = p => tx('readwrite', s => s.put(p));
export const deletePhoto = id => tx('readwrite', s => s.delete(id));
