/**
 * Chickode 기술 지표 및 실시간 행동 분석 연산 엔진
 */

// 난이도별 비선형 시간 가중치 (1: 쉬움, 3: 중간, 5: 어려움)
export const DIFFICULTY_WEIGHTS = {
  1: 1.0,
  3: 4.5,
  5: 12.0
};

// 기준점: 일주일 전 과거 통계 상수 (성장 곡선 대조용)
export const PAST_STATS_BASELINE = {
  implementation: 42,
  conceptual: 55,
  focus: 50,
  tAdjAvg: 95
};

/**
 * 특정 난이도 레벨에 따른 가중치 반환
 */
export function getDifficultyWeight(level) {
  return DIFFICULTY_WEIGHTS[level] || 1.0;
}

/**
 * 원천 시도 이력(attempts) 및 CCTV 행동 로그(behaviorLogs)를 가공하여 고차원 학습 스탯 도출
 */
export function calculateLearningStats(attempts = [], behaviorLogs = []) {
  const totalLogs = attempts.length;
  if (totalLogs === 0) {
    return {
      implementation: 0,
      conceptual: 0,
      focus: 0,
      timeGrowthRate: 0,
      passedCount: 0,
      totalCount: 0,
      avgSubmits: 0,
      avgHints: 0,
      tabSwitchIssueRatio: 0,
      highMouseOutRatio: 0,
      weakestChapter: 1
    };
  }

  const passedLogs = attempts.filter(l => l.is_correct || l.isCorrect);
  
  // 누적 지표 집계
  const totalCodeLevel = attempts.reduce((acc, cur) => acc + (cur.code_level || 1), 0);
  const passedCodeLevel = passedLogs.reduce((acc, cur) => acc + (cur.code_level || 1), 0);
  const totalSubmitCount = attempts.reduce((acc, cur) => acc + (cur.submit_count || 0), 0);
  const totalHintCount = attempts.reduce((acc, cur) => acc + (cur.hint_count || 0), 0);
  const totalFocusScore = attempts.reduce((acc, cur) => acc + (cur.avg_focus_score || 0), 0);

  // 세션 평균 수치화
  const passRate = totalLogs > 0 ? (passedLogs.length / totalLogs) : 0;
  const avgSubmits = totalLogs > 0 ? (totalSubmitCount / totalLogs) : 0;
  const avgHints = totalLogs > 0 ? (totalHintCount / totalLogs) : 0;
  const avgFocus = totalLogs > 0 ? (totalFocusScore / totalLogs) : 0;

  // [공식 1] 고유 소스코드 구현력 (Implementation)
  const implementationScore = Math.max(0, Math.min(100, Math.round(
    (totalCodeLevel > 0 ? (passedCodeLevel / totalCodeLevel * 100) : 0) - (avgSubmits * 4) + (passRate * 20)
  )));

  // [공식 2] 개념구조 이해력 (Conceptual Capacity)
  const conceptualScore = Math.max(0, Math.min(100, Math.round(
    100 - (avgHints * 12) - (avgSubmits * 5)
  )));

  // [공식 3] 인지적 시선 몰입력 (Cognitive Focus - 4.0 만점 기준 백분율 확장)
  const focusScore = Math.max(0, Math.min(100, Math.round(avgFocus * 25)));

  // [공식 4] 비선형 가중치 보정 시간 변환 및 성장률 연산
  const recentTAdjTotal = attempts.reduce((acc, cur) => {
    const seconds = cur.study_seconds || cur.studySeconds || 60;
    const lvl = cur.code_level || 1;
    return acc + (seconds / getDifficultyWeight(lvl));
  }, 0);
  const recentTAdjAvg = totalLogs > 0 ? (recentTAdjTotal / totalLogs) : PAST_STATS_BASELINE.tAdjAvg;
  const timeGrowth = PAST_STATS_BASELINE.tAdjAvg > 0 
    ? Math.round(((PAST_STATS_BASELINE.tAdjAvg - recentTAdjAvg) / PAST_STATS_BASELINE.tAdjAvg) * 100)
    : 0;

  // CCTV 로그 행동 양식 집계
  const tabSwitchIssueCount = behaviorLogs.filter(l => (l.tab_switch_count || 0) >= 4).length;
  const highMouseOutCount = behaviorLogs.filter(l => (l.mouse_out_count || 0) >= 3).length;

  // 취약 챕터 추적 모듈
  const chapterStats = {};
  attempts.forEach(att => {
    const ch = att.chapter_id || att.chapter || 1;
    if (!chapterStats[ch]) chapterStats[ch] = { correct: 0, total: 0 };
    chapterStats[ch].total += 1;
    if (att.is_correct || att.isCorrect) chapterStats[ch].correct += 1;
  });

  let minAccuracy = 1.1;
  let weakestChapter = 1;
  Object.entries(chapterStats).forEach(([ch, data]) => {
    const acc = data.correct / data.total;
    if (acc < minAccuracy) {
      minAccuracy = acc;
      weakestChapter = parseInt(ch);
    }
  });

  return {
    implementation: implementationScore,
    conceptual: conceptualScore,
    focus: focusScore,
    timeGrowthRate: timeGrowth,
    passedCount: passedLogs.length,
    totalCount: totalLogs,
    avgSubmits,
    avgHints,
    tabSwitchIssueRatio: totalLogs > 0 ? (tabSwitchIssueCount / totalLogs) : 0,
    highMouseOutRatio: totalLogs > 0 ? (highMouseOutCount / totalLogs) : 0,
    weakestChapter
  };
}