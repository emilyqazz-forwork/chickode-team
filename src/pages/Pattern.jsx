import React from 'react';
import { useNavigate } from 'react-router-dom';
// 격리시킨 연산 유틸 및 상수 가져오기
import { PAST_STATS_BASELINE } from '../utils/scoring';
import { StatSection } from '../components/pattern/StatSection';
import { usePatternData } from '../hooks/usePatternData';

// CLAUDE_API_KEY 제거 — API 키는 Supabase Edge Function 서버에만 존재 (클라이언트 노출 방지)

export function Pattern({ t }) {
  const navigate = useNavigate();
  
  const { attempts, loading, stats, prescriptions, prescriptionsLoading } = usePatternData();

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
          <StatSection stats={stats} />

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
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.8rem', color: '#5d4037', lineHeight: '1.4', maxHeight: '80px', overflowY: 'auto'  }}>
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
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ffa726', fontSize: '0.8rem', color: '#5d4037', lineHeight: '1.4', maxHeight: '80px', overflowY: 'auto' }}>
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
                  <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.8rem', color: '#5d4037', lineHeight: '1.4', maxHeight: '80px', overflowY: 'auto' }}>
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