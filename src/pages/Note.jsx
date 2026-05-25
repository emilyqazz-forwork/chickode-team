import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useNoteData } from '../hooks/useNoteData';

export function Note({ t }) {
  const navigate = useNavigate();
  const { wrongItems, loading } = useNoteData();

  // 필터 상태
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterChapter, setFilterChapter] = useState('all');
  const [filterWrongCount, setFilterWrongCount] = useState('desc');
  const [filterDate, setFilterDate] = useState(null);

  // 드롭다운 열림 상태
  const [openDropdown, setOpenDropdown] = useState(null);

  // 아코디언 열림 상태 + AI 분석 캐시
  const [openCards, setOpenCards] = useState({});
  const [analysisCache, setAnalysisCache] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState({});

  // 힌트 아코디언
  const [openHints, setOpenHints] = useState({});

  // AI 질문 모달
  const [aiModal, setAiModal] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatDisplayRef = useRef(null);

  useEffect(() => {
    if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
  }, [chatHistory]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = () => setOpenDropdown(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // 아코디언 토글 + AI 분석 호출
  const toggleCard = async (id, item) => {
    const isOpen = openCards[id];
    setOpenCards(prev => ({ ...prev, [id]: !isOpen }));

    if (!isOpen && !analysisCache[id]) {
      setAnalysisLoading(prev => ({ ...prev, [id]: true }));
      try {
        const { data, error } = await supabase.functions.invoke('note-analysis', {
          body: {
            templateCode: item.templateCode || '',
            userCode: item.user_code || '',
            correctAnswer: item.correctAnswer || '',
            title: item.title || '',
            description: item.description || '',
            unitLevel: item.unit_level || '기초',
          }
        });
        if (error) throw error;
        setAnalysisCache(prev => ({ ...prev, [id]: data }));
      } catch (err) {
        console.error('분석 실패:', err);
        setAnalysisCache(prev => ({
          ...prev,
          [id]: {
            annotatedAnswer: item.correctAnswer || '',
            wrongReason: '분석을 불러오지 못했어요.',
            hint: '🐤 병아리 선배가 잠시 자리를 비웠구... 조금 있다가 다시 열어봐 삐약!'
          }
        }));
      } finally {
        setAnalysisLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  // 빈칸 하이라이팅 + 내 답 주석 처리
  const renderTemplateWithHighlight = (templateCode, userCode) => {
    if (!templateCode) return null;
    const lines = templateCode.replace(/\\n/g, '\n').split('\n');
    return lines.map((line, i) => {
      if (line.includes('________')) {
        return (
          <div key={i}>
            <span style={{ background: 'rgba(255,80,80,0.2)', color: '#ff9999', padding: '0 4px', borderRadius: '3px' }}>
              {line.replace('________', '________')}
            </span>
            {userCode && (
              <div style={{ color: '#f0a500', fontStyle: 'italic' }}>
                {'  // 🟡 내가 쓴 답: '}{userCode}
              </div>
            )}
          </div>
        );
      }
      return <div key={i}>{line}</div>;
    });
  };

  // 필터링 + 정렬
  const getFiltered = () => {
    let list = [...wrongItems];
    if (filterDifficulty !== 'all') list = list.filter(i => i.unit_level === filterDifficulty);
    if (filterChapter !== 'all') list = list.filter(i => String(i.chapterNum) === String(filterChapter));
    if (filterDate) {
      const selected = new Date(filterDate).toDateString();
      list = list.filter(i => new Date(i.created_at).toDateString() === selected);
    }
    if (filterWrongCount === 'desc') list.sort((a, b) => b.wrongCount - a.wrongCount);
    else if (filterWrongCount === 'asc') list.sort((a, b) => a.wrongCount - b.wrongCount);
    return list;
  };

  // 챕터 목록 추출
  const chapters = [...new Set(wrongItems.map(i => i.chapterNum).filter(Boolean))].sort((a, b) => a - b);

  const openAiModal = (item) => {
    setAiModal(item);
    setChatHistory([{ role: 'bot', text: `'${item.title}' 문제에 대해 궁금한 거 물어봐! 삐약! 🐥` }]);
    setChatInput('');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !aiModal) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text }, { role: 'bot', text: '생각중이야 삐약... 🤔', thinking: true }]);
    try {
      const { data, error } = await supabase.functions.invoke('claude-prescription', {
        body: {
          habitType: 'tab_switch',
          stats: {},
          displayName: text,
        }
      });
      setChatHistory(prev => [...prev.filter(m => !m.thinking), { role: 'bot', text: data?.prescription || '답변을 불러오지 못했어 삐약!' }]);
    } catch {
      setChatHistory(prev => [...prev.filter(m => !m.thinking), { role: 'bot', text: '서버와 연결되지 않아서 대답하기 어려워 삐약! 🐥' }]);
    }
  };

  const displayedList = getFiltered();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f0e8', color: '#5d4037' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>⏳</div>
          <p style={{ marginTop: '16px', fontWeight: 'bold' }}>오답 데이터 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const dropdownStyle = {
    position: 'absolute', top: '110%', left: 0, zIndex: 100,
    background: 'white', border: '1px solid #e0d6c8', borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '140px', padding: '6px 0'
  };
  const dropdownItemStyle = {
    padding: '8px 16px', fontSize: '13px', color: '#3e2723', cursor: 'pointer',
    transition: 'background 0.15s'
  };
  const filterBtnStyle = (active) => ({
    padding: '6px 14px', borderRadius: '20px', border: '1px solid #d7ccc8',
    background: active ? '#5d4037' : 'white', color: active ? 'white' : '#5d4037',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer', position: 'relative'
  });

  return (
    <div style={{ background: '#f5f0e8', minHeight: '100vh', width: '100vw', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>

      {/* 상단 네비 */}
      <div style={{ background: '#3e2723', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}>
          ❮ 뒤로가기
        </button>
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>CHICKODE: 오답노트</span>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>

          {/* 난이도 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(filterDifficulty !== 'all')} onClick={() => setOpenDropdown(openDropdown === 'diff' ? null : 'diff')}>
              난이도 {filterDifficulty !== 'all' ? `· ${filterDifficulty}` : ''} ▾
            </button>
            {openDropdown === 'diff' && (
              <div style={dropdownStyle}>
                {['all', '기초', '중급', '고급'].map(v => (
                  <div key={v} style={{ ...dropdownItemStyle, fontWeight: filterDifficulty === v ? 'bold' : 'normal' }}
                    onClick={() => { setFilterDifficulty(v); setOpenDropdown(null); }}>
                    {v === 'all' ? '전체' : v}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 챕터 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(filterChapter !== 'all')} onClick={() => setOpenDropdown(openDropdown === 'ch' ? null : 'ch')}>
              챕터 {filterChapter !== 'all' ? `· Ch.${filterChapter}` : ''} ▾
            </button>
            {openDropdown === 'ch' && (
              <div style={dropdownStyle}>
                <div style={{ ...dropdownItemStyle, fontWeight: filterChapter === 'all' ? 'bold' : 'normal' }}
                  onClick={() => { setFilterChapter('all'); setOpenDropdown(null); }}>전체</div>
                {chapters.map(ch => (
                  <div key={ch} style={{ ...dropdownItemStyle, fontWeight: String(filterChapter) === String(ch) ? 'bold' : 'normal' }}
                    onClick={() => { setFilterChapter(ch); setOpenDropdown(null); }}>
                    Ch.{ch}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 틀린 횟수 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(false)} onClick={() => setOpenDropdown(openDropdown === 'wc' ? null : 'wc')}>
              틀린 횟수 ▾
            </button>
            {openDropdown === 'wc' && (
              <div style={dropdownStyle}>
                <div style={{ ...dropdownItemStyle, fontWeight: filterWrongCount === 'desc' ? 'bold' : 'normal' }}
                  onClick={() => { setFilterWrongCount('desc'); setOpenDropdown(null); }}>많은 순</div>
                <div style={{ ...dropdownItemStyle, fontWeight: filterWrongCount === 'asc' ? 'bold' : 'normal' }}
                  onClick={() => { setFilterWrongCount('asc'); setOpenDropdown(null); }}>적은 순</div>
              </div>
            )}
          </div>

          {/* 일시 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(!!filterDate)} onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}>
              일시 {filterDate ? `· ${filterDate}` : ''} ▾
            </button>
            {openDropdown === 'date' && (
              <div style={{ ...dropdownStyle, padding: '10px' }}>
                <input type="date" value={filterDate || ''} onChange={e => { setFilterDate(e.target.value); setOpenDropdown(null); }}
                  style={{ border: '1px solid #d7ccc8', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }} />
                {filterDate && (
                  <div style={{ ...dropdownItemStyle, color: '#ef5350', marginTop: '4px' }}
                    onClick={() => { setFilterDate(null); setOpenDropdown(null); }}>초기화</div>
                )}
              </div>
            )}
          </div>

          {/* 전체 오답 수 */}
          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#8d6e63', display: 'flex', alignItems: 'center' }}>
            총 {displayedList.length}개
          </div>
        </div>

        {/* 오답 없을 때 */}
        {displayedList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8d6e63' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🐥</div>
            <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>오답이 없어!</p>
            <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>문제를 풀면 여기에 자동으로 저장돼.</p>
          </div>
        )}

        {/* 아코디언 카드 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedList.map((item, idx) => {
            const cardId = item.id || idx;
            const isOpen = !!openCards[cardId];
            const analysis = analysisCache[cardId];
            const isAnalysisLoading = !!analysisLoading[cardId];
            const isHintOpen = !!openHints[cardId];

            return (
              <div key={cardId} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e0d6c8', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>

                {/* 아코디언 헤더 */}
                <div onClick={() => toggleCard(cardId, item)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#3e2723', marginBottom: '6px' }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {item.chapterNum && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#efebe9', color: '#5d4037' }}>Ch.{item.chapterNum}</span>
                      )}
                      {item.unit_level && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#e8f5e9', color: '#2e7d32' }}>{item.unit_level}</span>
                      )}
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#ffebee', color: '#c62828', fontWeight: 'bold' }}>
                        틀린 횟수 {item.wrongCount}회
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#f5f0e8', color: '#8d6e63' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#8d6e63', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                </div>

                {/* 아코디언 바디 */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f5f0e8', padding: '18px' }}>

                    {isAnalysisLoading ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#8d6e63', fontSize: '0.9rem' }}>
                        🐣 병아리 선배가 분석하고 있구... 📝
                      </div>
                    ) : (
                      <>
                        {/* 내가 쓴 답 */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8d6e63', marginBottom: '8px' }}>내가 쓴 답</div>
                          <div style={{ background: '#1e1e1e', borderRadius: '10px', padding: '14px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.8', overflowX: 'auto' }}>
                            {renderTemplateWithHighlight(item.templateCode, item.user_code)}
                          </div>
                        </div>

                        {/* 정답 코드 (주석 포함) */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8d6e63', marginBottom: '8px' }}>정답 코드</div>
                          <div style={{ background: '#1e1e1e', borderRadius: '10px', padding: '14px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.8', overflowX: 'auto' }}>
                            {(analysis?.annotatedAnswer || item.correctAnswer || '').split('\n').map((line, i) => (
                              <div key={i} style={{ color: line.trim().startsWith('//') ? '#6a9955' : '#d4d4d4' }}>{line}</div>
                            ))}
                          </div>
                        </div>

                        {/* 틀린 이유 */}
                        <div style={{ marginBottom: '12px', padding: '12px', background: '#fff5f5', borderLeft: '4px solid #ef5350', borderRadius: '0 8px 8px 0', fontSize: '13px', color: '#c62828', lineHeight: '1.6' }}>
                          <strong>왜 틀렸을까?</strong><br />
                          {analysis?.wrongReason || '분석 중...'}
                        </div>

                        {/* 병아리 쪽지 아코디언 */}
                        <div style={{ marginBottom: '16px', border: '1px dashed #ffa726', borderRadius: '10px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenHints(prev => ({ ...prev, [cardId]: !isHintOpen }))}
                            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff8e1' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e65100' }}>🐣 병아리 선배의 비밀 쪽지</span>
                            <span style={{ fontSize: '14px', color: '#e65100', transition: 'transform 0.2s', transform: isHintOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                          </div>
                          {isHintOpen && (
                            <div style={{ padding: '12px 14px', background: 'white', fontSize: '13px', color: '#5d4037', lineHeight: '1.7' }}
                              dangerouslySetInnerHTML={{ __html: analysis?.hint || '힌트를 불러오지 못했어 삐약!' }} />
                          )}
                        </div>

                        {/* 액션 버튼 */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => navigate('/play', { state: { chapter: item.chapterNum, count: 5, ratio: 50, difficulty: item.unit_level || '기초' } })}
                            style={{ padding: '8px 16px', borderRadius: '8px', background: '#ff8f00', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                            다시 풀기
                          </button>
                          <button onClick={() => openAiModal(item)}
                            style={{ padding: '8px 16px', borderRadius: '8px', background: '#5d4037', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                            AI에게 질문
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI 질문 모달 */}
      {aiModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setAiModal(null); }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', width: 'min(480px, 90vw)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '1rem', color: '#3e2723' }}>🐥 AI에게 질문</strong>
              <button onClick={() => setAiModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8d6e63' }}>×</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#8d6e63', marginBottom: '12px' }}>{aiModal.title}</p>
            <div ref={chatDisplayRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', padding: '8px', background: '#f5f0e8', borderRadius: '8px' }}>
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'bot' ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '12px', background: m.role === 'bot' ? 'white' : '#5d4037', color: m.role === 'bot' ? '#3e2723' : 'white', fontSize: '0.88rem' }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="병아리 선배에게 질문하기..." value={chatInput}
                onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d7ccc8', fontSize: '13px' }} />
              <button onClick={handleSendChat} style={{ padding: '8px 16px', borderRadius: '8px', background: '#5d4037', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>전송</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}