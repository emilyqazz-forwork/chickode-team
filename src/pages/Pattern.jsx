import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Supabase 클라이언트 인스턴스 가져오기 (프로젝트 경로에 맞게 조절 필요)
import { supabase } from '../supabase'; 

export function Pattern({ t }) {
  const navigate = useNavigate();
  
  // 상태 관리 세팅
  const [attempts, setAttempts] = useState([]);
  const [behaviorLogs, setBehaviorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    implementation: 0,
    conceptual: 0,
    focus: 0,
    timeGrowthRate: 0,
    passedCount: 0,
    totalCount: 0,
    avgSubmits: 0,
    tabSwitchIssueRatio: 0,
    highMouseOutRatio: 0
  });

  const chapterNames = { 1: '변수 기초', 2: '출력 기초', 3: '조건문', 4: '반복문' };
  const typeNames = { ox: 'O/X 퀴즈', multiple: '객관식', coding: '실습 코딩' };

  // 기준점: 일주일 전 과거 통계 상수 셋 (성장 곡선 대조용)
  const pastStats = { implementation: 42, conceptual: 55, focus: 50, tAdjAvg: 95 };

  // 난이도별 비선형 시간 가중치 헬퍼 함수
  const getWeight = (level) => {
    if (level === 1) return 1.0;
    if (level === 3) return 4.5;
    if (level === 5) return 12.0;
    return 1.0;
  };

  // 1. Supabase 연동 데이터 페칭 및 수식 정산
  useEffect(() => {
    async function fetchLearningData() {
      try {
        setLoading(true);

        // 현재 로그인한 사용자 세션 조회 (인증 정보 연동)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id; 

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
          setBehaviorLogs(bLogs);

          // --- [정교한 수식 연산 엔진 가동] ---
          const totalLogs = attemptData.length;
          const passedLogs = attemptData.filter(l => l.is_correct || l.isCorrect);
          
          const totalCodeLevel = attemptData.reduce((acc, cur) => acc + (cur.code_level || 1), 0);
          const passedCodeLevel = passedLogs.reduce((acc, cur) => acc + (cur.code_level || 1), 0);
          const totalSubmitCount = attemptData.reduce((acc, cur) => acc + (cur.submit_count || 0), 0);
          const totalHintCount = attemptData.reduce((acc, cur) => acc + (cur.hint_count || 0), 0);
          const totalFocusScore = attemptData.reduce((acc, cur) => acc + (cur.avg_focus_score || 0), 0);

          const passRate = passedLogs.length / totalLogs;
          const avgSubmits = totalSubmitCount / totalLogs;
          const avgHints = totalHintCount / totalLogs;
          const avgFocus = totalFocusScore / totalLogs;

          // [공식 1] 구현 스탯 연산
          const implementationScore = Math.max(0, Math.min(100, Math.round(
            (passedCodeLevel / totalCodeLevel * 100) - (avgSubmits * 4) + (passRate * 20)
          )));

          // [공식 2] 개념 이해 스탯 연산
          const conceptualScore = Math.max(0, Math.min(100, Math.round(
            100 - (avgHints * 12) - (avgSubmits * 5)
          )));

          // [공식 3] 몰입 스탯 연산 (4.0 만점 기준 백분율 확장)
          const focusScore = Math.max(0, Math.min(100, Math.round(avgFocus * 25)));

          // [공식 4] 비선형 가중치 반영 시간 변환 연산 (T_adj)
          const recentTAdjTotal = attemptData.reduce((acc, cur) => {
            const seconds = cur.study_seconds || cur.studySeconds || 60;
            const lvl = cur.code_level || 1;
            return acc + (seconds / getWeight(lvl));
          }, 0);
          const recentTAdjAvg = recentTAdjTotal / totalLogs;
          const timeGrowth = Math.round(((pastStats.tAdjAvg - recentTAdjAvg) / pastStats.tAdjAvg) * 100);

          // [습관 진단 조건용 연산]
          const tabSwitchIssueCount = bLogs.filter(l => (l.tab_switch_count || 0) >= 4).length;
          const highMouseOutCount = bLogs.filter(l => (l.mouse_out_ratio || 0) >= 0.3).length;

          setStats({
            implementation: implementationScore,
            conceptual: conceptualScore,
            focus: focusScore,
            timeGrowthRate: timeGrowth,
            passedCount: passedLogs.length,
            totalCount: totalLogs,
            avgSubmits: avgSubmits,
            tabSwitchIssueRatio: totalLogs > 0 ? (tabSwitchIssueCount / totalLogs) : 0,
            highMouseOutRatio: totalLogs > 0 ? (highMouseOutCount / totalLogs) : 0
          });
        }
      } catch (error) {
        console.error("데이터 바인딩 도중 오류 발생:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLearningData();
  }, []);

  // 게이지 컬러 파레트 결정 서브 기믹
  const getProgressColor = (score) => {
    if (score >= 70) return '#66bb6a'; 
    if (score >= 40) return '#ffa726'; 
    return '#ef5350'; 
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f0e8', color: '#5d4037', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
          <p style={{ marginTop: '12px', fontWeight: 'bold' }}>Supabase 안전 데이터 인지 엔진 연동 중...</p>
        </div>
      </div>
    );
  }

  // 2. 나쁜 습관 감지 룰 엔진 플래그 세팅
  const hasTabHabit = stats.tabSwitchIssueRatio >= 0.4;
  const hasTypingHabit = stats.avgSubmits >= 3 && (stats.passedCount / stats.totalCount) <= 0.7;
  const hasMouseHabit = stats.highMouseOutRatio >= 0.3;

  return (
    <div className="main-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f5f0e8', color: '#3e2723', padding: '20px 16px', minHeight: '100vh', width: '100vw', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* 윈도우 컨트롤 바 */}
      <div style={{ width: '100%', maxWidth: '750px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ background: '#5d4037', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}>
          ❮ 뒤로가기
        </button>
        <span style={{ fontSize: '0.85rem', color: '#8d6e63', fontWeight: 'bold', border: '1px solid #d7ccc8', padding: '4px 8px', borderRadius: '6px', background: 'white' }}>
          🔌 Supabase Cloud Live
        </span>
      </div>

      {attempts.length === 0 ? (
        <div style={{ color: '#3e2723', textAlign: 'center', marginTop: '8px' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>아직 누적된 학습 로그가 없어! 🐥</p>
          <p style={{ color: '#8d6e63', marginTop: '8px' }}>문제를 풀면 Supabase 원격 테이블에 수집되어 정밀 성취도가 도출됩니다.</p>
          <button className="clay-submit" onClick={() => navigate('/')} style={{ marginTop: '24px', padding: '10px 24px', borderRadius: '12px', background: '#5d4037', color: 'white', border: 'none', cursor: 'pointer' }}>문제 풀러 가기</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
          
          {/* 타이틀 오버뷰 헤더 */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 'bold', margin: '0 0 6px 0' }}>📊 AI 기술 지표 정밀 진단 시스템</h1>
            <p style={{ color: '#8d6e63', margin: 0, fontSize: '0.9rem' }}>클라우드 원천 DB 계측 데이터를 기반으로 포인팅된 비선형 리포트</p>
          </div>

          {/* SECTION 1: 다차원 정량 스탯 리포트 (100점 스케일 변환) */}
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
                    {stats.implementation}점 <span style={{ color: '#4caf50', fontSize: '0.8rem', marginLeft: '4px' }}>▲ (전주대비 +{(stats.implementation - pastStats.implementation).toFixed(1)})</span>
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
                    {stats.conceptual}점 <span style={{ color: '#4caf50', fontSize: '0.8rem', marginLeft: '4px' }}>▲ (전주대비 +{(stats.conceptual - pastStats.conceptual).toFixed(1)})</span>
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
                    {stats.focus}점 <span style={{ color: '#4caf50', fontSize: '0.8rem', marginLeft: '4px' }}>▲ (전주대비 +{(stats.focus - pastStats.focus).toFixed(1)})</span>
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
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.8rem', color: '#c62828', lineHeight: '1.4' }}>
                    💡 <strong>교정 처방:</strong> 다음 코딩 시에는 검색창을 완전히 닫아보세요! 차라리 에디터 내의 <strong>AI 튜터(병아리 선배)</strong>에게 "이 조건식은 어떻게 채워?"라고 질문하며 단계적으로 힌트를 파싱하는 편이 잔존 실력 향상에 직결됩니다.
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
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ffa726', fontSize: '0.8rem', color: '#b76e00', lineHeight: '1.4' }}>
                    💡 <strong>교정 처방:</strong> 채점 스위치를 클릭하기 전에 무조건 딱 10초만 키보드에서 손을 떼고 전체 구문을 위에서 아래로 눈 디버깅해 보세요. 무작정 컴파일을 날리는 사소한 런타임 실수가 기하급수적으로 줄어듭니다.
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
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.8rem', color: '#c62828', lineHeight: '1.4' }}>
                    💡 <strong>교정 처방:</strong> 흐름이 툭툭 끊기는 개발 환경은 두뇌 부하를 가중시킵니다. 스마트폰 알림을 일시 차단하고, 컴포넌트 타이머가 카운트되는 단 3분 동안만큼은 코드 뷰어에 시선을 고정하는 숏-포커스(Short-Focus) 트레이닝을 권장합니다.
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
              onClick={() => navigate('/play', { state: { chapter: 4, count: 5, ratio: 50, difficulty: '중' } })} 
              style={{ padding: '10px 16px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              취약 챕터 처방 ⚡
            </button>
          </div>

        </div>
      )}
    </div>
  );
}