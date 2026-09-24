// 기획안 v2 수치 — 한 곳에서 관리
import { MIN, HOUR, DAY } from './util.js';

// §5·§7·§8-2 연령별 규칙
export const AGE = {
  g4: {
    label: '만 4세',
    interval: [[2, 0.7], [3, 0.3]], // 기대값 2.30
    seatCap: 3, dayCap: 5, board: 15,
    rest: [5, 9, 12],               // 1차 쉼터 / 2차 쉼터 / 부모 알림 (분)
    recommend: '6~8분',
    home: 96, tapMin: 96, tap: 120, gap: 24,
    maxChoices: 3,
    stickerMs: 2000,
    together: 'forced',             // 함께하기 모드 해제 불가
    showText: false,                // 문자 의존 0%
    wrongSound: false,              // 오답 효과음 없음
    eliminate: false,               // 선택지 소거 없음
  },
  g56: {
    label: '만 5~6세',
    interval: [[2, 0.25], [3, 0.5], [4, 0.25]],
    seatCap: 4, dayCap: 6, board: 20,
    rest: [8, 14, 18],
    recommend: '10~12분',
    home: 72, tapMin: 72, tap: 96, gap: 16,
    maxChoices: 4,
    stickerMs: 3000,
    together: 'default-on',
    showText: true,
    wrongSound: true,
    eliminate: true,
  },
  g78: {
    label: '초1~2',
    interval: [[2, 0.25], [3, 0.5], [4, 0.25]],
    seatCap: 5, dayCap: 8, board: 24,
    rest: [12, 20, 25],
    recommend: '15~20분',
    home: 72, tapMin: 56, tap: 80, gap: 12,
    maxChoices: 4,
    stickerMs: 3000,
    together: 'default-off',
    showText: true,
    wrongSound: true,
    eliminate: true,
  },
};

export const RULES = {
  // 스티커 §5
  rapidMs: 800,               // 0.8초 미만 + 오답 = 무성의 연타
  surprise: 0.08,             // 반짝이 디자인 확률
  carryMax: 2,                // 카운터 이월 최대 2문제
  carryMs: 48 * HOUR,
  feedbackGateMs: 1500,       // 과정 피드백 선행 게이트
  // 착석 §5-3, §4
  newSeatingGapMs: 60 * MIN,  // 앱 종료 후 60분 → 새 착석
  resumeMaxMs: 24 * HOUR,
  idleCloseMs: 90_000,        // 무입력 90초 자동 마감
  restSec: 12,                // 쉼터 애니메이션
  restCooldownMs: 3 * MIN,
  // 통과 §4-5
  passMin: 15, passWindow: 10, passCorrect: 9, passMaxHint: 2,
  skipTestN: 5,
  staleMs: 3 * DAY, staleReview: 5,
  // 진도 상한 §4-6
  maxPassPerSeating: 2,
  maxLevelPerDay: 1,
  diffUpStreak: 4,            // 연속 정답 4개 → 한 단계 상승
  // 자동 보정 §3-3
  calibN: 12,
  // 피로 §4-2
  fatigueWindow: 6, fatigueWrong: 0.5, fatigueRT: 1.8, fatigueRapid: 3,
  // 오답 §9
  hintDelayMs: 3000,
  // 진단 §3-2
  diagMax: 6, diagTimeoutMs: 8000, diagTotalMs: 90_000,
  // 부모 잠금 §10-3
  parentHoldMs: 2000,
  parentIdleLockMs: 3 * MIN,
  gateFailLockMs: 60_000,
  gateMaxFails: 3,
  // 사진 §10-2
  photoMax: 20, photoSize: 512, photoMinSide: 256, photoMaxBytes: 5 * 1024 * 1024,
  wrongLogMax: 20,
};

export const PHOTO_WEIGHT = { low: 0.5, mid: 1.5, high: 4 };
