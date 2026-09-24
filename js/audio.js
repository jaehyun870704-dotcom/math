// 음성(한국어 TTS)과 효과음. 모든 지시는 음성으로 (읽기 전제 없음)
let voice = null;

export function initVoice() {
  if (!('speechSynthesis' in window)) return;
  const choose = () => {
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => v.lang === 'ko-KR' && /female|여|Yuna|Sora|Heami|SunHi/i.test(v.name))
      || vs.find(v => v.lang === 'ko-KR')
      || vs.find(v => v.lang?.startsWith('ko')) || null;
  };
  choose();
  speechSynthesis.onvoiceschanged = choose;
}

// 끝나면 resolve. 음성이 없거나 막혀도 멈추지 않도록 시간 제한
export function speak(text) {
  if (!text || !('speechSynthesis' in window)) return Promise.resolve();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[−]/g, '빼기').replace(/×/g, '곱하기').replace(/÷/g, '나누기'));
  u.lang = 'ko-KR';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 1.15;
  return new Promise(res => {
    const done = () => { clearTimeout(t); res(); };
    const t = setTimeout(res, 1200 + text.length * 180);
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}
export const hush = () => { try { speechSynthesis.cancel(); } catch {} };

let ctx = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}
export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

// 마림바 느낌: 사인파 + 약한 배음, 빠른 감쇠
function mallet(freq, dur = 0.15, vol = 0.4, when = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(c.destination);
  for (const [mul, amp] of [[1, 1], [4, 0.12]]) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

export const sfx = {
  // 오답: 마림바 단음 0.15초, 볼륨 40%, 하강 음정 금지
  wrong: () => mallet(440, 0.15, 0.4),
  right: () => { mallet(523, 0.18, 0.35); mallet(784, 0.25, 0.35, 0.11); },
  tap: () => mallet(988, 0.06, 0.12),
  door: () => { mallet(659, 0.15, 0.3); mallet(880, 0.2, 0.3, 0.1); },
  sticker: () => [523, 659, 784, 1047].forEach((f, i) => mallet(f, 0.2, 0.3, i * 0.08)),
};
