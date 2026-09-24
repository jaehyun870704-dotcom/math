// 수치 모음
export const RULES = {
  stickerEvery: 7,        // 7문제마다 스티커 1장
  surprise: 0.08,         // 반짝이 스티커 확률
  diffUpStreak: 5,        // 첫 시도 정답 5개 연속 → 레벨 안에서 한 단계 어렵게
  diffDownWrong: 2,       // 연속 2문제 틀리면 → 한 단계 쉽게
  hintDelayMs: 3000,
  feedbackMs: 1300,
  stickerMs: 2600,
  // 부모 화면 잠금
  parentHoldMs: 2000,
  parentIdleLockMs: 3 * 60_000,
  gateFailLockMs: 60_000,
  gateMaxFails: 3,
  // 사진 스티커
  photoMax: 20, photoSize: 512, photoMinSide: 256, photoMaxBytes: 5 * 1024 * 1024,
};

export const PHOTO_WEIGHT = { low: 0.5, mid: 1.5, high: 4 };
