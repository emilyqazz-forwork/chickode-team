import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PAST_STATS_BASELINE } from '../utils/scoring';
import { StatSection } from '../components/pattern/StatSection';
import { usePatternData } from '../hooks/usePatternData';
import { JAVA_CHAPTERS, PYTHON_CHAPTERS, C_CHAPTERS } from '../data/constants';

export function Pattern({ t }) {
  const navigate = useNavigate();
  
  const { attempts, loading, stats, prescriptions, prescriptionsLoading } = usePatternData();

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: '#f5f0e8', color: '#3e2723',
        minHeight: '100vh', width: '100vw',
        boxSizing: 'border-box', overflowY: 'auto',
        fontFamily: 'sans-serif'
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />

        {/* 갈색 바 */}
        <div style={{ background: '#3e2723', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ❮ 뒤로가기
          </button>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>CHICKODE: 패턴 분석</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px' }}>
            🔌 Supabase Cloud Live
          </span>
        </div>

        {/* 로딩 메시지 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>🐣</div>
          <p style={{ marginTop: '16px', fontWeight: 'bold', fontSize: '1.05rem', color: '#3e2723' }}>
            병아리 선배가 학습 지표 가져오는 중...
          </p>
          <p style={{ fontSize: '0.85rem', color: '#8d6e63' }}>
            잠깐만 기다려봐 삐약!
          </p>
        </div>
      </div>
    );
  }

  const hasTabHabit = stats.tabSwitchIssueRatio >= 0.4;
  const hasTypingHabit = stats.avgSubmits >= 3 && (stats.totalCount > 0 ? (stats.passedCount / stats.totalCount) <= 0.7 : false);
  const hasMouseHabit = stats.highMouseOutRatio >= 0.3;

  const resolveChapterId = (weakest) => {
    if (!weakest) return 'java_basic_c1';
    if (typeof weakest === 'string' && weakest.includes('_')) return weakest;
    return `java_basic_c${weakest}`;
  };

  const parseUnitLocal = (unit = '') => {
    const match = unit.match(/^(java|py|c)_(basic|mid|adv)_(c\d+)/);
    if (!match) return { lang: null, chapterId: null };
    const lang = match[1];
    const level = match[2];
    const chapterId = `${lang}_${level}_${match[3]}`;
    return { lang, chapterId };
  };

  const LANG_LABEL = { java: 'Java', py: 'Python', c: 'C언어' };

  const wrongAttempts = attempts.filter(a => a.is_correct === false);

  const langCount = {};
  const chapterCount = {};
  wrongAttempts.forEach(a => {
    const { lang, chapterId } = parseUnitLocal(a.unit || '');
    if (!lang) return;
    langCount[lang] = (langCount[lang] || 0) + 1;
    if (chapterId) chapterCount[chapterId] = (chapterCount[chapterId] || 0) + 1;
  });

  const weakestLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
  const weakestChapterEntry = Object.entries(chapterCount).sort((a, b) => b[1] - a[1])[0];
  const weakestLangKey = weakestLang?.[0];
  const weakestChapterId = weakestChapterEntry?.[0];
  const weakestChapterCount = weakestChapterEntry?.[1];
  const chapterNum = weakestChapterId?.match(/c(\d+)$/)?.[1] ?? '?';

  const getChapterTitle = (chapterId) => {
    if (!chapterId) return '';
    const match = chapterId.match(/^(java|py|c)_(basic|mid|adv)_(c\d+)/);
    if (!match) return '';
    const [, lang, level, ] = match;
    const map = { java: JAVA_CHAPTERS, py: PYTHON_CHAPTERS, c: C_CHAPTERS };
    const chapters = map[lang]?.[level] || [];
    const found = chapters.find(ch => ch.id === chapterId);
    return found?.title?.split(':')?.[1]?.trim() || '';
  };

  const chapterTitle = getChapterTitle(weakestChapterId);
  const LEVEL_LABEL = { basic: '기초', mid: '중급', adv: '고급' };
  const weakestLevel = weakestChapterId?.match(/^(?:java|py|c)_(basic|mid|adv)/)?.[1] ?? null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: '#f5f0e8', color: '#3e2723',
      minHeight: '100vh', width: '100vw',
      boxSizing: 'border-box',
      position: 'fixed', top: 0, left: 0,
      height: '100vh', overflowY: 'auto', overflowX: 'hidden'
    }}>

      {/* 갈색 바 — 전체 너비 */}
      <div style={{ background: '#3e2723', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ❮ 뒤로가기
        </button>
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>CHICKODE: 패턴 분석</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px' }}>
          🔌 Supabase Cloud Live
        </span>
      </div>

      {/* 콘텐츠 영역 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px' }}>

        {attempts.length === 0 ? (
          <div style={{ color: '#3e2723', textAlign: 'center', marginTop: '40px' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>아직 누적된 학습 로그가 없어! 🐥</p>
            <p style={{ color: '#8d6e63', marginTop: '8px' }}>문제를 풀면 Supabase 원격 테이블에 수집되어 정밀 성취도가 도출됩니다.</p>
            <button className="clay-submit" onClick={() => navigate('/')} style={{ marginTop: '24px', padding: '10px 24px', borderRadius: '12px', background: '#5d4037', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              문제 풀러 가기
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 6px 0' }}>📊 AI 기술 지표 정밀 진단 시스템</h1>
              <p style={{ color: '#8d6e63', margin: 0, fontSize: '0.9rem' }}>내 학습 데이터를 분석해 만든 맞춤 리포트예요</p>
            </div>

            <StatSection stats={stats} />

            {/* SECTION 3: 학습 습관 분석 */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px 24px', border: '1px solid #e0d6c8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🚨</span> 학습 습관 분석
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#8d6e63', margin: '0 0 20px 0' }}>CHICK CAM이 감지한 집중력 방해 패턴이에요</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #ffcdd2', background: hasTabHabit ? '#fff8f8' : '#fafafa', opacity: hasTabHabit ? 1 : 0.55, transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: hasTabHabit ? '#c62828' : '#3e2723' }}>
                      🏃 습관 ① : 탭 자주 이탈해요
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: hasTabHabit ? '#ef5350' : '#66bb6a', color: 'white' }}>
                      {hasTabHabit ? '위험 감지' : '안정'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#5d4037', margin: '0 0 10px 0', lineHeight: '1.65' }}>
                    문제 풀 때 다른 탭으로 이동한 횟수가 많아요. 답을 먼저 찾아보는 습관이 생겼을 수 있어요.
                  </p>
                  {hasTabHabit && (
                    <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.95rem', color: '#5d4037', lineHeight: '1.6' }}>
                      💡 <strong>교정 처방:</strong>{" "}
                      {prescriptionsLoading.tab_switch ? (
                        <span style={{ color: '#8d6e63' }}>🐣 병아리 선배가 처방전을 작성하고 있구... 📝</span>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: prescriptions.tab_switch || "데이터 분석 중이구..." }} />
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #ffe082', background: hasTypingHabit ? '#fffbf0' : '#fafafa', opacity: hasTypingHabit ? 1 : 0.55, transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: hasTypingHabit ? '#b76e00' : '#3e2723' }}>
                      🏎️ 습관 ② : 너무 빨리 제출해요
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: hasTypingHabit ? '#ffa726' : '#66bb6a', color: 'white' }}>
                      {hasTypingHabit ? '주의' : '안정'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#5d4037', margin: '0 0 10px 0', lineHeight: '1.65' }}>
                    문항당 평균 {Math.round(stats.avgSubmits)}번 틀리고 있어요. 제출 전에 한 번 더 확인해봐요!
                  </p>
                  {hasTypingHabit && (
                    <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ffa726', fontSize: '0.95rem', color: '#5d4037', lineHeight: '1.6' }}>
                      💡 <strong>교정 처방:</strong>{" "}
                      {prescriptionsLoading.typing_frenzy ? (
                        <span style={{ color: '#8d6e63' }}>🐣 병아리 선배가 처방전을 작성하고 있구... 📝</span>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: prescriptions.typing_frenzy || "데이터 분석 중이구..." }} />
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid #ffcdd2', background: hasMouseHabit ? '#fff8f8' : '#fafafa', opacity: hasMouseHabit ? 1 : 0.55, transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: hasMouseHabit ? '#c62828' : '#3e2723' }}>
                      📱 습관 ③ : 마우스가 자꾸 나가요
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: hasMouseHabit ? '#ef5350' : '#66bb6a', color: 'white' }}>
                      {hasMouseHabit ? '위험 감지' : '안정'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#5d4037', margin: '0 0 10px 0', lineHeight: '1.65' }}>
                    마우스가 화면 밖에 머무는 시간이 길어요. 폰을 자주 확인하고 있는 건 아닌가요?
                  </p>
                  {hasMouseHabit && (
                    <div style={{ padding: '10px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #ef5350', fontSize: '0.95rem', color: '#5d4037', lineHeight: '1.6' }}>
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

            {/* SECTION 4: 취약 언어 + 챕터 분석 */}
            <div style={{ background: '#efebe9', borderRadius: '16px', padding: '28px 24px', border: '1px solid #d7ccc8', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: '800' }}>🎯 취약 언어 · 챕터 정밀 분석</h3>
              <p style={{ fontSize: '0.95rem', fontWeight: '800', color: '#8d6e63', margin: '0 0 16px 0' }}>오답 패턴과 학습 습관을 연결한 병아리 선배의 진단이에요</p>

              {wrongAttempts.length === 0 ? (
                <p style={{ color: '#8d6e63', fontSize: '0.95rem', textAlign: 'center' }}>
                  아직 오답 데이터가 없어요! 문제를 풀면 취약 분석이 시작돼요 🐥
                </p>
              ) : (
                <>
                  <div style={{ padding: '14px', background: 'white', borderRadius: '12px', borderLeft: '4px solid #c62828', fontSize: '0.95rem', color: '#3e2723', lineHeight: '1.7', marginBottom: '20px' }}>
                    {prescriptionsLoading.weakness_analysis ? (
                      <span style={{ color: '#8d6e63', fontStyle: 'italic' }}>🐣 병아리 선배가 오답 데이터를 들여다보며 취약 패턴을 분석하고 있구... 📝</span>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: prescriptions.weakness_analysis || "데이터 분석 중이구..." }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.82rem', color: '#5d4037' }}>가장 취약한 챕터</p>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#c62828' }}>
                        {LANG_LABEL[weakestLangKey]} · {LEVEL_LABEL[weakestLevel]} · Ch.{chapterNum}{chapterTitle ? ` · ${chapterTitle}` : ''}
                        <span style={{ fontWeight: 'normal', fontSize: '0.8rem', color: '#8d6e63', marginLeft: '8px' }}>
                          ({weakestChapterCount}회 오답)
                        </span>
                      </p>
                    </div>
                    <button
                      className="clay-submit"
                      onClick={() => navigate('/play', {
                        state: {
                          chapter: weakestChapterId || resolveChapterId(stats.weakestChapter),
                          count: 5,
                          ratio: 50,
                          difficulty: '기초',
                        }
                      })}
                      style={{ padding: '10px 16px', background: '#c62828', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      취약 챕터 처방 ⚡
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}