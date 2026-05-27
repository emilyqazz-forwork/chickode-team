/*문제 풀이 및 IDE 화면을 담당하는 컴포넌트입니다. 사용자가 코드를 직접 작성하거나 객관식 답안을 고르며
  AI 튜터(병아리 선배)의 도움을 받아 학습할 수 있는 공간*/

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 
import { addAttempt, getProfile } from '../state/app-state';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { JAVA_CHAPTERS, PYTHON_CHAPTERS, C_CHAPTERS } from '../data/constants';

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

function getDisplayNameFromAuthUser(user) {
  if (!user) return getProfile().name;
  const meta = user.user_metadata || {};
  return meta.username || meta.nickname || user.email?.split('@')[0] || getProfile().name;
}

/* ── 공통 Nav 바 ── */
function QuizNav({ navigate, mustSolve, chapterDisplayTitle, displayName }) {
  return (
    <div style={{ background: '#3e2723', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
      <button type="button" onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}>
        ❮ 뒤로가기
      </button>
      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>CHICKODE: 문제풀기</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {mustSolve && (
          <span style={{ fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(252,129,129,0.4)', color: '#fc8181', background: 'rgba(252,129,129,0.07)' }}>
            🔒 오답노트 모드
          </span>
        )}
        {chapterDisplayTitle && (
          <span style={{ fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.07)' }}>
            {chapterDisplayTitle}
          </span>
        )}
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>👤 {displayName} 님</span>
      </div>
    </div>
  );
}

export function Quiz({ t, params }) {
  const location = useLocation();
  const navigate = useNavigate();

  const settings = location.state || {
    count: 10,
    ratio: 50,
    chapter: 'java_basic_c1',
    difficulty: '기초',
    mustSolve: false,
  };

  const mustSolve = settings.mustSolve || false;

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
  const [resultColor, setResultColor] = useState('#000000');
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [mouseInsideDoc, setMouseInsideDoc] = useState(true);
  const [cctvResultTone, setCctvResultTone] = useState(null);
  const chatDisplayRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastCodeEditRef = useRef(null);
  const lastMcqRef = useRef(null);
  const editorTypingTimeoutRef = useRef(null);
  const isCorrectRef = useRef(false);
  
  const [totalGoalCount, setTotalGoalCount] = useState(() => settings.count || 10);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [mouseOutCount, setMouseOutCount] = useState(0);
  const [submitCount, setSubmitCount] = useState(0);
  const focusScoresRef = useRef([]);
  const [displayName, setDisplayName] = useState(() => getProfile().name);

  // ✅ 추가: 이번 세션에서 틀린 문제 ID 수집용
  const [wrongProblemIds, setWrongProblemIds] = useState([]);

  useEffect(() => {
    const fetchDisplayName = async (user) => {
      if (!user) {
        setDisplayName(getProfile().name);
        return;
      }

      // profiles 테이블에서 display_name 조회
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      if (!error && data?.display_name) {
        setDisplayName(data.display_name);
      } else {
        // profiles에 없으면 기존 방식으로 폴백
        setDisplayName(getDisplayNameFromAuthUser(user));
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => fetchDisplayName(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchDisplayName(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    async function fetchProblemsFromSupabase() {
      const { count, chapter, difficulty, problemId, wrongIds } = settings;

      try {
        // ✅ 추가: wrongIds가 있으면 해당 문제들만 Supabase에서 조회
        if (wrongIds && wrongIds.length > 0) {
          const { data, error } = await supabase
            .from('problems')
            .select('*')
            .in('id', wrongIds);
          if (error) throw error;
          setQuizList((data || []).map(p => ({
            ...p,
            title: p.title || '코딩 문제',
            desc: p.description || '',
            type: p.type || 'coding',
            difficulty: p.code_level === 1 ? '기초' : p.code_level === 5 ? '고급' : '중급',
            template: p.template_code ? p.template_code.split('\\n').join('\n') : `public class Main { ... }`,
            answer: p.answer || '',
            expectedExample: p.expected_example || p.answer || ''
          })));
          return;
        }

        if (problemId) {
          const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('id', problemId)
            .single();

          if (error) throw error;
          if (!data) { setQuizList([]); return; }

          setQuizList([{
            ...data,
            title: data.title || '코딩 문제',
            desc: data.description || '',
            type: data.type || 'coding',
            difficulty: data.code_level === 1 ? '기초' : data.code_level === 5 ? '고급' : '중급',
            template: data.template_code ? data.template_code.split('\\n').join('\n') : `public class Main { ... }`,
            answer: data.answer || '',
            expectedExample: data.expected_example || data.answer || ''
          }]);
          return;
        }

        const targetPrefix = String(chapter);
        console.log(`[Quiz] 문제 로드 prefix: ${targetPrefix}`);

        const { data: pool, error } = await supabase
          .from('problems')
          .select('*')
          .ilike('unit', `${targetPrefix}%`);

        if (error) throw error;

        if (!pool || pool.length === 0) {
          console.warn(`'${targetPrefix}%' 패턴에 해당하는 문제가 없습니다.`);
          setQuizList([]);
          return;
        }

        let targetL5Count = Math.max(0, Math.floor(count * 0.2));
        let targetL3Count = Math.max(0, Math.floor(count * 0.3));
        if (count >= 3 && targetL5Count === 0) targetL5Count = 1;
        if (count >= 2 && targetL3Count === 0) targetL3Count = 1;
        let targetL1Count = count - targetL3Count - targetL5Count;
        if (targetL1Count < 0) targetL1Count = 0;

        const level1Pool = pool.filter(p => p.code_level <= 2).sort(() => 0.5 - Math.random());
        const level3Pool = pool.filter(p => p.code_level >= 3 && p.code_level <= 4).sort(() => 0.5 - Math.random());
        const level5Pool = pool.filter(p => p.code_level >= 5).sort(() => 0.5 - Math.random());

        const selectedL1 = level1Pool.slice(0, targetL1Count);
        const selectedL3 = level3Pool.slice(0, targetL3Count);
        const selectedL5 = level5Pool.slice(0, targetL5Count);

        let combinedProblems = [...selectedL1, ...selectedL3, ...selectedL5];

        if (combinedProblems.length < count) {
          const remainingCount = count - combinedProblems.length;
          const remainingPool = pool
            .filter(p => !combinedProblems.some(cp => cp.id === p.id))
            .sort(() => 0.5 - Math.random());
          combinedProblems = [...combinedProblems, ...remainingPool.slice(0, remainingCount)];
        }

        combinedProblems.sort((a, b) => (a.code_level || 1) - (b.code_level || 1));

        const mappedList = combinedProblems.map(p => ({
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
  
  useEffect(() => {
    if (quizList.length === 0) return;
    const currentProblem = quizList[currentIndex];
    setIsSubmitted(false);
    setSelectedOption(null);
    setCodeValue(currentProblem.template || '');
    
    setTermOutput([{ type: 'system', text: '> Chickode IDE Console v1.0.0' }, { type: 'system', text: '> Ready for compilation...' }]);
    setResultStatus(t('quiz_result_wait'));
    setResultColor('#000000');
    
    setTabSwitchCount(0);
    setMouseOutCount(0);
    setSubmitCount(0);
    focusScoresRef.current = [];
    isCorrectRef.current = false;
    
    if (chatHistory.length === 0) {
      setChatHistory([{ role: 'bot', text: tutorOpeningMessage(currentProblem, persona) }]);
    }
  }, [currentIndex, quizList]);

  useEffect(() => {
    if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
  }, [chatHistory, isChatOpen]);

  useEffect(() => {
    if (!quizList.length) return;
    const currentProblem = quizList[currentIndex];
    if (!currentProblem) return;
    
    const timerId = setInterval(() => {
      setStudySeconds((s) => s + 1);
      const now = Date.now();
      if (currentProblem) {
        const { k } = computeCctvChecks({
          now,
          isCoding: currentProblem.type === 'coding',
          docHidden,
          mouseInsideDoc,
          editorTyping: isEditorTyping,
          lastCodeEditAt: lastCodeEditRef.current,
          lastMcqAt: lastMcqRef.current,
          lastActivityAt: lastActivityRef.current,
        });
        focusScoresRef.current.push(k);
      }
    }, 1000);

    let bufferSeconds = 0;
    const streamId = setInterval(async () => {
      bufferSeconds += 10;
      const userPayload = JSON.parse(localStorage.getItem('chickode_user') || '{}');
      const userId = userPayload.id || null;

      // ✅ session_id 제거
      const payload = {
        problem_id: currentProblem.id,
        user_id: userId,
        elapsed_time: bufferSeconds,
        cctv_k_score: focusScoresRef.current[focusScoresRef.current.length - 1] || 3,
        item_code_typing: isEditorTyping,
        item_tab_ok: !docHidden,
        item_steady_typing: isEditorTyping,
        item_mouse_ok: mouseInsideDoc,
        tab_switch_count: tabSwitchCount, 
        mouse_out_count: mouseOutCount  
      };

      try {
        await supabase.from('user_behavior_logs').insert([payload]);
        console.log("고주파 행동로그 전송 성공");
      } catch (err) {
        console.error("행동로그 전송 실패:", err);
      }
    }, 10000);
    
    return () => {
      clearInterval(timerId);
      clearInterval(streamId);
    };
  }, [quizList.length, currentIndex, docHidden, mouseInsideDoc, isEditorTyping]);

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_question: text,
          user_code: codeValue,
          problem_context: `${currentProblem.title}: ${currentProblem.desc}`,
          history: chatHistory.map(h => ({ 
             role: h.role === 'bot' ? 'assistant' : 'user', 
             text: h.text 
          }))
        })
      });

      const data = await response.json();
      setChatHistory((prev) => [
        ...prev.filter((m) => !m.thinking),
        { role: 'bot', text: data.answer }
      ]);
    } catch (err) {
      console.error("백엔드 통신 에러:", err);
      setChatHistory((prev) => [...prev.filter(m => !m.thinking), { role: 'bot', text: "네트워크가 불안정해 삐약! 🐥" }]);
    }
  };

  const triggerAiProblemGeneration = async () => {
    addTermLog('학습자의 오답 분석 패턴을 기반으로 AI 맞춤형 챌린지 코딩 문제를 조립 중입니다 삐약... 🐥', 'system');
    
    try {
      const currentProblem = quizList[currentIndex];
      const currentChapterObj = settings.chapter || { title: "Java 기초" };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/generate-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_title: typeof currentChapterObj === 'string' ? currentChapterObj : currentChapterObj.title || "Java 기초",
          difficulty: currentProblem?.difficulty || "중급",
          recent_wrong_concepts: currentProblem?.keywords || ["loop"]
        })
      });

      if (!response.ok) throw new Error('API 서버 연결 실패');
      
      const aiProblem = await response.json();
      setQuizList((prev) => [...prev, aiProblem]);
      setTotalGoalCount((prev) => prev + 1);
      
      addTermLog('성공: 삐약이가 새로운 챌린지 보완 코딩 문제를 처방했습니다! 퀴즈 리스트를 확인해봐! 🎉', 'success');
    } catch (err) {
      console.error("AI 문제 동적 생성 실패:", err);
      addTermLog('실패: 네트워크 환경 문제로 챌린지 문제를 가동하지 못했습니다 삐약.', 'error');
    }
  };

  const handleSubmit = async () => {
    bumpActivity();
    setSubmitCount(prev => prev + 1);
    const currentProblem = quizList[currentIndex];
    if (!currentProblem) return;

    if (isSubmitted) {
      if (mustSolve && !isCorrectRef.current) {
        setIsSubmitted(false);
        setCodeValue(currentProblem.template || '');
        setResultStatus(t('quiz_result_wait'));
        setResultColor('#000000');
        setTermOutput([
          { type: 'system', text: '> Chickode IDE Console v1.0.0' },
          { type: 'system', text: '> Ready for compilation...' },
          { type: 'system', text: '> 🔒 오답노트 모드: 정답을 맞춰야 다음으로 넘어갈 수 있어 삐약! 🐣' },
        ]);
        return;
      }
      if (currentIndex + 1 < totalGoalCount && currentIndex + 1 < quizList.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsSubmitted(false); 
      } else {
        // ✅ 수정: wrongProblemIds도 함께 전달
        navigate('/result', { state: { total: totalGoalCount, correct: correctCount, wrongIds: wrongProblemIds } });
      }
      return;
    }

    let isCorrect = false;

    if (currentProblem.type === 'multiple' || currentProblem.type === 'ox') {
      if (!selectedOption) {
        alert('답을 선택해주세요!');
        return;
      }
      isCorrect = (selectedOption === currentProblem.answer);
    } else {
      const userCodeClean = String(codeValue || '').replace(/\s+/g, '').toLowerCase();
      const dbAnswerClean = String(currentProblem?.answer || '').replace(/\s+/g, '').toLowerCase();

      if (currentProblem.code_level === 5) {
        isCorrect = (userCodeClean === dbAnswerClean);
      } else {
        const isStringMatch = (dbAnswerClean !== '' && userCodeClean.includes(dbAnswerClean));
        const isKeywordMatch = currentProblem.keywords && currentProblem.keywords.length > 0
          ? currentProblem.keywords.every((kw) => codeValue.toLowerCase().includes(kw.toLowerCase()))
          : false;
        isCorrect = isStringMatch || isKeywordMatch;
      }
    }

    isCorrectRef.current = isCorrect;
    
    const scoresArray = focusScoresRef.current;
    const avgFocusScore = scoresArray.length > 0
      ? Number((scoresArray.reduce((acc, val) => acc + val, 0) / scoresArray.length).toFixed(2))
      : 4.00;

    try {
      const userPayload = JSON.parse(localStorage.getItem('chickode_user') || '{}');
      const userId = userPayload.id || null; 

      // ✅ session_id 제거
      const { error } = await supabase.from('submissions').insert([{
        user_id: userId,
        problem_id: currentProblem.id,
        unit: currentProblem.unit || String(settings.chapter),
        unit_level: settings.difficulty || '기초',
        code_level: currentProblem.code_level || 3,
        problem_tag: currentProblem.keywords || [],
        answer: String(currentProblem.answer || ''), 
        user_code: codeValue.trim() !== '' ? codeValue : String(selectedOption || ''),
        is_correct: isCorrect,
        study_seconds: studySeconds,
        tab_switch_count: tabSwitchCount,
        mouse_out_count: mouseOutCount,
        avg_focus_score: avgFocusScore,
        submit_count: submitCount
      }]);

      if (error) throw error;
      console.log("Supabase submissions DB 기록 성공! 🎉");
    } catch (err) {
      console.error("Supabase submissions DB 기록 오류:", err.message);
    }

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
        // ✅ 추가: 오답 문제 ID 수집
        setWrongProblemIds(prev => [...prev, currentProblem.id]);
        if (!mustSolve) triggerAiProblemGeneration();
      }
    }, 500);
  };

  /* ── 챕터 타이틀 ── */
  const chapterDisplayTitle = (() => {
    const ch = settings.chapter;
    if (!ch) return '';
    const allChapters = [
      ...Object.values(JAVA_CHAPTERS).flat(),
      ...Object.values(PYTHON_CHAPTERS).flat(),
      ...Object.values(C_CHAPTERS).flat(),
    ];
    const found = allChapters.find(c => c.id === String(ch));
    return found ? found.title : String(ch);
  })();

  /* ── 로딩 화면 ── */
  if (!quizList || quizList.length === 0) {
    return (
      <div className="coding-view" style={{ display: 'flex', flexDirection: 'column' }}>
        <QuizNav
          navigate={navigate}
          mustSolve={mustSolve}
          chapterDisplayTitle={chapterDisplayTitle}
          displayName={displayName}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '2rem' }}>🐥</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>문제를 가져오는 중!! 삐약...</div>
          <div style={{ fontSize: '13px', color: '#bcaaa4' }}>조금만 더 기다려줘.</div>
        </div>
      </div>
    );
  }

  const currentProblem = quizList[currentIndex];

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
            extensions={[
              currentProblem.unit?.startsWith('py') ? python() :
              currentProblem.unit?.startsWith('c_') ? cpp() :
              java()
            ]}
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
          <span style={{ color: '#000000' }}>Console</span>
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
          {isSubmitted
            ? mustSolve && !isCorrectRef.current
              ? '다시 풀기 🔄'
              : currentIndex + 1 < quizList.length
                ? '다음 문제 ➔'
                : '결과 보기 ➔'
            : t('btn_submit')}
        </button>
      </div>
    </div>
  );

  const currentCompletionRate = Math.round((currentIndex / totalGoalCount) * 100);

  return (
    <div className="coding-view" style={{ display: 'flex' }}>
      <QuizNav
        navigate={navigate}
        mustSolve={mustSolve}
        chapterDisplayTitle={chapterDisplayTitle}
        displayName={displayName}
      />

      <main className={`content${isChatOpen ? '' : ' content--quiz-chat-collapsed'}`}>
        <div className="left">
          <div className="problem-card">
            <h3>[{currentIndex + 1}/{quizList.length}] {currentProblem.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{currentProblem.desc}</p>
          </div>
          <div style={{ fontSize: 12, color: '#5c3d2e', marginBottom: 6 }}>
            {getPersonaModeDisplay(persona)}
          </div>
          <div className="quiz-progress-panel">
            <div className="quiz-progress-label">
              성과도: {currentCompletionRate}% ({currentIndex} / {totalGoalCount} 문제 완료)
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${Math.min(100, currentCompletionRate)}%` }}
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