/*사용자가 지금까지 풀어본 문제들의 패턴을 분석해서 보여주는 페이지입니다. 챕터별, 유형별로 얼마나 맞췄는지 시각적으로 보여주고, 특히 취약한 챕터를 콕 집어서 다시 풀어볼 수 있게 유도하는 기능이 핵심입니다.*/
/*전체 삭제 후 다시 만들거나 수정필요*/


import { useNavigate } from 'react-router-dom';
import { getAttempts, summarizeAttempts } from '../state/app-state';

export function Pattern({ t }) {
  const navigate = useNavigate();
  const attempts = getAttempts();
  const summary = summarizeAttempts(attempts);

  const chapterNames = { 1: '변수 기초', 2: '출력 기초', 3: '조건문', 4: '반복문' };
  const typeNames = { ox: 'O/X 퀴즈', multiple: '객관식', coding: '실습 코딩' };

  const maxChapterTotal = Math.max(...Object.values(summary.byChapter).map(v => v.total), 1);
  const maxTypeTotal = Math.max(...Object.values(summary.byType).map(v => v.total), 1);

  return (
    <div className="main-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflowY: 'auto', background: '#f5f0e8', color: '#3e2723', padding: '0', minHeight: '100vh', width: '100vw' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 999, width: '100%', display: 'flex', alignItems: 'center', padding: '10px 16px 10px 0', background: 'transparent', pointerEvents: 'none', boxSizing: 'border-box' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ position: 'fixed', top: '14px', left: '60px', zIndex: 100, background: '#5d4037', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', pointerEvents: 'auto' }}>
          ❮ 뒤로가기
        </button>
      </div>

      <h1 style={{ color: '#3e2723', fontSize: '1.8rem', padding: '10px 0 10px', marginBottom: '30px' }}>{t('nav_pattern')}</h1>

      {attempts.length === 0 ? (
        <div style={{ color: '#3e2723', textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '1.2rem' }}>아직 풀어본 문제가 없어! 🐥</p>
          <p style={{ color: '#8d6e63' }}>문제를 풀면 여기에 패턴이 보여.</p>
          <button className="clay-submit" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>문제 풀러 가기</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px' }}>

          {/* 전체 요약 */}
          <div style={{ background: 'white', color: '#3e2723', border: '1px solid #e0d6c8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>📊 전체 요약</h2>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.total}</div>
                <div style={{ color: '#8d6e63', fontSize: '0.85rem' }}>전체 시도</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#55ff55' }}>{summary.correct}</div>
                <div style={{ color: '#8d6e63', fontSize: '0.85rem' }}>정답</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff5555' }}>{summary.wrong}</div>
                <div style={{ color: '#8d6e63', fontSize: '0.85rem' }}>오답</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f9a825' }}>
                  {summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0}%
                </div>
                <div style={{ color: '#8d6e63', fontSize: '0.85rem' }}>정답률</div>
              </div>
            </div>
          </div>

          {/* 챕터별 분석 */}
          <div style={{ background: 'white', color: '#3e2723', border: '1px solid #e0d6c8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>📚 챕터별 분석</h2>
            {Object.entries(summary.byChapter).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([ch, data]) => {
              const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return (
                <div key={ch} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span>Ch{ch}. {chapterNames[ch] || `챕터 ${ch}`}</span>
                    <span style={{ color: '#8d6e63' }}>{data.correct}/{data.total} ({accuracy}%)</span>
                  </div>
                  <div style={{ background: '#ede8e0', borderRadius: '8px', height: '14px', overflow: 'hidden' }}>
                    <div style={{ width: `${(data.total / maxChapterTotal) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.3)', borderRadius: '8px', position: 'relative' }}>
                      <div style={{ width: `${accuracy}%`, height: '100%', background: accuracy >= 70 ? '#55ff55' : accuracy >= 40 ? '#f9a825' : '#ff5555', borderRadius: '8px' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 유형별 분석 */}
          <div style={{ background: 'white', color: '#3e2723', border: '1px solid #e0d6c8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>🎯 유형별 분석</h2>
            {Object.entries(summary.byType).map(([type, data]) => {
              const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return (
                <div key={type} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span>{typeNames[type] || type}</span>
                    <span style={{ color: '#8d6e63' }}>{data.correct}/{data.total} ({accuracy}%)</span>
                  </div>
                  <div style={{ background: '#ede8e0', borderRadius: '8px', height: '14px', overflow: 'hidden' }}>
                    <div style={{ width: `${(data.total / maxTypeTotal) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.3)', borderRadius: '8px', position: 'relative' }}>
                      <div style={{ width: `${accuracy}%`, height: '100%', background: accuracy >= 70 ? '#55ff55' : accuracy >= 40 ? '#f9a825' : '#ff5555', borderRadius: '8px' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 취약 챕터 */}
          {Object.entries(summary.byChapter).filter(([, d]) => d.total > 0 && (d.correct / d.total) < 0.5).length > 0 && (
            <div style={{ background: '#fff5f5', color: '#3e2723', border: '1px solid #ffcccc', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>⚠️ 취약 챕터</h2>
              {Object.entries(summary.byChapter)
                .filter(([, d]) => d.total > 0 && (d.correct / d.total) < 0.5)
                .map(([ch, data]) => (
                  <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span>Ch{ch}. {chapterNames[ch] || `챕터 ${ch}`} — 정답률 {Math.round((data.correct / data.total) * 100)}%</span>
                    <button className="clay-submit" onClick={() => navigate('/play', { state: { chapter: parseInt(ch), count: 5, ratio: 50, difficulty: '중' } })} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                      다시 풀기
                    </button>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
