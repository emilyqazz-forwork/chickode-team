import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAttempts } from '../state/app-state';

const API_URL = import.meta.env.VITE_CHICKODE_SUPABASE_API_URL || 'http://localhost:8000';

export function Note({ t }) {
  const [activeChapter, setActiveChapter] = useState('all');
  const [activeSort, setActiveSort] = useState('newest');
  const [wrongItems, setWrongItems] = useState([]);
  const [chapterCounts, setChapterCounts] = useState({});
  const [wrongCountMap, setWrongCountMap] = useState({});
  const [aiModal, setAiModal] = useState(null); // { attempt }
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatDisplayRef = useRef(null);
  const navigate = useNavigate();

  /*전체 시도 기록 중 오답(isCorrect === false)만 골라내어 통계를 냅니다*/
  useEffect(() => {
    const allAttempts = getAttempts().filter(a => a && a.isCorrect === false);
    const countMap = {};
    const chCounts = {};
    for (const a of allAttempts) {
      const pid = a.problemId || a.title;
      countMap[pid] = (countMap[pid] || 0) + 1;
      if (a.chapter) chCounts[a.chapter] = (chCounts[a.chapter] || 0) + 1;
    }
    setWrongCountMap(countMap);
    setChapterCounts(chCounts);
    setWrongItems(allAttempts);
  }, []);

  useEffect(() => {
    if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
  }, [chatHistory]);

  const openAiModal = (attempt) => {
    setAiModal(attempt);
    setChatHistory([{ role: 'bot', text: `'${attempt.title}' 문제에 대해 궁금한 거 물어봐! 삐약! 🐥` }]);
    setChatInput('');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !aiModal) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text }, { role: 'bot', text: '생각중이야 삐약... 🤔', thinking: true }]);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_question: text, user_code: aiModal.userCode || '', problem_context: aiModal.title || '' })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev.filter(m => !m.thinking), { role: 'bot', text: data.answer }]);
    } catch {
      setChatHistory(prev => [...prev.filter(m => !m.thinking), { role: 'bot', text: '서버와 연결되지 않아서 대답하기 어려워 삐약! 🐥' }]);
    }
  };

  /*사용자가 선택한 기준에 따라 오답 리스트를 실시간으로 가공해서 보여주는 함수입니다. 챕터별로 필터링하거나, 최신순/오래된 순/많이 틀린 순으로 정렬하는 기능을 담당합니다.*/
  const getFilteredAndSorted = () => {
    let filtered = activeChapter === "all" ? wrongItems : wrongItems.filter(a => String(a.chapter) === String(activeChapter));
    if (activeSort === "newest") filtered = [...filtered].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    else if (activeSort === "oldest") filtered = [...filtered].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    else if (activeSort === "mostWrong") filtered = [...filtered].sort((a, b) => (wrongCountMap[b.problemId || b.title] || 0) - (wrongCountMap[a.problemId || a.title] || 0));
    return filtered;
  };

  /*문제의 유형과 챕터의 성격에 따라 맞춤형 조언을 제공하여 스스로 생각하게 만듭니다*/
  /*기능이 완벽하지 않아서 수정해야함*/
  <div className=""></div>
  const getWhyWrong = (attempt) => {
    if (attempt.type === 'ox') return "O/X 문제는 개념을 정확히 이해해야 해! 관련 내용을 다시 읽어보고 왜 그 답인지 이유를 말해볼 수 있어?";
    if (attempt.type === 'multiple') return "객관식은 오답 선택지가 왜 틀렸는지도 분석해봐! 헷갈린 선택지를 다시 비교해봐.";
    if (attempt.type === 'coding') return "코드 작성 문제야. 키워드가 빠지진 않았는지, 문법 오류는 없는지 한 줄씩 확인해봐!";
    return "틀린 부분을 다시 한 번 점검해봐!";
  };
  /*기능이 완벽하지 않아서 수정해야함*/
  const getTip = (attempt) => {
    const ch = attempt.chapter;
    const type = attempt.type;
    const keywords = (attempt.keywords || []).join(", ");
    if (ch === 1 && type === 'coding') return `💡 변수 선언 순서: 타입 → 변수명 → = → 값 → ; 순서로 기억해봐! 키워드: ${keywords}`;
    if (ch === 1) return `💡 자료형마다 저장할 수 있는 값이 달라! int는 정수, double은 실수, String은 문자열이야.`;
    if (ch === 2 && type === 'coding') return `💡 System.out.println()은 줄바꿈 포함, print()는 줄바꿈 없어! 키워드: ${keywords}`;
    if (ch === 2) return `💡 출력 메서드의 차이를 헷갈리지 마! print, println, printf 각각 언제 쓰는지 정리해봐.`;
    if (ch === 3 && type === 'coding') return `💡 조건문은 조건식이 true일 때 실행돼. 중괄호 {} 범위도 꼭 확인해봐! 키워드: ${keywords}`;
    if (ch === 3) return `💡 if-else if-else 흐름을 순서대로 따라가봐. 조건이 겹치진 않는지 확인해!`;
    if (ch === 4 && type === 'coding') return `💡 반복문은 초기식→조건식→실행→증감 순서야! 무한루프 조심하고 키워드: ${keywords}`;
    if (ch === 4) return `💡 break는 반복 종료, continue는 건너뛰기야. 헷갈리면 직접 손으로 흐름을 그려봐!`;
    return `💡 키워드(${keywords || "-"})가 왜 필요한지부터 확인해봐!`;
  };

  const formatType = (type) => type === 'multiple' ? '객관식' : type === 'coding' ? '실습 코딩' : type === 'ox' ? 'O/X 퀴즈' : '미분류';
  const displayedList = getFilteredAndSorted();

  return (
    <div className="note-container" style={{ paddingTop: '20px', position: 'relative' }}>
      <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '5px', color: 'white', fontSize: '1.2rem', cursor: 'pointer', padding: '5px 12px' }}>
        ❮ 뒤로가기
      </button>
      <main className="note-book">
        <div className="book-title-tag">CHICKODE: 오답노트</div>
        <div className="book-content">
          <aside className="chapter-sidebar">
            <div className="sidebar-section-title">정렬</div>
            <div className="sort-btn-group">
              <button className={`sort-btn ${activeSort === 'newest' ? 'active' : ''}`} onClick={() => setActiveSort('newest')}>최신순</button>
              <button className={`sort-btn ${activeSort === 'oldest' ? 'active' : ''}`} onClick={() => setActiveSort('oldest')}>오래된 순</button>
              <button className={`sort-btn ${activeSort === 'mostWrong' ? 'active' : ''}`} onClick={() => setActiveSort('mostWrong')}>많이 틀린 순</button>
            </div>
            <div className="sidebar-divider"></div>
            <div className="sidebar-section-title">챕터</div>
            <div id="chapterSidebar">
              <button className={`chapter-btn ${activeChapter === 'all' ? 'active' : ''}`} onClick={() => setActiveChapter('all')}>전체 ({wrongItems.length})</button>
              {Object.keys(chapterCounts).sort((a, b) => parseInt(a) - parseInt(b)).map(ch => (
                <button key={ch} className={`chapter-btn ${activeChapter === ch ? 'active' : ''}`} onClick={() => setActiveChapter(ch)}>
                  챕터 {ch} ({chapterCounts[ch]})
                </button>
              ))}
            </div>
          </aside>

          <section className="wrong-answer-area">
            <h3 className="area-title">오답 모음</h3>
            {displayedList.length === 0 && (
              <div className="tip-box">아직 오답이 없어! 메인에서 문제를 풀고 틀리면 여기에 자동으로 저장돼.</div>
            )}
            <div className="wrong-item-container">
              {displayedList.map(a => (
                <div key={a.id} className="wrong-card">
                  <div className="card-info">
                    <div className="info-box">챕터<strong>{a.chapter ?? "-"}</strong></div>
                    <div className="info-box">유형<strong>{formatType(a.type)}</strong></div>
                    <div className="info-box">난이도<strong>{a.difficulty || "기본"}</strong></div>
                    <div className="info-box" style={{color:'#d32f2f'}}>틀린 횟수<strong>{wrongCountMap[a.problemId || a.title] || 1}회</strong></div>
                    <div className="info-box">일시<strong style={{fontSize:'0.8rem'}}>{new Date(a.createdAt ?? Date.now()).toLocaleString()}</strong></div>
                  </div>
                  <div style={{marginBottom:'12px', fontWeight:'bold', fontSize:'1.05rem', color:'#3e2723', padding:'8px 0', borderBottom:'1px dashed #c8b89a'}}>
                    {a.title ?? "문제"}
                  </div>
                  {a.type === 'multiple' || a.type === 'ox' ? (
                    <div className="answer-compare">
                      <div className="answer-box my-answer"><span className="box-label">내가 쓴 답</span>{a.userCode || "미제출"}</div>
                      <div className="answer-box correct-answer"><span className="box-label">정답</span>{a.expectedExample || "-"}</div>
                    </div>
                  ) : (
                    <div className="code-compare">
                      <div className="code-box"><span className="box-label">내가 쓴 답</span><pre><code>{a.userCode || "(없음)"}</code></pre></div>
                      <div className="code-box"><span className="box-label">정답</span><pre><code>{a.expectedExample || "(없음)"}</code></pre></div>
                    </div>
                  )}
                  <div className="why-wrong-box"><span className="box-label">왜 틀렸을까?</span>{getWhyWrong(a)}</div>
                  <div className="tip-box">{getTip(a)}</div>
                  <div className="action-btn-group">
                    <button className="action-btn retry-btn" onClick={() => navigate('/play', { state: { singleProblemId: a.problemId || a.title } })}>다시 풀기</button>
                    <button className="action-btn ai-btn" onClick={() => openAiModal(a)}>AI에게 질문</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

  /*기능이 완벽하지 않아서 수정해야함*/
      {/* AI 질문 모달 */}
      {aiModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) setAiModal(null); }}>
          <div className="modal-content" style={{ width: '480px', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
            <button className="close-btn" onClick={() => setAiModal(null)}>&times;</button>
            <h2 className="modal-header">🐥 AI에게 질문</h2>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '12px' }}>{aiModal.title}</p>
            <div ref={chatDisplayRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'bot' ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '12px', background: m.role === 'bot' ? 'rgba(255,255,255,0.15)' : '#f9a825', color: 'white', fontSize: '0.9rem' }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="setting-input"
                placeholder="병아리 선배에게 질문하기..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                style={{ flex: 1 }}
              />
              <button className="clay-submit" onClick={handleSendChat} style={{ padding: '8px 16px' }}>전송</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
