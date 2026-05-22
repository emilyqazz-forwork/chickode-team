// localStorage를 사용하여 사용자 프로필과 퀴즈/문제 풀이 시도 기록을 관리하는 데이터 관리 모듈
// ★ 향후 확장 방향: 이 모듈에 'import { supabaseClient } from "../supabaseClient"'를 추가하여 
//   로컬 저장소(localStorage)와 원격 데이터베이스(Supabase)를 동시에 혹은 대체하여 연동할 수 있습니다.

// 데이터 저장 키 (로컬 브라우저용)
const STORAGE_KEYS = {
  profile: "chickode:profile:v1",
  attempts: "chickode:attempts:v1",
};

// JSON 파싱 시 발생할 수 있는 예외(Crash)를 방지하는 안전장치 헬퍼 함수
function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * ====================================================================
 * [1. 사용자 프로필 관리 함수군]
 * ====================================================================
 */

// 로컬 스토리지에서 프로필 정보를 읽어옵니다. 데이터가 없으면 게스트 객체를 반환합니다.
export function getProfile() {
  const raw = localStorage.getItem(STORAGE_KEYS.profile);
  const profile = safeJsonParse(raw ?? "", null);
  if (profile && typeof profile === "object") return profile;
  return { name: "게스트", createdAt: Date.now() };
}

// 프로필 정보를 로컬 스토리지에 세팅합니다.
export function setProfile(nextProfile) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));
}

/**
 * ====================================================================
 * [2. 문제 풀이 시도 기록 관리 함수군 (★ Supabase 연동 핵심 포인트)]
 * ====================================================================
 */

// 로컬에 기록된 퀴즈 시도 이력 배열을 가져옵니다.
// ★ 향후 수정 방향: 로그인한 회원의 경우, 이 함수 내부에서 Supabase의 'wrong_notes' 혹은 'quiz_attempts' 
//   테이블을 select(조회)해오는 비동기 함수(async/await)로 확장하는 것이 좋습니다.
export function getAttempts() {
  const raw = localStorage.getItem(STORAGE_KEYS.attempts);
  const list = safeJsonParse(raw ?? "", []);
  return Array.isArray(list) ? list : [];
}

// 새로운 퀴즈 풀이 이력을 누적합니다. (맨 앞에 추가하고 최대 500개 유지)
export function addAttempt(attempt) {
  const next = getAttempts();
  next.unshift(attempt); // 최신 기록을 배열 가장 앞에 추가
  localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(next.slice(0, 500)));

  /* * [🔥 Supabase 서버 연동 삽입 구간 예시]
   * - 미니게임(StairGame, BugGame)이나 일반 퀴즈에서 이 함수를 공통으로 호출하므로,
   * 여기에 Supabase 테이블 insert 로직을 심어두면 한 번에 오답노트 서버 저장이 구현됩니다.
   * * import { supabaseClient } from "../supabaseClient";
   * * export async function addAttemptToSupabase(attempt, userId) {
   * // 정답 여부와 관계없이 혹은 오답(attempt.isCorrect === false)만 골라서 저장 가능
   * const { error } = await supabaseClient.from('wrong_notes').insert({
   * user_id: userId,
   * problem_id: attempt.id || attempt.problemId,
   * chapter: attempt.chapter,
   * type: attempt.type,
   * user_code: attempt.userCode,
   * is_correct: attempt.isCorrect
   * });
   * }
   */
}

// 로그아웃 혹은 데이터 초기화 시 로컬 스토리지 데이터를 제거합니다.
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.profile);
  localStorage.removeItem(STORAGE_KEYS.attempts);
}

/**
 * ====================================================================
 * [3. 데이터 분석 및 통계 연산 함수군]
 * ====================================================================
 */
/* 데이터분석(전체통계: 총 시도 횟수, 정답 수, 오답수 계산)
   그룹화통계: 챕터별, 문제 유형별 정답률 확인 */
export function summarizeAttempts(attempts) {
  const total = attempts.length; // 총 시도 횟수
  const correct = attempts.filter((a) => a && a.isCorrect).length; // 정답 횟수
  const wrong = total - correct; // 오답 횟수

  const byChapter = {}; // 챕터별 통계 객체 맵
  const byType = {};    // 문제 유형별(coding, multiple, ox 등) 통계 객체 맵

  for (const a of attempts) {
    if (!a) continue;
    const ch = String(a.chapter ?? "unknown");
    const ty = String(a.type ?? "unknown");

    // 맵에 해당 키가 없으면 초기 빈 기본 통계 구조를 할당 (Short-circuit evaluation)
    byChapter[ch] = byChapter[ch] ?? { total: 0, correct: 0, wrong: 0 };
    byType[ty] = byType[ty] ?? { total: 0, correct: 0, wrong: 0 };

    byChapter[ch].total++;
    byType[ty].total++;

    if (a.isCorrect) {
      byChapter[ch].correct++;
      byType[ty].correct++;
    } else {
      byChapter[ch].wrong++;
      byType[ty].wrong++;
    }
  }

  // 가공된 통계 리포트 객체를 반환합니다. 패턴분석 UI(Pattern.jsx 등)에서 사용됩니다.
  return { total, correct, wrong, byChapter, byType };
}