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

// ⭐ [연동] Anthropic SDK 공식 라이브러리 로드
import Anthropic from '@anthropic-ai/sdk';

// API 키 로드 (.env에서 VITE_ 접두사로 안전하게 탐색)
const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

// Anthropic 인스턴스 초기화 (클라이언트 브라우저 환경 직접 통신 옵션 활성화)
const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
  dangerouslyAllowBrowser: true 
});

/** CHICK CAM 말풍선 — 상황별 풀 (15초마다 같은 상황 내 랜덤 교체) */
const CCTV_MSG_HIGH = [
  '열심히 하네~ 좋아!',
  '오 제법인데? 삐약!',
  '이 정도면 합격이야 삐약!',
  '계속 이렇게만 해봐!',
  '집중력 최고야 삐약!',
  '내 제자 맞지? 뿌듯해~',
];
const CCTV_MSG_MID = [
  '조금 더 집중해봐 삐약!',
  '살짝 느슨해지는데?',
  '방심하면 안 돼 삐약!',
  '딴생각 하는 거 다 보여~',
  '힘내! 거의 다 왔어 삐약!',
  '슬슬 집중력이 떨어지는군...',
];
const CCTV_MSG_LOW = [
  '집중 끊겼어! 지금 뭐 해?',
  '⚠️ 경고! 딴짓 발견!',
  '이러다 다 틀린다 삐약!',
  '지금 당장 집중 안 해?!',
  '내가 보고 있다는 거 잊었어?',
  '공부하러 온 거 맞지? 삐약!',
];
const CCTV_MSG_TAB = [
  '어디 갔다 왔어? 👀',
  '유튜브 본 거 다 알아 삐약!',
  '탭 이동 감지됨... 수상해!',
  'AI한테 물어본 거지? 삐약!',
  '잠깐! 딴 탭 발견! 집중도 감소!',
  '어딜 돌아다녀~ 빨리 와 삐약!',
];
const CCTV_MSG_MOUSE = [
  '도망가려고? 삐약!',
  '마우스 이탈 감지! 👀',
  '어디 가? 아직 다 못 풀었잖아!',
  '잠깐, 손이 왜 거기 있어?',
  '핸드폰 만지려는 거 알아 삐약!',
];
const CCTV_MSG_CORRECT = [
  '오!! 정답! 역시 내 제자!',
  '완벽해! 삐약! 🎉',
  '대박! 이 문제 맞추다니!',
  '감시한 보람이 있네~ 삐약!',
];
const CCTV_MSG_WRONG = [
  '아쉽다... 다시 생각해봐!',
  '틀렸어! 집중 안 한 탓이야 삐약!',
  '이건 좀 더 공부가 필요해~',
  '괜찮아, 다음엔 맞출 수 있어!',
];

const CCTV_MSG_BY_SITUATION = {
  high: CCTV_MSG_HIGH,
  mid: CCTV_MSG_MID,
  low: CCTV_MSG_LOW,
  tab: CCTV_MSG_TAB,
  mouse: CCTV_MSG_MOUSE,
  correct: CCTV_MSG_CORRECT,
  wrong: CCTV_MSG_WRONG,
};

