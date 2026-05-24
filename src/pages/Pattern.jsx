import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 
// 격리시킨 연산 유틸 및 상수 가져오기
import { calculateLearningStats, PAST_STATS_BASELINE } from '../utils/scoring';

// Vite 환경 변수에서 Claude API Key 바인딩 (프로젝트 설정에 따라 process.env.CHICKODE_CLAUDE_API_KEY 등으로 유연하게 변경 가능)
const CLAUDE_API_KEY = import.meta.env?.VITE_CHICKODE_CLAUDE_API_KEY || process.env?.CHICKODE_CLAUDE_API_KEY || "";

export function Pattern({ t }) {
  const navigate = useNavigate();
  
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("코딩 병아리");
  const [stats, setStats] = useState({
    implementation: 0,
    conceptual: 0,
    focus: 0,
    timeGrowthRate: 0,
    passedCount: 0,
    totalCount: 0,
    avgSubmits: 0,
    tabSwitchIssueRatio: 0,
    highMouseOutRatio: 0,
    weakestChapter: 1
  });

  // Claude 동적 처방 메시지 상태
  const [prescriptions, setPrescriptions] = useState({
    tab_switch: "",
    typing_frenzy: "",
    mouse_wander: ""
  });
  const [prescriptionsLoading, setPrescriptionsLoading] = useState({
    tab_switch: false,
    typing_frenzy: false,
    mouse_wander: false
  });

  useEffect(() => {
    async function fetchLearningData() {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id; 

        if (userId) {
          // profiles 테이블에서 실제 유저의 이름 조회
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .single();
          if (profile?.display_name) {
            setDisplayName(profile.display_name);
          }
        }

        // [Table 1] 문제 시도 이력 로드
        let attemptQuery = supabase.from('user_attempts').select('*');
        if (userId) attemptQuery = attemptQuery.eq('user_id', userId);
        const { data: attemptData, error: err1 } = await attemptQuery;

        // [Table 2] CCTV 다차원 행동 로그 데이터 로드
        let behaviorQuery = supabase.from('user_behavior_logs').select('*');
        if (userId) behaviorQuery = behaviorQuery.eq('user_id', userId);
        const { data: behaviorData, error: err2 } = await behaviorQuery;

        if (err1 || err2) throw new Error("Supabase 데이터 추출 실패");

        if (attemptData && attemptData.length > 0) {
          setAttempts(attemptData);
          const bLogs = behaviorData || [];
          
          // 분리한 유틸리티 엔진 호출을 통한 스탯 바인딩
          const computedStats = calculateLearningStats(attemptData, bLogs);
          setStats(computedStats);

          // 다차원 거동 기반 습관 체크 후 필요시 Claude API 동적 호출 트리거
          triggerAIPrescriptions(computedStats, bLogs);
        }
      } catch (error) {
        console.error("데이터 바인딩 도중 오류 발생:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLearningData();
  }, []);

  // Claude Messages API 호출 및 동적 처방문 스트리밍 생성 모듈
  const fetchClaudePrescription = async (habitType, computedStats) => {
    if (!CLAUDE_API_KEY) {
      console.warn("⚠️ API Key가 누락되었구! .env 파일 내 CHICKODE_CLAUDE_API_KEY 선언을 확인해줘.");
      return "🔑 API Key 설정이 되어있지 않아 처방전을 불러올 수 없구.. 선배에게 알려줘!";
    }

    let habitContext = "";
    if (habitType === "tab_switch") {
      habitContext = "에디터 창을 이탈해 포털로 화면을 전환(Ctrl+Tab, 복사/붙여넣기)한 빈도가 40% 이상으로 극도로 높은 편";
    } else if (habitType === "typing_frenzy") {
      habitContext = `문제를 깊이 읽지 않고 런타임 채점 버튼을 난타하며 즉흥적으로 해결하려 함 (평균 제출수 ${computedStats.avgSubmits.toFixed(1)}회, 합격률 ${(computedStats.passedCount / computedStats.totalCount * 100).toFixed(0)}%)`;
    } else if (habitType === "mouse_wander") {
      habitContext = "마우스 포인터가 브라우저 가시 영역 밖으로 이탈하여 대기 상태를 유지하는 시선 흐트러짐 비율이 30% 이상으로 높음";
    }

    const systemPrompt = `
당신은 게임화 코딩 플랫폼 'Chickode(치코드)'의 귀엽고 똑똑한 AI 튜터 '병아리 선배'입니다.
학습자의 나쁜 코딩 버릇을 교정하는 처방전을 200자 내외로 유머러스하면서도 따스하게 기술해 주세요.
- 말투: "~구", "~해봐!", "~잖아!" 식의 '병아리 선배🐣' 전용 어조를 써서 친근하게 잔소리해야 합니다.
- 텍스트 강조를 위해 <strong> 태그를 자연스럽게 섞어 작성해 주세요. (예: <strong>10초만 눈 디버깅</strong>해 봐!)
`;

    const userPrompt = `
- 대상 학생: ${displayName}
- 성적 스탯: 구현력 ${computedStats.implementation}점, 개념이해 ${computedStats.conceptual}점, 시선몰입 ${computedStats.focus}점
- 감지된 나쁜 습관: [${habitContext}]

이 학생의 정량 수치와 나쁜 습관 패턴에 정확히 핀포인트를 맞춘 따끔하고 실천적인 동적 교정 솔루션을 작성해줘!
`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "dangerouslyAllowBrowser": "true" // 브라우저 직호출 허용 설정
        },
        body: JSON.stringify({
          model: "claude-3-5-flash-20241022",
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }]
        })
      });

      if (!response.ok) throw new Error("Claude API Response Error");
      const resData = await response.json();
      return resData.content[0].text;
    } catch (err) {
      console.error("Claude API 호출 실패:", err);
      return "🐤 우웅.. 병아리 선배의 통신망이 잠깐 혼잡하구! 조금 있다가 다시 열어봐!";
    }
  };

  // 탐지 조건 검출 및 AI 비동기 처방 제어
  const triggerAIPrescriptions = async (computedStats) => {
    const activeHabits = [];
    if (computedStats.tabSwitchIssueRatio >= 0.4) activeHabits.push("tab_switch");
    if (computedStats.avgSubmits >= 3 && (computedStats.passedCount / computedStats.totalCount) <= 0.7) activeHabits.push("typing_frenzy");
    if (computedStats.highMouseOutRatio >= 0.3) activeHabits.push("mouse_wander");

    if (activeHabits.length === 0) return;

    // 로딩 상태 일괄 적용
    const initialLoading = {};
    activeHabits.forEach(h => { initialLoading[h] = true; });
    setPrescriptionsLoading(prev => ({ ...prev, ...initialLoading }));

    // 병렬로 API 요청을 보내고 처리 완료 순서대로 개별 바인딩하여 속도 극대화
    activeHabits.forEach(async (habit) => {
      const text = await fetchClaudePrescription(habit, computedStats);
      setPrescriptions(prev => ({ ...prev, [habit]: text }));
      setPrescriptionsLoading(prev => ({ ...prev, [habit]: false }));
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f0e8', color: '#5d4037', fontFamily: 'sans-serif' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⏳</div>
          <p style={{ marginTop: '16px', fontWeight: 'bold', fontSize: '1.05rem' }}>Supabase 안전 데이터 인지 엔진 연동 중...</p>
        </div>
      </div>
    );
  }

  // 3대 나쁜 습관 탐지 플래그 연산
  const hasTabHabit = stats.tabSwitchIssueRatio >= 0.4;
  const hasTypingHabit = stats.avgSubmits >= 3 && (stats.totalCount > 0 ? (stats.passedCount / stats.totalCount) <= 0.7 : false);
  const hasMouseHabit = stats.highMouseOutRatio >= 0.3;

  return (
    <div className="main-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f5f0e8', color: '#3e2723', padding: '20px 16px', minHeight: '100vh', width: '100vw', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* 윈도우 컨트롤 바 */}
      <div style={{ width: '100%', maxWidth: '750px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ background: '#5d4037', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}>
          ❮ 뒤로가기
        </button>
        <span style={{ fontSize: '0.85rem', color: '#8d6e63', fontWeight: 'bold', border: '1px solid #d7ccc8', padding: '4px 8px', borderRadius: '6px', background: 'white' }}>
          🔌 Supabase Cloud Live
        </span>
      </div>

      {attempts.length === 0 ? (
        <div style={{ color: '#3e2723', textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>아직 누적된 학습 로그가 없어! 🐥</p>
          <p style={{ color: '#8d6e63', marginTop: '8px' }}>문제를 풀면 Supabase 원격 테이블에 수집되어 정밀 성취도가 도출됩니다.</p>
          <button className="clay-submit" onClick={() => navigate('/')} style={{ marginTop: '24px', padding: '10px 24px', borderRadius: '12px', background: '#5d4037', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>문제 풀러 가기</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
          
          {/* 타이틀 오버뷰 헤더 */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 'bold', margin: '0 0 6px 0' }}>📊 AI 기술 지표 정밀 진단 시스템</h1>
            <p style={{ color: '#8d6e63', margin: 0, fontSize: '0.9rem' }}>클라우드 원천 DB 계측 데이터를 기반으로 포인팅된 비선형 리포트</p>
          </div>

          {/* SECTION 1: 다차원 정량 스탯 리포트 */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e0d6c8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📈</span> 초보자 친화적 역량 성취 지표
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 코드 구현력 게이지 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 'bold' }}>💻 고유 소스코드 구현력 (Implementation)</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {stats.implementation}점 
                    <span style={{ color: (stats.implementation - PAST_STATS_BASELINE.implementation) >= 0 ? '#4caf50' : '#ef5350', fontSize: '0.8rem', marginLeft: '4px' }}>
                      ▲ (전주대비 {((stats.implementation - PAST_STATS_BASELINE.implementation) >= 0 ? '+' : '') + (stats.implementation - PAST_STATS_BASELINE.implementation).toFixed(1)})
                    </span>
                  </span>
                </div>
                <div style={{ background: '#f5f0e8', height: '12px', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.implementation}%`, height: '100%', background: 'linear-gradient(90deg, #a5d6a7, #66bb6a)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* 개념 이해력 게이지 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 'bold' }}>💡 개념구조 이해력 (Conceptual Capacity)</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {stats.conceptual}점 
                    <span style={{ color: (stats.conceptual - PAST_STATS_BASELINE.conceptual) >= 0 ? '#4caf50' : '#ef5350', fontSize: '0.8rem', marginLeft: '4px' }}>
                      ▲ (전주대비 {((stats.conceptual - PAST_STATS_BASELINE.conceptual) >= 0 ? '+' : '') + (stats.conceptual - PAST_STATS_BASELINE.conceptual).toFixed(1)})
                    </span>
                  </span>
                </div>
                <div style={{ background: '#f5f0e8', height: '12px', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.conceptual}%`, height: '100%', background: 'linear-gradient(90deg, #90caf9, #42a5f5)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* 몰입력 게이지 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 'bold' }}>👁️ 인지적 시선 몰입력 (Cognitive Focus)</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {stats.focus}점 
                    <span style={{ color: (stats.focus - PAST_STATS_BASELINE.focus) >= 0 ? '#4caf50' : '#ef5350', fontSize: '0.8rem', marginLeft: '4px' }}>
                      ▲ (전주대비 {((stats.focus - PAST_STATS_BASELINE.focus) >= 0 ? '+' : '') + (stats.focus - PAST_STATS_BASELINE.focus).toFixed(1)})
                    </span>
                  </span>
                </div>
                <div style={{ background: '#f5f0e8', height: '12px', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.focus}%`, height: '100%', background: 'linear-gradient(90deg, #ffe082, #ffb74d)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '14px', background: '#f1f8e9', borderRadius: '12px', border: '1px solid #dcedc8', fontSize: '0.85rem', color: '#33691e', lineHeight: '1.5' }}>
              <strong>💡 엔진 종합 해설:</strong> 어려운 문항에서 빌드가 최종 실패했더라도 끝까지 도전을 지속한 제출 근성 수치가 연산 보정식에 반영되어, 단순 통계 대비 <strong>실제 소스코드 제어력이 탄탄하게 성장</strong>하고 있음을 증명합니다.
            </div>
          </div>

          {/* SECTION 2: 난이도 비선형 가중치 보정 시계열 성장 곡선 */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e0d6c8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏱️</span> 난이도 비선형 가중치 보정 해결 템포
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '16px', borderRadius: '14px', border: '1px solid #eee' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#8d6e63', fontWeight: 'bold' }}>과거 대비 인지 템포 가속도</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 'bold', color: '#e64a19', marginTop: '4px' }}>
                  {stats.timeGrowthRate > 0 ? `+${stats.timeGrowthRate}% 더 기민해짐` : `${stats.timeGrowthRate}%`}
                </div>
              </div>
              <div style={{ maxWidth: '65%', fontSize: '0.85rem', color: '#5d4037', lineHeight: '1.45', textAlign: 'right' }}>
                알고리즘 난이도에 따른 인지 과부하 지수 가중치($W_i$)를 수식에 반영하여 시간 데이터를 정규화한 결과입니다. 지난 세션 대비 <strong>불필요한 시간 낭비가 대폭 감쇄</strong>되었습니다.
              </div>
            </div>
          </div>

          {/* SECTION 3: CCTV 로그 기반 3대 나쁜 습관 탐지 정밀 진단 */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e0d6c8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚨</span> CCTV 로그 연동 실시간 행동 교정 처방
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8d6e63', margin: '0 0 20px 0' }}>유저 이탈 거동의 규칙성 패턴 분석에 따른 동적 발급 배지</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 습관 1: Ctrl + Tab 방랑자 */}
              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #ffcdd2', background: hasTabHabit ? '#fff8f8' : '#fafafa', opacity: hasTabHabit ? 1 : 0.55, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: hasTabHabit ? '#c62828' : '#3e2723' }}>
                    🏃‍♂️ 습관 ① : 『Ctrl + Tab 방랑자』 (외부 코드 복붙 의존성)
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: hasTabHabit ? '#ef5350' : '#b0bec5', color: 'white' }}>
                    {hasTabHabit ? '위험 감지' : '안정'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#5d4037', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                  단일 문제를 풀 때 에디터 창을 이탈하여 포털로 전환한 빈도가 임계 가이드라인을 초과했습니다. 스스로 논리를 빌드하기 전 정답을 복제하려는 관성이 축적되었을 수 있습니다.
                </p>
                {hasTabHabit && (
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.8rem', color: '#5d4037', lineHeight: '1.4' }}>
                    💡 <strong>교정 처방:</strong>{" "}
                    {prescriptionsLoading.tab_switch ? (
                      <span style={{ color: '#8d6e63' }}>🐣 병아리 선배가 처방전을 작성하고 있구... 📝</span>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: prescriptions.tab_switch || "데이터 분석 중이구..." }} />
                    )}
                  </div>
                )}
              </div>

              {/* 습관 2: 급한 성미의 타이핑 폭주족 */}
              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #ffe082', background: hasTypingHabit ? '#fffbf0' : '#fafafa', opacity: hasTypingHabit ? 1 : 0.55, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: hasTypingHabit ? '#b76e00' : '#3e2723' }}>
                    🏎️ 습관 ② : 『급한 성미의 타이핑 폭주족』 (설계 없는 즉흥 제출)
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: hasTypingHabit ? '#ffa726' : '#b0bec5', color: 'white' }}>
                    {hasTypingHabit ? '주의' : '안정'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#5d4037', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                  문제 텍스트 독해 시 머무르는 Idle 타임이 극도로 짧고 문항당 평균 제출 오답수가 {stats.avgSubmits.toFixed(1)}회로 불안정합니다.
                </p>
                {hasTypingHabit && (
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ffa726', fontSize: '0.8rem', color: '#5d4037', lineHeight: '1.4' }}>
                    💡 <strong>교정 처방:</strong>{" "}
                    {prescriptionsLoading.typing_frenzy ? (
                      <span style={{ color: '#8d6e63' }}>🐣 병아리 선배가 처방전을 작성하고 있구... 📝</span>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: prescriptions.typing_frenzy || "데이터 분석 중이구..." }} />
                    )}
                  </div>
                )}
              </div>

              {/* 습관 3: 마우스 방황자 */}
              <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #ffcdd2', background: hasMouseHabit ? '#fff8f8' : '#fafafa', opacity: hasMouseHabit ? 1 : 0.55, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: hasMouseHabit ? '#c62828' : '#3e2723' }}>
                    📱 습관 ③ : 『마우스 방황자』 (모바일 확인 및 흐름 분산)
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: hasMouseHabit ? '#ef5350' : '#b0bec5', color: 'white' }}>
                    {hasMouseHabit ? '위험 감지' : '안정'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#5d4037', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                  마우스 포인터가 브라우저 가시 구역 밖으로 이탈하여 정지 상태를 유지하는 비율이 포착되었습니다. 집중의 맥락이 파탄 나 인지적 피로도가 가중될 수 있습니다.
                </p>
                {hasMouseHabit && (
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.8rem', color: '#5d4037', lineHeight: '1.4' }}>
                    💡 <strong>교정 처방:</strong>{" "}
                    {prescriptionsLoading.mouse_wander ? (
                      <span style={{ color: '#8d6e63' }}>🐣 병아리 선배가 처방전을 작성하고 있구... 📝</span>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: prescriptions.mouse_wander || "데이터 분석 중이구..." }} />
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 4: 동적 세션 완수도 이정표 카드 가동 */}
          <div style={{ background: '#efebe9', borderRadius: '16px', padding: '20px', border: '1px solid #d7ccc8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ maxWidth: '70%' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 'bold' }}>🎯 완수도 패러다임: 동적 세션 이정표 완수</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#5d4037', lineHeight: '1.45' }}>
                콘텐츠 뱅크의 확장 상황에 연동되어 고정 진척도 분모 대신 세션 타겟 다이내믹 목표식을 적용 중입니다. <br />
                현재 세션 완수 지표: <strong>{stats.passedCount} / {stats.totalCount} 문항 클리어 완료</strong>
              </p>
            </div>
            <button 
              className="clay-submit" 
              onClick={() => navigate('/play', { state: { chapter: stats.weakestChapter, count: 5, ratio: 50, difficulty: '중' } })} 
              style={{ padding: '10px 16px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              취약 챕터(Ch.{stats.weakestChapter}) 처방 ⚡
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
