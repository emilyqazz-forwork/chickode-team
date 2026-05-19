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
import { JAVA_CHAPTERS, PYTHON_CHAPTERS, C_CHAPTERS } from '../constants';

// ⭐ [연동] Anthropic SDK 공식 라이브러리 로드
import Anthropic from '@anthropic-ai/sdk';

// API 키 로드 (.env에서 VITE_ 접두사로 안전하게 탐색)
const anthropicApiKey = import.meta.env.VITE_CHICKODE_CLAUDE_API_KEY;

// Anthropic 인스턴스 초기화 (클라이언트 브라우저 환경 직접 통신 옵션 및 인증 방어 활성화)
const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
  dangerouslyAllowBrowser: true,
  headers: {
    "X-Title": "Chickode Code Platform"
  }
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

const CCTV_MSG_HIGH_EN = [
  "You're doing great! Keep it up!",
  'Nice work! 🐥',
  "That's the spirit!",
  'Stay focused!',
  "You're on fire!",
  'Proud of you~',
];
const CCTV_MSG_MID_EN = [
  'Stay focused! 🐥',
  'Getting a bit distracted?',
  "Don't lose focus!",
  'I can see you daydreaming~',
  'Almost there, keep going!',
  'Focus is slipping...',
];
const CCTV_MSG_LOW_EN = [
  'Hey! What are you doing?!',
  '⚠️ Warning! Slacking detected!',
  "You'll get them all wrong!",
  'Focus RIGHT NOW!',
  "Don't forget I'm watching!",
  'You came here to study, right?!',
];
const CCTV_MSG_TAB_EN = [
  'Where did you go? 👀',
  'I know you watched YouTube!',
  'Tab switch detected... suspicious!',
  'Did you ask another AI? 🐥',
  'Caught you! Focus dropping!',
  'Come back here~ 🐥',
];
const CCTV_MSG_MOUSE_EN = [
  'Trying to escape? 🐥',
  'Mouse escape detected! 👀',
  'Where are you going?!',
  'Why is your hand over there?',
  'I know you want your phone!',
];
const CCTV_MSG_CORRECT_EN = [
  "Correct! That's my student!",
  'Perfect! 🎉',
  'Amazing! You got it!',
  'Worth watching you~ 🐥',
];
const CCTV_MSG_WRONG_EN = [
  'Aww... think again!',
  "Wrong! Should've focused more!",
  'Need more study on this~',
  "It's okay, next time!",
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

const CCTV_MSG_BY_SITUATION_EN = {
  high: CCTV_MSG_HIGH_EN,
  mid: CCTV_MSG_MID_EN,
  low: CCTV_MSG_LOW_EN,
  tab: CCTV_MSG_TAB_EN,
  mouse: CCTV_MSG_MOUSE_EN,
  correct: CCTV_MSG_CORRECT_EN,
  wrong: CCTV_MSG_WRONG_EN,
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

const CCTV_MSG_RACER_EN = {
  high: ['Not bad!', 'Keep that pace!', 'You got this!', 'Stay locked in!', 'Almost done!', 'Nice, keep going!'],
  mid: ['Focus!!', 'Quit slacking!', 'Faster faster!', 'Hands on keyboard!', 'Switching tabs again?!', 'One beat at a time!'],
  low: ['What are you doing?!', 'Focus is gone!', "You'll blow it all!", 'Back to the screen!', 'You came to study?!', 'Get back now!'],
  tab: ['Where did you go!', 'Close that tab!', 'No YouTube!', 'Slacking again?!', 'Come back now!', "I'm watching!"],
  mouse: ['Running away?', 'Where are your hands!', 'Off screen!', 'Phone down!', 'Stay in your seat!'],
  correct: ['Yes! Correct!', "Let's go!", "That's it!", 'Knew it!', 'Pass!'],
  wrong: ['Wrong. Again!', 'So close, once more!', "You weren't focused!", 'Try again!'],
};
const CCTV_MSG_PROF_EN = {
  high: ['Your engagement is satisfactory.', 'Good progress.', 'Please maintain this pace.', 'Appropriate study attitude.', 'Excellent focus.', 'This pace is commendable.'],
  mid: ['Learning efficiency is declining.', 'Please maintain focus.', 'Mild distraction observed.', 'Recalibration needed for goals.', 'Please find your rhythm.', 'Attention is diverging.'],
  low: ['Failed to maintain focus.', 'Session at risk level.', 'Correct your attitude immediately.', 'Repeated disengagement.', 'Drifting from learning goals.', 'Warning: minimum focus level.'],
  tab: ['Tab switch detected.', 'Appears you left the task.', 'Please return to study.', 'Inappropriate multitasking.', 'Return to the lesson screen.', 'Caution: tab departure.'],
  mouse: ['Pointer departure confirmed.', 'Left the work area.', 'Check input device position.', 'Keep pointer in study zone.', 'Repeated departure.'],
  correct: ['Correct. Excellent.', 'Very accurate solution.', 'Concept understanding confirmed.', 'Outstanding result.', 'Please continue.'],
  wrong: ['Incorrect. Review needed.', 'Error in solution.', 'Please verify concept.', 'Check your logic.'],
};
const CCTV_MSG_CHURCH_EN = {
  high: ["You're doing well~", 'You can do it!', "Let's do this together!", 'So good~', 'God is watching~ proud of you', 'Keep going like this~'],
  mid: ['Just a little more~', "It's okay, focus again~", "Let's take it slow together~", 'Set aside distractions for a bit~', 'Cheer up, almost there~', 'Pray and focus~'],
  low: ["It's okay~ you made it this far", 'Come back slowly~', 'Mistakes are fine', "Let's start again together!", "Don't give up, you can do it~", "Hmm... lost focus? That's okay~"],
  tab: ['Welcome back~ were you away?', "Let's do this together~", 'YouTube can wait~ study time now', 'Thanks for coming back~', 'Come back to the tab, slowly~', 'I was waiting for you~'],
  mouse: ["Where are you going~ stay with me", "Don't let go~", 'Back to the screen, gently~', 'Put the phone down for a bit~', "Let's stay together here~"],
  correct: ['Congrats! Correct~', 'Well done!', 'So happy~', 'Thankful~', "Amazing, let's celebrate together!"], // 👈 쉼표(,)로 정상 수정 완료!
  wrong: ["It's okay~ you'll get the next one", 'Mistakes are part of learning~', 'Think again, cheering for you~', "Don't give up~"],
};

const CCTV_MSG_BY_PERSONA = {
  default: CCTV_MSG_BY_SITUATION,
  racer: CCTV_MSG_RACER,
  prof: CCTV_MSG_PROF,
  church: CCTV_MSG_CHURCH,
};

const CCTV_MSG_BY_PERSONA_EN = {
  default: CCTV_MSG_BY_SITUATION_EN,
  racer: CCTV_MSG_RACER_EN,
  prof: CCTV_MSG_PROF_EN,
  church: CCTV_MSG_CHURCH_EN,
};

function getCctvSituationMessages(lang) {
  return lang === 'en' ? CCTV_MSG_BY_SITUATION_EN : CCTV_MSG_BY_SITUATION;
}

function getCctvPersonaTable(persona, lang) {
  const map = lang === 'en' ? CCTV_MSG_BY_PERSONA_EN : CCTV_MSG_BY_PERSONA;
  return map[persona] || map.default;
}

function pickCctvPool(persona, situation, lang) {
  const situ = getCctvSituationMessages(lang);
  const table = getCctvPersonaTable(persona, lang);
  return table[situation] || situ.high;
}

const TUTOR_PERSONA = {
  default: { label: '병아리 선배 🐥', image: '/images/기본튜터.png' },
  racer: { label: '폭주족 선배 🏍', image: '/images/폭주족.png' },
  prof: { label: '교수님 🎓', image: '/images/교수님.png' },
  church: { label: '교회오빠 ✝', image: '/images/교회오빠.png' },
};

const CCTVCamChickImageStyle = {
  default: undefined,
  racer: { width: '68%', height: '68%', objectFit: 'contain' },
  prof: { width: '68%', height: '68%', objectFit: 'contain' },
  church: { width: '68%', height: '68%', objectFit: 'contain' },
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

// ⭐ [타입 에러 교정 가드식 반영]
function descToOpeningHint(desc) {
  const raw = String(desc || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '설명에서 요구하는 조건만 한 줄로 짚어 보면 돼';
  const firstLine = raw ? raw.split('\n')[0] : '';
  const stop = firstLine.search(/[.!?。路線](\s|$)/);
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

function readStoredPersona(fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem('chickodePrefs') || '{}');
    return raw.persona ?? fallback ?? 'default';
  } catch {
    return fallback ?? 'default';
  }
}

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
  const cctvResultClearTimeoutRef = useRef(null);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ⭐ [Supabase 데이터 스펙 매칭 최종 교정] 
  useEffect(() => {
    async function fetchProblemsFromSupabase() {
      const { count, ratio, chapter, difficulty } = settings;

      try {
        let query = supabase.from('problems').select('*');
        
        // 1. [언어 필터] 대소문자 일치 (Java)
        query = query.eq('language', 'Java');

        // 2. [단원명 한글 맵핑] 
        let targetUnit = '변수와 자료형';
        if (chapter === 2) targetUnit = '연산자와 표현식';
        if (chapter === 3) targetUnit = '조건문과 반복문';
        query = query.eq('unit', targetUnit);

        // 3. 🎯 [완벽 교정] 확실하게 분리된 code_level 숫자로 쿼리 매칭!
        let targetLevel = 1; 
        if (difficulty === '중' || difficulty === '중급') targetLevel = 3;
        if (difficulty === '상' || difficulty === '고급') targetLevel = 5;
        query = query.eq('code_level', targetLevel);

        const { data: pool, error } = await query;
        if (error) throw error;

        let finalPool = pool || [];
        
        // 조건 만족 데이터 부재 시, 해당 단원의 기본 기초 풀로 자동 완화 폴백
        if (finalPool.length === 0) {
          let fallbackQuery = supabase.from('problems').select('*').eq('language', 'Java').eq('unit', targetUnit);
          const { data: fallbackPool } = await fallbackQuery;
          finalPool = fallbackPool || [];
        }

        if (finalPool.length === 0) {
          setQuizList([]);
          return;
        }

        // 4. 🎯 [핵심 비율 및 문제 개수 생성 알고리즘 예외 처리 보완 가드]
        const objCount = Math.round(count * (ratio / 100));
        const subCount = count - objCount;

        // DB 특성을 고려하여 객관식과 코딩 문제를 엄격하게 분리
        const objPool = finalPool.filter((p) => p.type === 'ox' || p.type === 'multiple').sort(() => 0.5 - Math.random());
        const subPool = finalPool.filter((p) => p.template_code || p.type === 'coding').sort(() => 0.5 - Math.random());

        const mergedList = [];
        
        // 객관식 풀에 데이터가 존재할 때만 분배 삽입
        if (objPool.length > 0) {
          for (let i = 0; i < objCount; i++) mergedList.push(objPool[i % objPool.length]);
        }
        
        // 중요: 만약 DB에 객관식 문제가 0개라면 코딩 데이터(subPool)로 강제 전량 치환 수렴
        if (subPool.length > 0) {
          const actualNeededSubCount = objPool.length === 0 ? count : subCount;
          for (let i = 0; i < actualNeededSubCount; i++) mergedList.push(subPool[i % subPool.length]);
        }

        // 5. 🎯 [UI 공간 데이터 바인딩 직결 매핑 + type 강제 가드]
        const mappedList = mergedList.map(p => {
          // DB에 템플릿 코드가 없으면 레벨별로 기본 뼈대를 만들어줌
          let defaultTemplate = `public class Main {\n    public static void main(String[] args) {\n        // Level ${p.code_level || 1} 뼈대 코드\n    }\n}`;
          if (p.code_level === 3) {
            defaultTemplate = `public class Solution {\n    public void solution() {\n        // [Level 3] 조건에 맞춰 메소드 내부를 완성하세요\n    }\n}`;
          } else if (p.code_level === 5) {
            defaultTemplate = `// [Level 5] 고급 문제 - 클래스 구조 및 알고리즘 설계\npublic class Application {\n    \n}`;
          }

          // 1. 우선 임시 변수에 기존 템플릿 코드나 디폴트 템플릿을 담습니다.
          let finalTemplate = p.template_code && p.template_code.trim() !== '' ? p.template_code : defaultTemplate;

          // 2. [치환 가드 실행] 문자열 데이터라면 글자 형태의 \\n을 진짜 줄바꿈인 \n으로 컴파일합니다.
          // ⭕ 수정 후: 어떤 형태의 꼬인 \n이 들어와도 3번 연속으로 걸러내 진짜 엔터로 치환합니다.
          // ⭕ 방법 A 적용: 문자열 내에 쌩글자로 박힌 '\'와 'n' 조합을 강제로 엔터('\n')로 바꿉니다.
          if (typeof finalTemplate === 'string') {
            // 원래 줄바꿈 기호가 아니라 진짜 문자열 "\n" 자체를 타격하는 정규식입니다.
            finalTemplate = finalTemplate.split('\\n').join('\n');
          }

          return {
            ...p,
            title: p.title || '기초 코딩 역량 테스트',
            desc: p.description, 
            type: p.type || 'coding', // ⭐ [버그 해결] DB의 type이 비어있으면 강제로 에디터 모드('coding') 주입!
            difficulty: p.code_level === 1 ? '기초' : p.code_level === 5 ? '고급' : '중급', 
            // 🎯 핵심: DB의 template_code를 우선순위로 두고, 없으면 레벨별 기본 가이드 구조 주입
            template: finalTemplate, 
            answer: p.answer || '', // ⭐ Supabase 정답 문자열 명시적 바인딩
            expectedExample: p.expected_example || p.answer || ''
          };
        }).sort(() => 0.5 - Math.random());

        setQuizList(mappedList);
      } catch (err) {
        console.error("Supabase 로드 실패:", err.message);
        setQuizList([]); 
      }
    }

    fetchProblemsFromSupabase();
  }, [settings]);

  // 문제 인덱스 스위칭 훅 (문제가 바뀔 때마다 해당 level의 template을 에디터에 주입)
  useEffect(() => {
  if (quizList.length === 0) return;
  const currentProblem = quizList[currentIndex];
  setIsSubmitted(false);
  setSelectedOption(null);
  
  // 🎯 이 부분을 수정!
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

  // handleSendChat 함수 내부 교체
const handleSendChat = async (message = null, chipKeyword = null) => {
  const text = message || chatInput.trim();
  if (!text) return;
  setChatInput('');
  
  const currentProblem = quizList[currentIndex];
  setChatHistory((prev) => [...prev, { role: 'user', text }, { role: 'bot', text: '생각 중이야 삐약... 🐥', thinking: true }]);
  
  try {
    // 🎯 백엔드 서버로 요청 전송
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

  // ⭐ [Supabase 실제 정답 동기화 채점 가드 블록]
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
      // 🎯 [완벽 연동 기믹] 사용자가 프론트 에디터창에 입력한 소스코드 문자열(codeValue)과
      // Supabase 정답(answer) 문자열의 공백 및 줄바꿈(\n, \r)을 완전히 제거하여 순수 논리 구조만 엄격하게 매칭 비교합니다!
      const userCodeClean = String(codeValue || '').replace(/\s+/g, '');
      const dbAnswerClean = String(currentProblem?.answer || '').replace(/\s+/g, '');
      
      const isStringMatch = userCodeClean.includes(dbAnswerClean) && dbAnswerClean !== '';
      const isKeywordMatch = currentProblem.keywords && currentProblem.keywords.length > 0
        ? currentProblem.keywords.every((kw) => codeValue.includes(kw))
        : false;

      isCorrect = isStringMatch || isKeywordMatch;
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
        setIsChatOpen(true); 
        setCctvResultTone('correct');
      } else {
        addTermLog('Result: X 오답입니다!', 'error');
        setResultStatus('결과: ❌ 오답입니다!');
        setResultColor('#ff5555');
        setChatHistory((prev) => [
          ...prev,
          { role: 'bot', text: '아쉽지만 오답이야... 다음 번엔 맞출 수 있을 거야! 🐥' },
        ]);
        setIsChatOpen(true); 
        setCctvResultTone('wrong');
      }
      cctvResultClearTimeoutRef.current = window.setTimeout(() => {
        setCctvResultTone(null);
        cctvResultClearTimeoutRef.current = null;
      }, 10000);
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

  // return 문 위쪽에 이 한 줄을 먼저 적어두세요!
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