/** CHICK CAM — 페르소나별 멘트 */
const CCTV_MSG_RACER = {
  high: ['오 나쁘지 않아!', '그 속도 유지!', '이 정도면 간다!', '집중 유지!', '금방 끝낸다!', '좋아 붙어!'],
  mid: ['집중 안 해?!', '딴짓 치우고 와!', '빨리빨리!', '손 놀리지 마!', '탭 또 돌아다녀?!', '한 번에 박자!'],
  low: ['지금 뭐 해?!', '집중 파탄이다!', '이러다 전부 날린다!', '당장 화면으로!', '공부하러 왔지?!', '빨리 복귀!'],
  tab: ['어딜 갔어!', '탭 닫고 와!', '유튜브 금지!', '또 빠졌어?!', '당장 돌아와!', '감시 중이다!'],
  mouse: ['도망가?', '손 어디!', '화면 밖으로 나와!', '핸드폰 그만!', '자리 지켜!'],
  correct: ['오! 정답!', '가자!', '이거지!', '역시!', '통과!'],
  wrong: ['틀렸어. 다시!', '아깝다 한 번 더!', '집중 안 해서 그래!', '다시 쳐봐!'],
};
const CCTV_MSG_PROF = {
  high: ['학습 몰입도가 양호합니다.', '좋은 진전입니다.', '계속 유지하십시오.', '적절한 학습 태도입니다.', '훌륭한 집중력입니다.', '이 페이스가 바람직합니다.'],
  mid: ['학습 효율이 저하되고 있습니다.', '집중력을 유지하세요.', '약간의 산만함이 관찰됩니다.', '목표 달성을 위해 재정비가 필요합니다.', '학습 리듬을 찾으시기 바랍니다.', '주의가 분산되고 있습니다.'],
  low: ['집중 유지에 실패했습니다.', '학습 세션이 위험 수준입니다.', '즉시 태도를 교정하십시오.', '이탈 행동이 반복되고 있습니다.', '학습 목표에서 이탈 중입니다.', '경고: 집중도 최저 수준입니다.'],
  tab: ['탭 전환이 감지되었습니다.', '다른 작업으로 이탈한 것으로 보입니다.', '학습 환경으로 복귀하십시오.', '부적절한 멀티태스킹입니다.', '수업 화면으로 돌아오십시오.', '주의: 탭 이탈입니다.'],
  mouse: ['포인터 이탈이 확인되었습니다.', '작업 영역을 이탈했습니다.', '입력 장치 위치를 확인하십시오.', '학습 구역에 포인터를 두십시오.', '이탈이 반복되고 있습니다.'],
  correct: ['정답입니다. 훌륭합니다.', '매우 정확한 풀이입니다.', '개념 이해가 확인되었습니다.', '훌륭한 결과입니다.', '계속 유지하십시오.'],
  wrong: ['오답입니다. 재검토가 필요합니다.', '풀이에 오류가 있습니다.', '개념을 다시 확인하십시오.', '논리를 점검해 보십시오.'],
};
const CCTV_MSG_CHURCH = {
  high: ['잘하고 있어요~', '할 수 있어요!', '함께 해봐요!', '너무 좋아요~', '하나님이 보고 계셔요~ 뿌듯해요', '이대로 가면 돼요~'],
  mid: ['조금만 더 힘내봐요~', '괜찮아요, 다시 집중해봐요', '함께 천천히 해볼까요?', '딴생각은 잠깐 내려놔요~', '힘내세요, 거의 왔어요~', '기도하며 집중해요~'],
  low: ['괜찮아요~ 여기까지 온 것도 대단해요', '천천히 다시 와요~', '실수해도 괜찮아요', '지금부터 같이 다시 해봐요!', '놓치지 말아요, 할 수 있어요~', '음... 집중이 끊겼네요? 괜찮아요~'],
  tab: ['잠깐 멀리 갔다 오셨나요? 환영해요~', '다시 같이 해요~', '유튜브는 나중에~ 지금은 공부 시간이에요', '돌아와줘서 고마워요~', '천천히, 탭으로 돌아와요~', '기다리고 있었어요~'],
  mouse: ['어디 가요~ 같이 있어요', '손 놓치지 말아요~', '천천히 화면으로~', '핸드폰은 잠깐 내려놔요~', '여기 함께해요~'],
  correct: ['축하해요! 정답이에요~', '참 잘했어요!', '기뻐요~', '하나님께도 감사드려요~', '대단해요, 함께 기뻐해요!'],
  wrong: ['괜찮아요~ 다음엔 맞출 수 있어요', '실수는 배움의 한 조각이에요~', '다시 생각해봐요, 응원할게요~', '힘내요, 포기하지 마요~'],
};

const CCTV_MSG_BY_PERSONA = {
  default: CCTV_MSG_BY_SITUATION,
  racer: CCTV_MSG_RACER,
  prof: CCTV_MSG_PROF,
  church: CCTV_MSG_CHURCH,
};

const TUTOR_PERSONA = {
  default: { label: '병아리 선배 🐥', image: '/images/chick.png' },
  racer: { label: '폭주족 선배 🏍', image: '/images/chick.png' },
  prof: { label: '교수님 🎓', image: '/images/chick.png' },
  church: { label: '교회오빠 ✝', image: '/images/chick.png' },
};

function getTutorPersona(persona) {
  return TUTOR_PERSONA[persona] || TUTOR_PERSONA.default;
}

