/*문제 풀이 및 IDE 화면을 담당하는 컴포넌트입니다. 사용자가 코드를 직접 작성하거나 객관식 답안을 고르며
  AI 튜터(병아리 선배)의 도움을 받아 학습할 수 있는 공간*/

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// ⭐ [연동] Supabase 클라이언트 도입
import { supabase } from '../supabaseClient'; 
import { addAttempt, getProfile } from '../state/app-state';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

// 📂 [분리 완료] 복잡한 CCTV 데이터 및 실시간 감지 함수 가져오기
import {
  pickCctvPool,
  getTutorPersona,
  getPersonaModeDisplay,
  pickRandom,
  computeCctvChecks,
  resolveCctvBubbleSituation,
  formatStudyMmSs,
  tutorOpeningMessage,
  keywordToGuideQuestion,
  readStoredPersona,
  CCTVCamChickImageStyle
} from '../data/cctvConstants';

export function Quiz({ t, params }) {
  const location = useLocation();
  const navigate = useNavigate();
  // 기본 단원 이름 및 난이도 폴백 매칭 구조
  const settings = location.state || { count: 10, ratio: 50, chapter: 1, difficulty: '기초' };

  const [persona, setPersona] = useState(() => readStoredPersona(params?.persona));
  const tutorPersona = getTutorPersona(persona);

  useEffect(() => {
    setPersona(readStoredPersona(params?.persona));
  }, [params?.persona]);

  useEffect(() => {
    const sync = () => setPersona(readStoredPersona(params?.persona));
    const id = window.setInterval(sync, 1200);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, [params?.persona]);

  const [quizList, setQuizList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [codeValue, setCodeValue] = useState('');
  const [termOutput, setTermOutput] = useState([
    { type: 'system', text: '> Chickode IDE Console v1.0.0' },
    { type: 'system', text: '> Ready for compilation...' },
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const lang = params?.lang ?? 'ko';
  const [reactionMessage, setReactionMessage] = useState(() => {
    const p = readStoredPersona(params?.persona ?? 'default');
    return pickRandom(pickCctvPool(p, 'high', params?.lang ?? 'ko'));
  });
  const [studySeconds, setStudySeconds] = useState(0);
  const [isEditorTyping, setIsEditorTyping] = useState(false);
  const [resultStatus, setResultStatus] = useState(t('quiz_result_wait'));
  const [resultColor, setResultColor] = useState('#d4d4d4');
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [mouseInsideDoc, setMouseInsideDoc] = useState(true);
  const [cctvResultTone, setCctvResultTone] = useState(null);
  const chatDisplayRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastCodeEditRef = useRef(null);
  const lastMcqRef = useRef(null);
  const editorTypingTimeoutRef = useRef(null);
  
  // 📊 [신규 상태 선언] 동적 성과 지표 및 실시간 행동 트래킹 데이터셋
  const [totalGoalCount, setTotalGoalCount] = useState(() => settings.count || 10);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [mouseOutCount, setMouseOutCount] = useState(0);
  const focusScoresRef = useRef([]);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // [Quiz.jsx] 내부 fetchProblemsFromSupabase 수정본
  useEffect(() => {
    async function fetchProblemsFromSupabase() {
      const { count, chapter } = settings; 

      try {
        const chapterIdMap = { 1: 'c1', 2: 'c2', 3: 'c3', 4: 'c4' };
        const targetChapterId = chapterIdMap[chapter] || 'c3';

        let query = supabase.from('problems')
          .select('*')
          .eq('language', 'Java')
          .ilike('unit', `%_${targetChapterId}_%`);

        const { data: pool, error } = await query;
        if (error) throw error;

        let finalPool = (pool || []).sort(() => 0.5 - Math.random());
        
        if (finalPool.length === 0) {
          console.warn(`챕터 ${chapter} (패턴: ${targetChapterId})에 등록된 문제가 없습니다.`);
          setQuizList([]);
          return;
        }

        const selectedProblems = finalPool.slice(0, count);

        const mappedList = selectedProblems.map(p => ({
          ...p,
          title: p.title || '코딩 문제',
          desc: p.description || '',
          type: p.type || 'coding',
          difficulty: p.code_level === 1 ? '기초' : p.code_level === 5 ? '고급' : '중급',
          template: p.template_code ? p.template_code.split('\\n').join('\n') : `public class Main { ... }`,
          answer: p.answer || '',
          expectedExample: p.expected_example || p.answer || ''
        }));

        setQuizList(mappedList);
      } catch (err) {
        console.error("Supabase 로드 실패:", err.message);
        setQuizList([]); 
      }
    }

    fetchProblemsFromSupabase();
  }, [settings]);
  
  // 문제 인덱스 스위칭 훅 (문제가 바뀔 때마다 해당 데이터 및 행동 분석 상태 초기화)
  useEffect(() => {
    if (quizList.length === 0) return;
    const currentProblem = quizList[currentIndex];
    setIsSubmitted(false);
    setSelectedOption(null);
    setCodeValue(currentProblem.template || '');
    
    setTermOutput([{ type: 'system', text: '> Chickode IDE Console v1.0.0' }, { type: 'system', text: '> Ready for compilation...' }]);
    setResultStatus(t('quiz_result_wait'));
    setResultColor('#d4d4d4');
    
    // 다음 문제로 넘어갈 때 미세 행동 요약 변수 초기화
    setTabSwitchCount(0);
    setMouseOutCount(0);
    focusScoresRef.current = [];
    
    if (chatHistory.length === 0) {
      setChatHistory([{ role: 'bot', text: tutorOpeningMessage(currentProblem, persona) }]);
    }
  }, [currentIndex, quizList]);

  useEffect(() => {
    if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
  }, [chatHistory, isChatOpen]);

  // ⏱ 1초 주기의 백그라운드 타이머 내에서 실시간 집중도 척도(k점수)를 수집하여 배열에 아카이브
  useEffect(() => {
    if (!quizList.length) return;
    
    const id = setInterval(() => {
      setStudySeconds((s) => s + 1);

      const now = Date.now();
      const problem = quizList[currentIndex];
      if (problem) {
        const { k } = computeCctvChecks({
          now,
          isCoding: problem.type === 'coding',
          docHidden,
          mouseInsideDoc,
          editorTyping: isEditorTyping,
          lastCodeEditAt: lastCodeEditRef.current,
          lastMcqAt: lastMcqRef.current,
          lastActivityAt: lastActivityRef.current,
        });
        focusScoresRef.current.push(k); // 최종 제출 시점의 k점수 평균 연산을 위해 누적 기록
      }
    }, 1000);
    
    return () => clearInterval(id);
  }, [quizList.length, currentIndex, docHidden, mouseInsideDoc, isEditorTyping]);

  // 👀 Visibility API 기반의 실시간 브라우저 탭 이탈률 트래킹 연동
  useEffect(() => {
    const onVis = () => {
      setDocHidden(document.hidden);
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // 🖱 마우스 포인터의 작업 영역 이탈률(mouseleave) 실시간 트래킹 연동
  useEffect(() => {
    const el = document.documentElement;
    const leave = () => {
      setMouseInsideDoc(false);
      setMouseOutCount((prev) => prev + 1);
    };
    const enter = () => setMouseInsideDoc(true);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('mouseenter', enter);
    return () => {
      el.removeEventListener('mouseleave', leave);
      el.removeEventListener('mouseenter', enter);
    };
  }, []);

  const cctvBubbleSituation = useMemo(() => {
    if (!quizList.length) return 'high';
    const problem = quizList[currentIndex];
    if (!problem) return 'high';
    const now = Date.now();
    const { k: cctvK } = computeCctvChecks({
      now,
      isCoding: problem.type === 'coding',
      docHidden,
      mouseInsideDoc,
      editorTyping: isEditorTyping,
      lastCodeEditAt: lastCodeEditRef.current,
      lastMcqAt: lastMcqRef.current,
      lastActivityAt: lastActivityRef.current,
    });
    return resolveCctvBubbleSituation({
      docHidden,
      mouseInsideDoc,
      cctvK,
      resultTone: cctvResultTone,
    });
  }, [quizList, currentIndex, docHidden, mouseInsideDoc, cctvResultTone, isEditorTyping, studySeconds, codeValue, selectedOption]);

  useEffect(() => {
    if (isChatOpen) return;
    const pool = pickCctvPool(persona, cctvBubbleSituation, lang);
    const tick = () => setReactionMessage(pickRandom(pool));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [isChatOpen, cctvBubbleSituation, persona, lang]);

  useEffect(() => {
    setIsEditorTyping(false);
    if (editorTypingTimeoutRef.current) {
      clearTimeout(editorTypingTimeoutRef.current);
      editorTypingTimeoutRef.current = null;
    }
  }, [currentIndex, isChatOpen, quizList.length]);

  const addTermLog = (msg, type = 'system') =>
    setTermOutput((prev) => [...prev, { type, text: `> ${msg}` }]);

  const handleSendChat = async (message = null, chipKeyword = null) => {
    const text = message || chatInput.trim();
    if (!text) return;
    setChatInput('');
    
    const currentProblem = quizList[currentIndex];
    setChatHistory((prev) => [...prev, { role: 'user', text }, { role: 'bot', text: '생각 중이야 삐약... 🐥', thinking: true }]);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_question: text,
          user_code: codeValue,
          problem_context: `${currentProblem.title}: ${currentProblem.desc}`,
          history: chatHistory.map(h => ({ role: h.role === 'bot' ? 'assistant' : 'user', text: h.text }))
        })
      });

      const data = await response.json();
      
      setChatHistory((prev) => [
        ...prev.filter((m) => !m.thinking),
        { role: 'bot', text: data.answer }
      ]);
    } catch (err) {
      console.error("백엔드 연동 에러:", err);
      const kws = currentProblem?.keywords || [];
      const mock = `지금 네트워크 환경이 잠시 불안정해서 삐약이가 직접 비밀 명세를 꺼내왔어! 문제 「${currentProblem?.title}」의 핵심 부품인 「${kws[0] || '기초 용어'}」에 초점을 맞춰 코드를 고쳐볼까? (오프라인 모드)`;
      setChatHistory((prev) => [...prev.filter((m) => !m.thinking), { role: 'bot', text: mock }]);
    }
  };

  // 🎯 [신규 기능] 학습자 맞춤형 AI 보강 챌린지 문제 동적 처방 및 세션 확장 연동
  const triggerAiProblemGeneration = async () => {
    addTermLog('학습자의 오답 분석 패턴을 기반으로 AI 맞춤형 챌린지 코딩 문제를 조립 중입니다 삐약... 🐥', 'system');
    
    try {
      const currentProblem = quizList[currentIndex];
      const currentChapterObj = settings.chapter || { title: "Java 기초" };
      
      const response = await fetch('http://127.0.0.1:8000/generate-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_title: currentChapterObj.title || "Java 기초",
          difficulty: currentProblem?.difficulty || "중급",
          recent_wrong_concepts: currentProblem?.keywords || ["loop"]
        })
      });

      if (!response.ok) throw new Error('API 서버 연결 실패');
      
      const aiProblem = await response.json();
      
      // 1. 기존 학습 목록 최하단에 생성된 AI 문제를 병합 주입
      setQuizList((prev) => [...prev, aiProblem]);
      
      // 2. 📊 [성과도 수식 동기화] 동적 완수도 분모를 +1 실시간 증가시킴
      setTotalGoalCount((prev) => prev + 1);
      
      addTermLog('성공: 삐약이가 새로운 챌린지 보완 코딩 문제를 처방했습니다! 퀴즈 리스트를 확인해봐! 🎉', 'success');
    } catch (err) {
      console.error("AI 문제 동적 생성 실패:", err);
      addTermLog('실패: 네트워크 환경 문제로 챌린지 문제를 가동하지 못했습니다 삐약.', 'error');
    }
  };

  const handleSubmit = async () => {
    bumpActivity();
    const currentProblem = quizList[currentIndex];
    if (!currentProblem) return;

    // 1. 이미 제출 완료된 경우 동적 완수도 범위에 맞춰 페이지 전환 이동 제어
    if (isSubmitted) {
      if (currentIndex + 1 < totalGoalCount && currentIndex + 1 < quizList.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsSubmitted(false); 
      } else {
        // AI가 부여한 동적 보완 영역까지 전체 마일스톤 완수 시 최종 리포트 대시보드로 이동
        navigate('/result', { state: { total: totalGoalCount, correct: correctCount } });
      }
      return;
    }

    let isCorrect = false;

    if (currentProblem.type === 'multiple' || currentProblem.type === 'ox') {
      if (!selectedOption) {
        alert('답을 선택해주세요!');
        return;
      }
      isCorrect = selectedOption === currentProblem.answer;
    } else {
      const userCodeClean = String(codeValue || '').replace(/\s+/g, '');
      const dbAnswerClean = String(currentProblem?.answer || '').replace(/\s+/g, '');
      const isStringMatch = userCodeClean.includes(dbAnswerClean) && dbAnswerClean !== '';
      const isKeywordMatch = currentProblem.keywords && currentProblem.keywords.length > 0
        ? currentProblem.keywords.every((kw) => codeValue.includes(kw))
        : false;
      isCorrect = isStringMatch || isKeywordMatch;
    }

    // 📊 [행동 데이터] 누적 평균 몰입도 산출 연산
    const scoresArray = focusScoresRef.current;
    const avgFocusScore = scoresArray.length > 0
      ? Number((scoresArray.reduce((acc, val) => acc + val, 0) / scoresArray.length).toFixed(2))
      : 4.00;

    // 🎯 [Supabase 동적 submissions 스키마에 최종 요약 저장 및 전송]
    try {
      const userPayload = JSON.parse(localStorage.getItem('chickode_user') || '{}');
      const userId = userPayload.id || null;

      const { error } = await supabase.from('submissions').insert([{
        user_id: userId,
        problem_id: currentProblem.id,
        unit: currentProblem.unit || `c${settings.chapter}`,
        unit_level: currentProblem.difficulty || '기초',
        code_level: currentProblem.code_level || 3,
        problem_tag: currentProblem.keywords || [],
        answer: currentProblem.answer || '',
        user_code: currentProblem.type === 'coding' ? codeValue : selectedOption || '',
        is_correct: isCorrect,
        study_seconds: studySeconds,
        tab_switch_count: tabSwitchCount,
        mouse_out_count: mouseOutCount,
        avg_focus_score: avgFocusScore
      }]);

      if (error) throw error;
      console.log("Supabase submissions DB 기록 완료!");
    } catch (err) {
      console.error("Supabase submissions DB 기록 오류:", err.message);
    }

    // 로컬 디버깅 및 컴포넌트 내부 스냅숏 보존
    addAttempt({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      problemId: currentProblem.id,
      chapter: currentProblem.chapter,
      type: currentProblem.type,
      title: currentProblem.title,
      desc: currentProblem.desc,
      difficulty: currentProblem.difficulty,
      keywords: currentProblem.keywords || [],
      userCode: currentProblem.type === 'coding' ? codeValue : selectedOption || '',
      expectedExample: currentProblem.expectedExample || currentProblem.answer || '',
      isCorrect,
    });

    setIsSubmitted(true);
    addTermLog('============================', 'system');
    addTermLog('Evaluating code...', 'system');
    
    setTimeout(() => {
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        addTermLog('Compile Success: 0 errors, 0 warnings', 'success');
        addTermLog('Result: O 정답입니다!', 'success');
        setResultStatus('결과: 🎉 정답이야!');
        setResultColor('#55ff55');
        setChatHistory((prev) => [...prev, { role: 'bot', text: '정답! 아주 잘했어 삐약! 👏' }]);
        setIsChatOpen(true);
        setCctvResultTone('correct');
      } else {
        addTermLog('Result: X 오답입니다!', 'error');
        setResultStatus('결과: ❌ 오답입니다!');
        setResultColor('#ff5555');
        setChatHistory((prev) => [...prev, { role: 'bot', text: '아쉽지만 오답이야... 다음 번엔 맞출 수 있을 거야! 🐥' }]);
        setIsChatOpen(true);
        setCctvResultTone('wrong');

        // 🎯 [실시간 처방]: 최종 채점이 오답일 경우, AI 취약 저격형 챌린지 생성 함수를 동적 가동!
        triggerAiProblemGeneration();
      }
    }, 500);
  };

  if (!quizList || quizList.length === 0) {
    return (
      <div style={{ color: 'white', padding: '50px', background: '#2d1a12', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Supabase로부터 문제를 가져오는 중입니다 삐약... 🐥</div>
        <div style={{ fontSize: '14px', color: '#bcaaa4' }}>만약 화면이 넘어가질 않는다면 단원에 맞는 문제가 DB에 등록되어 있는지 확인해 주세요!</div>
      </div>
    );
  }

  const currentProblem = quizList[currentIndex];
  const savedUser = JSON.parse(localStorage.getItem('chickode_user') || 'null');
  const rawNickname = savedUser ? savedUser.nickname : getProfile().name;
  const nickname = rawNickname && rawNickname.includes('상우') ? '게스트' : rawNickname;

  const nowCctv = Date.now();
  const isCodingProblem = currentProblem.type === 'coding';
  const {
    k: cctvK,
    itemCodeTyping: cctvItemCodeTyping,
    itemTabOk: cctvTabOk,
    itemSteadyTyping: cctvSteadyTyping,
    itemMouseOk: cctvMouseOk,
  } = computeCctvChecks({
    now: nowCctv,
    isCoding: isCodingProblem,
    docHidden,
    mouseInsideDoc,
    editorTyping: isEditorTyping,
    lastCodeEditAt: lastCodeEditRef.current,
    lastMcqAt: lastMcqRef.current,
    lastActivityAt: lastActivityRef.current,
  });
  const isCctvWarnState = cctvK <= 1;
  const reactionChickClass = [
    'quiz-reaction-chick-wrap',
    isCctvWarnState
      ? 'quiz-reaction-chick-wrap--sleepy'
      : isEditorTyping && currentProblem.type === 'coding'
        ? 'quiz-reaction-chick-wrap--typing'
        : 'quiz-reaction-chick-wrap--float',
  ].join(' ');

  const centerColumn = (
    <div className="center" onPointerDownCapture={() => { if (!isChatOpen) bumpActivity(); }}>
      {currentProblem.type === 'coding' ? (
        <div className="editor">
          <CodeMirror
            value={
              typeof codeValue === 'string' 
                ? codeValue.replace(/\\n/g, '\n').replace(/\\\\n/g, '\n') 
                : codeValue
            }
            height="350px"
            extensions={[java()]}
            theme={oneDark}
            onChange={(val) => {
              setCodeValue(val);
              if (!isChatOpen) {
                bumpActivity();
                if (currentProblem.type === 'coding') {
                  lastCodeEditRef.current = Date.now();
                }
              }
              if (!isChatOpen && currentProblem.type === 'coding') {
                setIsEditorTyping(true);
                if (editorTypingTimeoutRef.current) clearTimeout(editorTypingTimeoutRef.current);
                editorTypingTimeoutRef.current = setTimeout(() => {
                  setIsEditorTyping(false);
                  editorTypingTimeoutRef.current = null;
                }, 450);
              }
            }}
          />
        </div>
      ) : (
        <div className="mcq-container">
          <div className="mcq-options">
            {(currentProblem.options || []).map((opt, i) => (
              <button
                key={i}
                className={`mcq-option-btn ${selectedOption === opt ? 'selected' : ''}`}
                onClick={() => {
                  if (!isSubmitted) {
                    setSelectedOption(opt);
                    if (!isChatOpen) {
                      bumpActivity();
                      lastMcqRef.current = Date.now();
                    }
                  }
                }}
              >
                {currentProblem.type === 'ox' ? opt : `${i + 1}. ${opt}`}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="terminal-container">
        <div className="terminal-header">
          <span>Terminal</span>
          <span style={{ color: resultColor }}>{resultStatus}</span>
        </div>
        <div className="terminal-output">
          {termOutput.map((l, i) => (
            <div key={i} className={`term-line ${l.type}`}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
      <div className="footer" style={{ marginTop: 'auto' }}>
        <button className="clay-submit" onClick={handleSubmit} style={{ width: '100%' }}>
          {isSubmitted ? (currentIndex + 1 < quizList.length ? '다음 문제 ➔' : '결과 보기 ➔') : t('btn_submit')}
        </button>
      </div>
    </div>
  );

  const currentChapterObj = settings.chapter || { title: "알 수 없는 단원" };

  return (
    <div className="coding-view" style={{ display: 'flex' }}>
      <nav className="top-nav">
        <button id="backToMain" title="돌아가기" onClick={() => navigate(-1)}>❮</button>
        <div className="logo">CHICKODE</div>
        <div className="top-right-group">
          <span className="chapter-badge" style={{ fontFamily: "'Jua', sans-serif" }}>{currentChapterObj.title}</span>
          <div className="user-tag">👤 {nickname} 님</div>
        </div>
      </nav>
      <main className={`content${isChatOpen ? '' : ' content--quiz-chat-collapsed'}`}>
        <div className="left">
          <div className="problem-card">
            <h3>[{currentIndex + 1}/{quizList.length}] {currentProblem.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{currentProblem.desc}</p>
          </div>
          <div style={{ fontSize: 12, color: '#5c3d2e', marginBottom: 6 }}>
            {getPersonaModeDisplay(persona)}
          </div>
          {/* 📊 동적 분모 totalGoalCount를 완벽하게 연동한 학습 완수 성과 지표 렌더링 구역 */}
          <div className="quiz-progress-panel">
            <div className="quiz-progress-label">
              성과도: {Math.round((currentIndex / totalGoalCount) * 100)}% ({currentIndex} / {totalGoalCount} 문제 완료)
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${Math.min(100, Math.round((currentIndex / totalGoalCount) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {isChatOpen ? (
          <>
            {centerColumn}
            <div className="right">
              <div className="chat-container">
                <div className="chat-panel-header">
                  <span className="chat-panel-title">{tutorPersona.label}</span>
                  <button type="button" className="chat-panel-close" aria-label="채팅 닫기" onClick={() => setIsChatOpen(false)}>×</button>
                </div>
                <div className="chat-display" ref={chatDisplayRef}>
                  {chatHistory.map((m, i) => (
                    <div key={i} className={`msg-row ${m.role === 'bot' ? 'bot-msg' : 'user-msg'}`}>
                      {m.role === 'bot' && (
                        <div className="avatar">
                          <img src={tutorPersona.image} alt="" />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'bot' ? 'flex-start' : 'flex-end', maxWidth: '75%' }}>
                        <div className="msg-meta">{m.role === 'bot' ? tutorPersona.label : '나'}</div>
                        <div className="bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chat-guide-chips">
                  {(currentProblem.keywords || []).slice(0, 3).map((kw, i) => {
                    const q = keywordToGuideQuestion(kw, i);
                    return (
                      <button key={`${kw}-${i}`} type="button" className="chat-guide-chip" onClick={() => handleSendChat(q, kw)}>{q}</button>
                    );
                  })}
                </div>
                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder={t('chat_placeholder')}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    style={{ height: 44, fontSize: 15 }}
                  />
                  <button type="button" onClick={() => handleSendChat()} style={{ height: 44 }}>{t('btn_send')}</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="quiz-center-reaction-split">
            {centerColumn}
            <aside className="quiz-cctv-panel" aria-label="CHICK CAM">
              <style>{`@keyframes chickCamRecBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.25; } }`}</style>
              <div className="quiz-cctv-vignette" aria-hidden />
              <div className="quiz-cctv-desk-shade" aria-hidden />
              <span className="quiz-cctv-corner quiz-cctv-corner-tl" aria-hidden />
              <span className="quiz-cctv-corner quiz-cctv-corner-tr" aria-hidden />
              <span className="quiz-cctv-corner quiz-cctv-corner-bl" aria-hidden />
              <span className="quiz-cctv-corner quiz-cctv-corner-br" aria-hidden />

              <header className="quiz-cctv-hud">
                <span className="quiz-cctv-cam-id"><span className="quiz-cctv-live-dot" aria-hidden />CHICK CAM 01</span>
                <span className="quiz-cctv-rec" style={{ animation: 'chickCamRecBlink 1s infinite' }}>REC</span>
              </header>

              <div className="quiz-cctv-body">
                <div className="quiz-cctv-stack">
                  <div className="quiz-cctv-speak-col">
                    <div className={`quiz-cctv-bubble${isCctvWarnState ? ' quiz-cctv-bubble--warn' : ''}`}>{reactionMessage}</div>
                    <div className={`quiz-cctv-chick-hero ${reactionChickClass}`}>
                      <img
                        className="quiz-reaction-chick"
                        src={tutorPersona.image}
                        style={CCTVCamChickImageStyle[persona]}
                        alt=""
                      />
                    </div>
                  </div>
                  <div className="quiz-cctv-checklist">
                    <div className="quiz-cctv-checklist-title">{t('cctv_title')}</div>
                    <ul className="quiz-cctv-checklist-ul">
                      <li className={cctvItemCodeTyping ? 'checked' : ''}>
                        <span className="quiz-cctv-check">{cctvItemCodeTyping ? '✓' : ''}</span>
                        {t('cctv_coding')}
                      </li>
                      <li className={cctvTabOk ? 'checked' : ''}>
                        <span className="quiz-cctv-check">{cctvTabOk ? '✓' : ''}</span>
                        {t('cctv_tab')}
                      </li>
                      <li className={cctvSteadyTyping ? 'checked' : ''}>
                        <span className="quiz-cctv-check">{cctvSteadyTyping ? '✓' : ''}</span>
                        {t('cctv_steady')}
                      </li>
                      <li className={cctvMouseOk ? 'checked' : ''}>
                        <span className="quiz-cctv-check">{cctvMouseOk ? '✓' : ''}</span>
                        {t('cctv_mouse')}
                      </li>
                    </ul>
                  </div>
                  <div className="quiz-cctv-footer-block">
                    <div className="quiz-cctv-footer-timer-wrap" aria-live="polite">
                      <span className="quiz-cctv-footer-time-big">⏱ {formatStudyMmSs(studySeconds)}</span>
                    </div>
                    <button type="button" className="quiz-cctv-open-chat" onClick={() => { bumpActivity(); setIsChatOpen(true); }}>{t('cctv_open_chat')}</button>
                    <span className="quiz-cctv-footer-tagline">{t('cctv_tagline')}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
