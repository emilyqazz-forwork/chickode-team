import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useNoteData } from '../hooks/useNoteData';
import { JAVA_CHAPTERS, PYTHON_CHAPTERS, C_CHAPTERS } from '../data/constants';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

// 언어 코드 → 한글 표시명
const LANG_LABEL = { java: 'Java', py: 'Python', c: 'C언어' };

// 난이도 코드 → 한글 표시명
const LEVEL_LABEL = { basic: '기초', mid: '중급', adv: '고급' };

// 언어 + 난이도로 단원 목록 가져오기
function getChapters(lang, level) {
  if (!lang || !level) return [];
  const map = { java: JAVA_CHAPTERS, py: PYTHON_CHAPTERS, c: C_CHAPTERS };
  return map[lang]?.[level] || [];
}

// 언어별 CodeMirror extension 선택
function getLangExtension(lang) {
  if (lang === 'py') return python();
  if (lang === 'c') return cpp();
  return java(); // 기본값 java
}

export function Note({ t }) {
  const navigate = useNavigate();
  const { wrongItems, loading } = useNoteData();

  // 필터 상태 — 언어 → 난이도 → 단원 순서로 연동
  const [filterLang, setFilterLang] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterChapter, setFilterChapter] = useState('all');
  const [filterWrongCount, setFilterWrongCount] = useState('desc');
  const [filterDate, setFilterDate] = useState(null);

  // 드롭다운 열림 상태
  const [openDropdown, setOpenDropdown] = useState(null);

  // 아코디언 열림 상태 + AI 분석 캐시
  const [openCards, setOpenCards] = useState({});
  const [analysisCache, setAnalysisCache] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState({});

  // 병아리 쪽지 아코디언
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

  // 언어 바뀌면 난이도, 단원 초기화
  const handleLangChange = (lang) => {
    setFilterLang(lang);
    setFilterLevel('all');
    setFilterChapter('all');
    setOpenDropdown(null);
  };

  // 난이도 바뀌면 단원 초기화
  const handleLevelChange = (level) => {
    setFilterLevel(level);
    setFilterChapter('all');
    setOpenDropdown(null);
  };

  // 현재 선택된 언어 + 난이도에 맞는 단원 목록
  const availableChapters = getChapters(filterLang, filterLevel);

  // 아코디언 토글 + AI 분석 호출 (처음 열 때만 Claude API 호출, 이후엔 캐시 사용)
  const toggleCard = async (id, item) => {

    console.log('templateCode:', item.templateCode);
    console.log('user_code:', item.user_code);
    console.log('correctAnswer:', item.correctAnswer);

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
            annotatedAnswer: null,
            wrongReason: '분석을 불러오지 못했어요.',
            hint: '🐤 병아리 선배가 잠시 자리를 비웠구... 조금 있다가 다시 열어봐 삐약!'
          }
        }));
      } finally {
        setAnalysisLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  // 내가 쓴 답 — ________를 user_code로 교체한 문자열 반환
  const renderMyCodeValue = (templateCode, userCode) => {
    if (!templateCode) return '// 코드 없음';
    const cleaned = templateCode.replace(/\\n/g, '\n');
    // 케이스 1: ________ 있으면 교체
    if (cleaned.includes('________')) {
      return cleaned.replace('________', userCode || '');
    }
    // 케이스 2, 3: ________ 없으면 template + userCode 병합
    return cleaned + '\n\n// 🟡 내가 쓴 답:\n' + (userCode || '');
  };

  // 정답 코드 — Claude 주석 있으면 annotatedAnswer 사용, 없으면 template + answer 교체
  const renderCorrectCodeValue = (templateCode, answer, annotatedAnswer) => {
    if (annotatedAnswer) return annotatedAnswer.replace(/\\n/g, '\n');
    if (!templateCode) return (answer || '').replace(/\\n/g, '\n');
    const cleaned = templateCode.replace(/\\n/g, '\n');
    // 케이스 1: ________ 있으면 교체
    if (cleaned.includes('________')) {
      return cleaned.replace('________', (answer || '').replace(/\\n/g, '\n'));
    }
    // 케이스 3: template이 주석 한 줄이면 answer가 전체 코드
    return (answer || '').replace(/\\n/g, '\n');
  };

  // 필터링 + 정렬
  const getFiltered = () => {
    let list = [...wrongItems];

    // 언어 필터
    if (filterLang !== 'all') list = list.filter(i => i.lang === filterLang);

    // 난이도 필터
    if (filterLevel !== 'all') list = list.filter(i => i.level === filterLevel);

    // 단원 필터
    if (filterChapter !== 'all') list = list.filter(i => i.chapterId === filterChapter);

    // 날짜 필터
    if (filterDate) {
      const selected = new Date(filterDate).toDateString();
      list = list.filter(i => new Date(i.created_at).toDateString() === selected);
    }

    // 틀린 횟수 정렬
    if (filterWrongCount === 'desc') list.sort((a, b) => b.wrongCount - a.wrongCount);
    else if (filterWrongCount === 'asc') list.sort((a, b) => a.wrongCount - b.wrongCount);

    return list;
  };

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
      const { data, error } = await supabase.functions.invoke('note-analysis', {
        body: {
          templateCode: aiModal.templateCode || '',
          userCode: aiModal.user_code || '',
          correctAnswer: aiModal.correctAnswer || '',
          title: aiModal.title || '',
          description: text,
          unitLevel: aiModal.unit_level || '기초',
        }
      });
      if (error) throw error;
      setChatHistory(prev => [...prev.filter(m => !m.thinking), { role: 'bot', text: data?.hint || '답변을 불러오지 못했어 삐약!' }]);
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
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '160px', padding: '6px 0'
  };
  const dropdownItemStyle = (active) => ({
    padding: '8px 16px', fontSize: '13px', color: active ? '#3e2723' : '#5d4037',
    fontWeight: active ? 'bold' : 'normal', cursor: 'pointer',
    background: active ? '#f5f0e8' : 'transparent'
  });
  const filterBtnStyle = (active) => ({
    padding: '6px 14px', borderRadius: '20px', border: '1px solid #d7ccc8',
    background: active ? '#5d4037' : 'white', color: active ? 'white' : '#5d4037',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer', position: 'relative',
    whiteSpace: 'nowrap'
  });

  return (
    // position: fixed + height: 100vh + overflowY: auto — 배경 이미지 완전히 덮고 스크롤 가능
    <div style={{ background: '#f5f0e8', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflowY: 'auto', overflowX: 'hidden', fontFamily: 'sans-serif', zIndex: 10 }}>

      {/* 상단 네비 */}
      <div style={{ background: '#3e2723', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}>
          ❮ 뒤로가기
        </button>
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>CHICKODE: 오답노트</span>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* 1. 언어 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(filterLang !== 'all')} onClick={() => setOpenDropdown(openDropdown === 'lang' ? null : 'lang')}>
              {filterLang === 'all' ? '언어' : LANG_LABEL[filterLang]} ▾
            </button>
            {openDropdown === 'lang' && (
              <div style={dropdownStyle}>
                <div style={dropdownItemStyle(filterLang === 'all')} onClick={() => handleLangChange('all')}>전체</div>
                {Object.entries(LANG_LABEL).map(([key, label]) => (
                  <div key={key} style={dropdownItemStyle(filterLang === key)} onClick={() => handleLangChange(key)}>{label}</div>
                ))}
              </div>
            )}
          </div>

          {/* 2. 난이도 — 언어 선택 시에만 활성화 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              style={{ ...filterBtnStyle(filterLevel !== 'all'), opacity: filterLang === 'all' ? 0.4 : 1, cursor: filterLang === 'all' ? 'not-allowed' : 'pointer' }}
              onClick={() => { if (filterLang !== 'all') setOpenDropdown(openDropdown === 'level' ? null : 'level'); }}
            >
              {filterLevel === 'all' ? '난이도' : LEVEL_LABEL[filterLevel]} ▾
            </button>
            {openDropdown === 'level' && (
              <div style={dropdownStyle}>
                <div style={dropdownItemStyle(filterLevel === 'all')} onClick={() => handleLevelChange('all')}>전체</div>
                {Object.entries(LEVEL_LABEL).map(([key, label]) => (
                  <div key={key} style={dropdownItemStyle(filterLevel === key)} onClick={() => handleLevelChange(key)}>{label}</div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 단원 — 언어 + 난이도 선택 시에만 활성화 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              style={{ ...filterBtnStyle(filterChapter !== 'all'), opacity: (filterLang === 'all' || filterLevel === 'all') ? 0.4 : 1, cursor: (filterLang === 'all' || filterLevel === 'all') ? 'not-allowed' : 'pointer' }}
              onClick={() => { if (filterLang !== 'all' && filterLevel !== 'all') setOpenDropdown(openDropdown === 'ch' ? null : 'ch'); }}
            >
              {filterChapter === 'all' ? '단원' : availableChapters.find(c => c.id === filterChapter)?.title?.split(':')[1]?.trim() || '단원'} ▾
            </button>
            {openDropdown === 'ch' && (
              <div style={{ ...dropdownStyle, minWidth: '200px' }}>
                <div style={dropdownItemStyle(filterChapter === 'all')} onClick={() => { setFilterChapter('all'); setOpenDropdown(null); }}>전체</div>
                {availableChapters.map(ch => (
                  <div key={ch.id} style={dropdownItemStyle(filterChapter === ch.id)} onClick={() => { setFilterChapter(ch.id); setOpenDropdown(null); }}>
                    {ch.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. 틀린 횟수 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(false)} onClick={() => setOpenDropdown(openDropdown === 'wc' ? null : 'wc')}>
              틀린 횟수 ▾
            </button>
            {openDropdown === 'wc' && (
              <div style={dropdownStyle}>
                <div style={dropdownItemStyle(filterWrongCount === 'desc')} onClick={() => { setFilterWrongCount('desc'); setOpenDropdown(null); }}>많은 순</div>
                <div style={dropdownItemStyle(filterWrongCount === 'asc')} onClick={() => { setFilterWrongCount('asc'); setOpenDropdown(null); }}>적은 순</div>
              </div>
            )}
          </div>

          {/* 5. 일시 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button style={filterBtnStyle(!!filterDate)} onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}>
              {filterDate ? filterDate : '일시'} ▾
            </button>
            {openDropdown === 'date' && (
              <div style={{ ...dropdownStyle, padding: '10px' }}>
                <input type="date" value={filterDate || ''} onChange={e => { setFilterDate(e.target.value); setOpenDropdown(null); }}
                  style={{ border: '1px solid #d7ccc8', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }} />
                {filterDate && (
                  <div style={{ ...dropdownItemStyle(false), color: '#ef5350', marginTop: '4px' }}
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
                      {/* 언어 태그 */}
                      {item.lang && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#e3f2fd', color: '#1565c0' }}>
                          {LANG_LABEL[item.lang] || item.lang}
                        </span>
                      )}
                      {/* 챕터 태그 */}
                      {item.chapterNum && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#efebe9', color: '#5d4037' }}>
                          Ch.{item.chapterNum}
                        </span>
                      )}
                      {/* 난이도 태그 */}
                      {item.unit_level && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#e8f5e9', color: '#2e7d32' }}>
                          {item.unit_level}
                        </span>
                      )}
                      {/* 틀린 횟수 태그 */}
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#ffebee', color: '#c62828', fontWeight: 'bold' }}>
                        틀린 횟수 {item.wrongCount}회
                      </span>
                      {/* 날짜 태그 */}
                      <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#f5f0e8', color: '#8d6e63' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#8d6e63', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▾</span>
                </div>

                {/* 아코디언 바디 */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f5f0e8', padding: '18px' }}>

                    {/* 내가 쓴 답 — 즉시 표시 */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8d6e63', marginBottom: '8px' }}>내가 쓴 답</div>
                      <CodeMirror
                        value={renderMyCodeValue(item.templateCode, item.user_code)}
                        extensions={[getLangExtension(item.lang)]}
                        theme={oneDark}
                        editable={false}
                        basicSetup={{ lineNumbers: true, foldGutter: false }}
                        style={{ borderRadius: '10px', overflow: 'hidden', fontSize: '12px' }}
                      />
                    </div>

                    {/* 정답 코드 — 즉시 표시, Claude 완료 후 주석 추가 */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8d6e63', marginBottom: '8px' }}>
                        정답 코드 {isAnalysisLoading && <span style={{ color: '#ffa726', fontWeight: 'normal' }}>— 🐣 주석 추가 중...</span>}
                      </div>
                      <CodeMirror
                        value={renderCorrectCodeValue(item.templateCode, item.correctAnswer, analysis?.annotatedAnswer)}
                        extensions={[getLangExtension(item.lang)]}
                        theme={oneDark}
                        editable={false}
                        basicSetup={{ lineNumbers: true, foldGutter: false }}
                        style={{ borderRadius: '10px', overflow: 'hidden', fontSize: '12px' }}
                      />
                    </div>

                    {/* 틀린 이유 — Claude 완료 후 표시 */}
                    {isAnalysisLoading ? (
                      <div style={{ padding: '12px', background: '#f5f0e8', borderRadius: '8px', fontSize: '13px', color: '#8d6e63', marginBottom: '12px' }}>
                        🐣 병아리 선배가 분석하고 있구... 📝
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: '12px', padding: '12px', background: '#fff5f5', borderLeft: '4px solid #ef5350', borderRadius: '0 8px 8px 0', fontSize: '13px', color: '#c62828', lineHeight: '1.6' }}>
                          <strong>왜 틀렸을까?</strong><br />
                          {analysis?.wrongReason || '분석을 불러오지 못했어요.'}
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
                      </>
                    )}

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