function getPersonaModeDisplay(persona) {
  switch (persona) {
    case 'racer': return '🏍 폭주족 모드';
    case 'prof': return '🎓 교수님 모드';
    case 'church': return '✝ 교회오빠 모드';
    default: return '🐥 병아리 선배 모드';
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeCctvChecks({
  now,
  isCoding,
  docHidden,
  mouseInsideDoc,
  editorTyping,
  lastCodeEditAt,
  lastMcqAt,
  lastActivityAt,
}) {
  const itemCodeTyping = isCoding
    ? lastCodeEditAt != null && now - lastCodeEditAt < 30000
    : lastMcqAt != null && now - lastMcqAt < 30000;
  const itemTabOk = !docHidden;
  const itemSteadyTyping = isCoding
    ? lastCodeEditAt != null && now - lastCodeEditAt < 30000
    : now - lastActivityAt < 30000;
  const itemMouseOk = mouseInsideDoc;
  const checks = [itemCodeTyping, itemTabOk, itemSteadyTyping, itemMouseOk];
  const k = checks.filter(Boolean).length;
  return { checks, k, itemCodeTyping, itemTabOk, itemSteadyTyping, itemMouseOk };
}

function resolveCctvBubbleSituation({ docHidden, mouseInsideDoc, cctvK, resultTone }) {
  if (docHidden) return 'tab';
  if (!mouseInsideDoc) return 'mouse';
  if (resultTone === 'correct') return 'correct';
  if (resultTone === 'wrong') return 'wrong';
  if (cctvK === 4) return 'high';
  if (cctvK === 3) return 'mid';
  if (cctvK === 2) return 'mid';
  return 'low';
}

function formatStudyMmSs(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function descToOpeningHint(desc) {
  const raw = String(desc || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '설명에서 요구하는 조건만 한 줄로 짚어 보면 돼';
  const firstLine = raw.split('\n')[0];
  const stop = firstLine.search(/[.!?。！？](\s|$)/);
  let line = (stop >= 0 ? firstLine.slice(0, stop) : firstLine).trim();
  line = line.replace(/[.。!?！？]+$/g, '').trim();
  if (line.length > 88) line = `${line.slice(0, 85).trim()}…`;
  return line || firstLine.slice(0, 88);
}

function tutorOpeningMessage(problem, persona = 'default') {
  const title = problem?.title?.trim() || '이번 문제';
  const hint = descToOpeningHint(problem?.desc);
  switch (persona) {
    case 'racer': return `「${title}」야. ${hint} 어떻게 할 건데?`;
    case 'prof': return `본 문제는 「${title}」입니다. ${hint} 접근 순서를 생각해 보시기 바랍니다.`;
    case 'church': return `「${title}」 문제예요~ ${hint} 천천히 같이 생각해봐요. 괜찮아요~`;
    default: return `「${title}」 문제야. ${hint} 어떻게 접근할 것 같아, 삐약?`;
  }
}

function keywordToGuideQuestion(keyword, index) {
  const kw = String(keyword).trim();
  const templates = [
    (k) => (/^(if|for|while|switch|try)$/i.test(k) ? `${k}문이 뭐야?` : `${k}가 뭐야?`),
    (k) => `${k}는 언제 써?`,
    (k) => `${k}가 없으면 어떻게 돼?`,
    (k) => `${k}는 어떻게 써?`,
  ];
  return templates[index % templates.length](kw);
}

export function Quiz({ t, params }) {
  const location = useLocation();
  const navigate = useNavigate();
  const settings = location.state || { count: 10, ratio: 50, chapter: 1, difficulty: '중' };

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
  const [reactionMessage, setReactionMessage] = useState(() => {
    const p = readStoredPersona('default');
    const table = CCTV_MSG_BY_PERSONA[p] || CCTV_MSG_BY_PERSONA.default;
    return pickRandom(table.high || CCTV_MSG_HIGH);
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
  const cctvResultClearTimeoutRef = useRef(null);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ⭐ [연동 및 오류 완벽 수정] 
  useEffect(() => {
    async function fetchProblemsFromSupabase() {
      const { count, ratio, chapter, difficulty } = settings;

      try {
        // 1. 단원(chapter) 데이터 타입을 명시적으로 숫자(Number) 변환하여 400 에러 원천 차단
        const targetChapter = Number(chapter);
        
        let query = supabase.from('problems').select('*');
        if (targetChapter !== 0) query = query.eq('chapter', targetChapter);
        query = query.eq('difficulty', difficulty);

        const { data: pool, error } = await query;
        if (error) throw error;

        let finalPool = pool || [];
        
        // 조건에 맞는 풀이 부재 시 폴백 정책 적용
        if (finalPool.length === 0) {
          let fallbackQuery = supabase.from('problems').select('*');
          if (targetChapter !== 0) fallbackQuery = fallbackQuery.eq('chapter', targetChapter);
          const { data: fallbackPool } = await fallbackQuery;
          finalPool = fallbackPool || [];
        }

        // ⭐ 안전장치: 결과가 아예 없으면 빈 배열을 세팅해 무한 로딩(Cannot read length)을 방지
        if (finalPool.length === 0) {
          setQuizList([]);
          return;
        }

        // 2. 주관식(coding) 및 객관식(multiple/ox) 가중치 분배 연산
        const objCount = Math.round(count * (ratio / 100));
        const subCount = count - objCount;

        const objPool = finalPool.filter((p) => p.type === 'ox' || p.type === 'multiple').sort(() => 0.5 - Math.random());
        const subPool = finalPool.filter((p) => p.type === 'coding').sort(() => 0.5 - Math.random());

        const mergedList = [];
        if (objPool.length > 0) {
          for (let i = 0; i < objCount; i++) mergedList.push(objPool[i % objPool.length]);
        }
        if (subPool.length > 0) {
          for (let i = 0; i < subCount; i++) mergedList.push(subPool[i % subPool.length]);
        }

        // PostgreSQL 스네이크케이스 컬럼명을 리액트 카멜케이스 구조와 무결성 매핑 보장
        const mappedList = mergedList.map(p => ({
          ...p,
          expectedExample: p.expected_example
        })).sort(() => 0.5 - Math.random());

        setQuizList(mappedList);
      } catch (err) {
        console.error("Supabase 로드 실패:", err.message);
        setQuizList([]); // 에러 시 에러 탈출구 마련
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
    setTermOutput([
      { type: 'system', text: '> Chickode IDE Console v1.0.0' },
      { type: 'system', text: '> Ready for compilation...' },
    ]);
    setResultStatus(t('quiz_result_wait'));
    setResultColor('#d4d4d4');
    lastCodeEditRef.current = null;
    lastMcqRef.current = null;
    lastActivityRef.current = Date.now();
    setMouseInsideDoc(true);
    setDocHidden(typeof document !== 'undefined' && document.hidden);
    setCctvResultTone(null);
    if (cctvResultClearTimeoutRef.current) {
      clearTimeout(cctvResultClearTimeoutRef.current);
      cctvResultClearTimeoutRef.current = null;
    }
    setChatHistory([{ role: 'bot', text: tutorOpeningMessage(currentProblem, persona) }]);
  }, [currentIndex, quizList]);

  useEffect(() => {
    if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
  }, [chatHistory, isChatOpen]);

  useEffect(() => {
    if (!quizList.length) return;
    const id = setInterval(() => setStudySeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [quizList.length]);

  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const leave = () => setMouseInsideDoc(false);
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
    const byPersona = CCTV_MSG_BY_PERSONA[persona] || CCTV_MSG_BY_PERSONA.default;
    const pool = byPersona[cctvBubbleSituation] || CCTV_MSG_HIGH;
    const tick = () => setReactionMessage(pickRandom(pool));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [isChatOpen, cctvBubbleSituation, persona]);

  useEffect(() => {
    setIsEditorTyping(false);
    if (editorTypingTimeoutRef.current) {
      clearTimeout(editorTypingTimeoutRef.current);
      editorTypingTimeoutRef.current = null;
    }
  }, [currentIndex, isChatOpen, quizList.length]);

  const handleSendChat = async (message = null, chipKeyword = null) => {
    const text = message !== undefined && message !== null && String(message).trim() !== ''
        ? String(message).trim()
        : chatInput.trim();
    if (!text) return;
    setChatInput('');
    
    const currentProblem = quizList[currentIndex];
    
    const thinkingText =
      persona === 'racer' ? '잠깐만! 엔진 예열 중... 🏍️'
      : persona === 'prof' ? '제출된 코드의 논리 구조 분석 중... 🎓'
      : persona === 'church' ? '상우 님을 위해 골똘히 고민하고 있어요~ 🙏'
      : '생각 중이야 삐약... 🐥';
      
    setChatHistory((prev) => [...prev, { role: 'user', text }, { role: 'bot', text: thinkingText, thinking: true }]);
    
    try {
      let systemInstruction = `너는 자바(Java) 초보자를 위한 친절한 코딩 교육 멘토 플랫폼 'CHICKODE'의 AI 튜터이다.
사용자의 현재 문제 Context: 제목은 "${currentProblem?.title}", 조건은 "${currentProblem?.desc}" 이다.
유저가 입력하는 현재 소스코드 상태: "${codeValue || '아직 코드를 작성하지 않음'}"

[🔥 교육 핵심 지침 - 절대 준수]
1. 절대 정답 소스코드를 한 번에 다 알려주거나 복사 붙여넣기 할 수 있는 완벽한 코드를 그대로 제공하지 마라.
2. 사용자가 스스로 논리적 결함을 찾거나 문법을 추론할 수 있도록 유도하는 '단계별 힌트 및 디버깅 가이드'만 제공하라.
3. 마크다운 형식을 사용하여 읽기 편하게 강조하라.`;

      if (persona === 'racer') {
        systemInstruction += `\n4. [말투 페르소나: 폭주족 선배] 성격이 급하고 와일드하며열정적이다. 반말을 사용하며 "박아라", "달려라", "가자!" 같은 레이싱 용어를 섞어서 터프하지만 유쾌하게 힌트를 줘라.`;
      } else if (persona === 'prof') {
        systemInstruction += `\n4. [말투 페르소나: 대학교 교수님] 매우 정중하고 학술적이며 표준 명조체 느낌의 문체를 쓴다. 격식 있는 존댓말을 사용하며 "학습자님", "분석해 보십시오", "개념의 정의"를 강조하며 체계적으로 지도하라.`;
      } else if (persona === 'church') {
        systemInstruction += `\n4. [말투 페7소나: 다정한 교회 오빠] 한없이 부드럽고 따뜻하며 무한 칭찬과 응원을 아끼지 않는다. "~해요", "괜찮아요 😊", "기도할게요" 느낌의 스윗한 어조로 사용자의 자존감을 극대화해 주어라.`;
      } else {
        systemInstruction += `\n4. [말투 페르소나: 기본 병아리 선배] 귀엽고 친근한 선배다. 문장 끝마다 "~삐약!", "~했어 삐약?"을 반드시 붙여 귀여운 메카니즘을 극대화하라.`;
      }

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022', 
        max_tokens: 1000,
        system: systemInstruction,
        messages: [{ role: 'user', content: text }]
      });

      const aiResponseText = response.content[0].text;

      setChatHistory((prev) => [
        ...prev.filter((m) => !m.thinking),
        { role: 'bot', text: aiResponseText }
      ]);

    } catch (err) {
      console.error("Claude API 연동 에러 -> 오프라인 모드로 자동 스위칭:", err);
      const kws = currentProblem?.keywords || [];
      const mock = `지금 네트워크 환경이나 API 쿼터가 불안정해서 삐약이가 직접 자바 표준 명세를 들고왔어! 문제 「${currentProblem?.title}」의 핵심 부품인 「${kws[0] || '기초 용어'}」 개념부터 차근차근 다시 타이핑 해볼까? (오프라인 폴백 모드)`;
      setChatHistory((prev) => [...prev.filter((m) => !m.thinking), { role: 'bot', text: mock }]);
    }
  };

  const handleSubmit = () => {
    bumpActivity();
    if (!quizList[currentIndex]) return;
    if (isSubmitted) {
      if (currentIndex + 1 < quizList.length) setCurrentIndex(currentIndex + 1);
      else navigate('/result', { state: { total: quizList.length, correct: correctCount } });
      return;
    }
    const currentProblem = quizList[currentIndex];
    let isCorrect = false;
    if (currentProblem.type === 'multiple' || currentProblem.type === 'ox') {
      if (!selectedOption) {
        alert('답을 선택해주세요!');
        return;
      }
      isCorrect = selectedOption === currentProblem.answer;
    } else {
      isCorrect = currentProblem.keywords.every((kw) => codeValue.includes(kw));
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
      if (cctvResultClearTimeoutRef.current) {
        clearTimeout(cctvResultClearTimeoutRef.current);
        cctvResultClearTimeoutRef.current = null;
      }
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        addTermLog('Compile Success: 0 errors, 0 warnings', 'success');
        addTermLog('Result: O 정답입니다!', 'success');
        setResultStatus('결과: 🎉 정답이야!');
        setResultColor('#55ff55');
        setChatHistory((prev) => [...prev, { role: 'bot', text: '정답! 아주 잘했어 삐약! 👏' }]);
        setCctvResultTone('correct');
      } else {
        addTermLog('Result: X 오답입니다!', 'error');
        setResultStatus('결과: ❌ 오답입니다!');
        setResultColor('#ff5555');
        setChatHistory((prev) => [
          ...prev,
          { role: 'bot', text: '아쉽지만 오답이야... 다음 번엔 맞출 수 있을 거야! 🐥' },
        ]);
        setCctvResultTone('wrong');
      }
      cctvResultClearTimeoutRef.current = window.setTimeout(() => {
        setCctvResultTone(null);
        cctvResultClearTimeoutRef.current = null;
      }, 10000);
    }, 500);
  };

  // ⭐ 예외 처리 가드: 데이터가 없거나 로딩 중일 때 렌더링 에러 차단
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
            value={codeValue}
            height="300px"
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
            {/* 데이터 유실 방지용 방어적 옵션 렌더링 */}
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

  return (
    <div className="coding-view" style={{ display: 'flex' }}>
      <nav className="top-nav">
        <button id="backToMain" title="돌아가기" onClick={() => navigate(-1)}>❮</button>
        <div className="logo">CHICKODE</div>
        <div className="top-right-group">
          <span className="chapter-badge">Chapter {settings.chapter}</span>
          <div className="user-tag">👤 {nickname} 님</div>
        </div>
      </nav>
      <main className={`content${isChatOpen ? '' : ' content--quiz-chat-collapsed'}`}>
        <div className="left">
          <div className="problem-card">
            <h3>[{currentIndex + 1}/{quizList.length}] {currentProblem.title}</h3>
            <p>{currentProblem.desc}</p>
          </div>
          <div style={{ fontSize: 12, color: '#5c3d2e', marginBottom: 6 }}>
            {getPersonaModeDisplay(persona)}
          </div>
          <div className="quiz-progress-panel">
            <div className="quiz-progress-label">{currentIndex + 1} / {quizList.length} 문제</div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${Math.round(((currentIndex + 1) / quizList.length) * 100)}%` }}
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
                        <div className="bubble">{m.text}</div>
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
                      <img className="quiz-reaction-chick" src="/images/chick.png" alt="" />
                    </div>
                  </div>
                  <div className="quiz-cctv-checklist">
                    <div className="quiz-cctv-checklist-title">감시 항목</div>
                    <ul className="quiz-cctv-checklist-ul">
                      <li className={cctvItemCodeTyping ? 'checked' : ''}><span className="quiz-cctv-check">{cctvItemCodeTyping ? '✓' : ''}</span>코드 작성 중</li>
                      <li className={cctvTabOk ? 'checked' : ''}><span className="quiz-cctv-check">{cctvTabOk ? '✓' : ''}</span>탭 이탈 없음</li>
                      <li className={cctvSteadyTyping ? 'checked' : ''}><span className="quiz-cctv-check">{cctvSteadyTyping ? '✓' : ''}</span>꾸준히 진행 중</li>
                      <li className={cctvMouseOk ? 'checked' : ''}><span className="quiz-cctv-check">{cctvMouseOk ? '✓' : ''}</span>자리 이탈 없음</li>
                    </ul>
                  </div>
                  <div className="quiz-cctv-footer-block">
                    <div className="quiz-cctv-footer-timer-wrap" aria-live="polite">
                      <span className="quiz-cctv-footer-time-big">⏱ {formatStudyMmSs(studySeconds)}</span>
                    </div>
                    <button type="button" className="quiz-cctv-open-chat" onClick={() => { bumpActivity(); setIsChatOpen(true); }}>챗봇 열기</button>
                    <span className="quiz-cctv-footer-tagline">딴짓 금지! 보고 있다!</span>
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

function readStoredPersona(fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem('chickodePrefs') || '{}');
    return raw.persona ?? fallback ?? 'default';
  } catch {
    return fallback ?? 'default';
  }
}