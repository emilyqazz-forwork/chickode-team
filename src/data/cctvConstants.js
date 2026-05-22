/** CHICK CAM 말풍선 — 상황별 풀 (15초마다 같은 상황 내 랜덤 교체) */
export const CCTV_MSG_HIGH = [
  '열심히 하네~ 좋아!',
  '오 제법인데? 삐약!',
  '이 정도면 합격이야 삐약!',
  '계속 이렇게만 해봐!',
  '집중력 최고야 삐약!',
  '내 제자 맞지? 뿌듯해~',
];

export const CCTV_MSG_MID = [
  '조금 더 집중해봐 삐약!',
  '살짝 느슨해지는데?',
  '방심하면 안 돼 삐약!',
  '딴생각 하는 거 다 보여~',
  '힘내! 거의 다 왔어 삐약!',
  '슬슬 집중력이 떨어지는군...',
];

export const CCTV_MSG_LOW = [
  '집중 끊겼어! 지금 뭐 해?',
  '⚠️ 경고! 딴짓 발견!',
  '이러다 다 틀린다 삐약!',
  '지금 당장 집중 안 해?!',
  '내가 보고 있다는 거 잊었어?',
  '공부하러 온 거 맞지? 삐약!',
];

export const CCTV_MSG_TAB = [
  '어디 갔다 왔어? 👀',
  '유튜브 본 거 다 알아 삐약!',
  '탭 이동 감지됨... 수상해!',
  'AI한테 물어본 거지? 삐약!',
  '잠깐! 딴 탭 발견! 집중도 감소!',
  '어딜 돌아다녀~ 빨리 와 삐약!',
];

export const CCTV_MSG_MOUSE = [
  '도망가려고? 삐약!',
  '마우스 이탈 감지! 👀',
  '어디 가? 아직 다 못 풀었잖아!',
  '잠깐, 손이 왜 거기 있어?',
  '핸드폰 만지려는 거 알아 삐약!',
];

export const CCTV_MSG_CORRECT = [
  '오!! 정답! 역시 내 제자!',
  '완벽해! 삐약! 🎉',
  '대박! 이 문제 맞추다니!',
  '감시한 보람이 있네~ 삐약!',
];

export const CCTV_MSG_WRONG = [
  '아쉽다... 다시 생각해봐!',
  '틀렸어! 집중 안 한 탓이야 삐약!',
  '이건 좀 더 공부가 필요해~',
  '괜찮아, 다음엔 맞출 수 있어!',
];

export const CCTV_MSG_HIGH_EN = [
  "You're doing great! Keep it up!",
  'Nice work! 🐥',
  "That's the spirit!",
  'Stay focused!',
  "You're on fire!",
  'Proud of you~',
];

export const CCTV_MSG_MID_EN = [
  'Stay focused! 🐥',
  'Getting a bit distracted?',
  "Don't lose focus!",
  'I can see you daydreaming~',
  'Almost there, keep going!',
  'Focus is slipping...',
];

export const CCTV_MSG_LOW_EN = [
  'Hey! What are you doing?!',
  '⚠️ Warning! Slacking detected!',
  "You'll get them all wrong!",
  'Focus RIGHT NOW!',
  "Don't forget I'm watching!",
  'You came here to study, right?!',
];

export const CCTV_MSG_TAB_EN = [
  'Where did you go? 👀',
  'I know you watched YouTube!',
  'Tab switch detected... suspicious!',
  'Did you ask another AI? 🐥',
  'Caught you! Focus dropping!',
  'Come back here~ 🐥',
];

export const CCTV_MSG_MOUSE_EN = [
  'Trying to escape? 🐥',
  'Mouse escape detected! 👀',
  'Where are you going?!',
  'Why is your hand over there?',
  'I know you want your phone!',
];

export const CCTV_MSG_CORRECT_EN = [
  "Correct! That's my student!",
  'Perfect! 🎉',
  'Amazing! You got it!',
  'Worth watching you~ 🐥',
];

export const CCTV_MSG_WRONG_EN = [
  'Aww... think again!',
  "Wrong! Should've focused more!",
  'Need more study on this~',
  "It's okay, next time!",
];

export const CCTV_MSG_BY_SITUATION = {
  high: CCTV_MSG_HIGH,
  mid: CCTV_MSG_MID,
  low: CCTV_MSG_LOW,
  tab: CCTV_MSG_TAB,
  mouse: CCTV_MSG_MOUSE,
  correct: CCTV_MSG_CORRECT,
  wrong: CCTV_MSG_WRONG,
};

export const CCTV_MSG_BY_SITUATION_EN = {
  high: CCTV_MSG_HIGH_EN,
  mid: CCTV_MSG_MID_EN,
  low: CCTV_MSG_LOW_EN,
  tab: CCTV_MSG_TAB_EN,
  mouse: CCTV_MSG_MOUSE_EN,
  correct: CCTV_MSG_CORRECT_EN,
  wrong: CCTV_MSG_WRONG_EN,
};

/** CHICK CAM — 페르소나별 멘트 */
export const CCTV_MSG_RACER = {
  high: ['오 나쁘지 않아!', '그 속도 유지!', '이 정도면 간다!', '집중 유지!', '금방 끝낸다!', '좋아 붙어!'],
  mid: ['집중 안 해?!', '딴짓 치우고 와!', '빨리빨리!', '손 놀리지 마!', '탭 또 돌아다녀?!', '한 번에 박자!'],
  low: ['지금 뭐 해?!', '집중 파탄이다!', '이러다 전부 날린다!', '당장 화면으로!', '공부하러 왔지?!', '빨리 복귀!'],
  tab: ['어딜 갔어!', '탭 닫고 와!', '유튜브 금지!', '또 빠졌어?!', '당장 돌아와!', '감시 중이다!'],
  mouse: ['도망가?', '손 어디!', '화면 밖으로 나와!', '핸드폰 그만!', '자리 지켜!'],
  correct: ['오! 정답!', '가자!', '이거지!', '역시!', '통과!'],
  wrong: ['틀렸어. 다시!', '아깝다 한 번 더!', '집중 안 해서 그래!', '다시 쳐봐!'],
};

export const CCTV_MSG_PROF = {
  high: ['학습 몰입도가 양호합니다.', '좋은 진전입니다.', '계속 유지하십시오.', '적절한 학습 태도입니다.', '훌륭한 집중력입니다.', '이 페이스가 바람직합니다.'],
  mid: ['학습 효율이 저하되고 있습니다.', '집중력을 유지하세요.', '약간의 산만함이 관찰됩니다.', '목표 달성을 위해 재정비가 필요합니다.', '학습 리듬을 찾으시기 바랍니다.', '주의가 분산되고 있습니다.'],
  low: ['집중 유지에 실패했습니다.', '학습 세션이 위험 수준입니다.', '즉시 태도를 교정하십시오.', '이탈 행동이 반복되고 있습니다.', '학습 목표에서 이탈 중입니다.', '경고: 집중도 최저 수준입니다.'],
  tab: ['탭 전환이 감지되었습니다.', '다른 작업으로 이탈한 것으로 보입니다.', '학습 환경으로 복귀하십시오.', '부적절한 멀티태스킹입니다.', '수업 화면으로 돌아오십시오.', '주의: 탭 이탈입니다.'],
  mouse: ['포인터 이탈이 확인되었습니다.', '작업 영역을 이탈했습니다.', '입력 장치 위치를 확인하십시오.', '학습 구역에 포인터를 두십시오.', '이탈이 반복되고 있습니다.'],
  correct: ['정답입니다. 훌륭합니다.', '매우 정확한 풀이입니다.', '개념 이해가 확인되었습니다.', '훌륭한 결과입니다.', '계속 유지하십시오.'],
  wrong: ['오답입니다. 재검토가 필요합니다.', '풀이에 오류가 있습니다.', '개념을 다시 확인하십시오.', '논리를 점검해 보십시오.'],
};

export const CCTV_MSG_CHURCH = {
  high: ['잘하고 있어요~', '할 수 있어요!', '함께 해봐요!', '너무 좋아요~', '하나님이 보고 계셔요~ 뿌듯해요', '이대로 가면 돼요~'],
  mid: ['조금만 더 힘내봐요~', '괜찮아요, 다시 집중해봐요', '함께 천천히 해볼까요?', '딴생각은 잠깐 내려놔요~', '힘내세요, 거의 왔어요~', '기도하며 집중해요~'],
  low: ['괜찮아요~ 여기까지 온 것도 대단해요', '천천히 다시 와요~', '실수해도 괜찮아요', '지금부터 같이 다시 해봐요!', '놓치지 말아요, 할 수 있어요~', '음... 집중이 끊겼네요? 괜찮아요~'],
  tab: ['잠깐 멀리 갔다 오셨나요? 환영해요~', '다시 같이 해요~', '유튜브는 나중에~ 지금은 공부 시간이에요', '돌아와줘서 고마워요~', '천천히, 탭으로 돌아와요~', '기다리고 있었어요~'],
  mouse: ['어디 가요~ 같이 있어요', '손 놓치지 말아요~', '천천히 화면으로~', '핸드폰은 잠깐 내려놔요~', '여기 함께해요~'],
  correct: ['축하해요! 정답이에요~', '참 잘했어요!', '기뻐요~', '하나님께도 감사드려요~', '대단해요, 함께 기뻐해요!'],
  wrong: ['괜찮아요~ 다음엔 맞출 수 있어요', '실수는 배움의 한 조각이에요~', '다시 생각해봐요, 응원할게요~', '힘내요, 포기하지 마요~'],
};

export const CCTV_MSG_RACER_EN = {
  high: ['Not bad!', 'Keep that pace!', 'You got this!', 'Stay locked in!', 'Almost done!', 'Nice, keep going!'],
  mid: ['Focus!!', 'Quit slacking!', 'Faster faster!', 'Hands on keyboard!', 'Switching tabs again?!', 'One beat at a time!'],
  low: ['What are you doing?!', 'Focus is gone!', "You'll blow it all!", 'Back to the screen!', 'You came to study?!', 'Get back now!'],
  tab: ['Where did you go!', 'Close that tab!', 'No YouTube!', 'Slacking again?!', 'Come back now!', "I'm watching!"],
  mouse: ['Running away?', 'Where are your hands!', 'Off screen!', 'Phone down!', 'Stay in your seat!'],
  correct: ['Yes! Correct!', "Let's go!", "That's it!", 'Knew it!', 'Pass!'],
  wrong: ['Wrong. Again!', 'So close, once more!', "You weren't focused!", 'Try again!'],
};

export const CCTV_MSG_PROF_EN = {
  high: ['Your engagement is satisfactory.', 'Good progress.', 'Please maintain this pace.', 'Appropriate study attitude.', 'Excellent focus.', 'This pace is commendable.'],
  mid: ['Learning efficiency is declining.', 'Please maintain focus.', 'Mild distraction observed.', 'Recalibration needed for goals.', 'Please find your rhythm.', 'Attention is diverging.'],
  low: ['Failed to maintain focus.', 'Session at risk level.', 'Correct your attitude immediately.', 'Repeated disengagement.', 'Drifting from learning goals.', 'Warning: minimum focus level.'],
  tab: ['Tab switch detected.', 'Appears you left the task.', 'Please return to study.', 'Inappropriate multitasking.', 'Return to the lesson screen.', 'Caution: tab departure.'],
  mouse: ['Pointer departure confirmed.', 'Left the work area.', 'Check input device position.', 'Keep pointer in study zone.', 'Repeated departure.'],
  correct: ['Correct. Excellent.', 'Very accurate solution.', 'Concept understanding confirmed.', 'Outstanding result.', 'Please continue.'],
  wrong: ['Incorrect. Review needed.', 'Error in solution.', 'Please verify concept.', 'Check your logic.'],
};

export const CCTV_MSG_CHURCH_EN = {
  high: ["You're doing well~", 'You can do it!', "Let's do this together!", 'So good~', 'God is watching~ proud of you', 'Keep going like this~'],
  mid: ['Just a little more~', "It's okay, focus again~", "Let's take it slow together~", 'Set aside distractions for a bit~', 'Cheer up, almost there~', 'Pray and focus~'],
  low: ["It's okay~ you made it this far", 'Come back slowly~', 'Mistakes are fine', "Let's start again together!", "Don't give up, you can do it~", "Hmm... lost focus? That's okay~"],
  tab: ['Welcome back~ were you away?', "Let's do this together~", 'YouTube can wait~ study time now', 'Thanks for coming back~', 'Come back to the tab, slowly~', 'I was waiting for you~'],
  mouse: ["Where are you going~ stay with me", "Don't let go~", 'Back to the screen, gently~', 'Put the phone down for a bit~', "Let's stay together here~"],
  correct: ['Congrats! Correct~', 'Well done!', 'So happy~', 'Thankful~', "Amazing, let's celebrate together!"],
  wrong: ["It's okay~ you'll get the next one", 'Mistakes are part of learning~', 'Think again, cheering for you~', "Don't give up~"],
};

export const CCTV_MSG_BY_PERSONA = {
  default: CCTV_MSG_BY_SITUATION,
  racer: CCTV_MSG_RACER,
  prof: CCTV_MSG_PROF,
  church: CCTV_MSG_CHURCH,
};

export const CCTV_MSG_BY_PERSONA_EN = {
  default: CCTV_MSG_BY_SITUATION_EN,
  racer: CCTV_MSG_RACER_EN,
  prof: CCTV_MSG_PROF_EN,
  church: CCTV_MSG_CHURCH_EN,
};

export function getCctvSituationMessages(lang) {
  return lang === 'en' ? CCTV_MSG_BY_SITUATION_EN : CCTV_MSG_BY_SITUATION;
}

export function getCctvPersonaTable(persona, lang) {
  const map = lang === 'en' ? CCTV_MSG_BY_PERSONA_EN : CCTV_MSG_BY_PERSONA;
  return map[persona] || map.default;
}

export function pickCctvPool(persona, situation, lang) {
  const situ = getCctvSituationMessages(lang);
  const table = getCctvPersonaTable(persona, lang);
  return table[situation] || situ.high;
}

export const TUTOR_PERSONA = {
  default: { label: '병아리 선배 🐥', image: '/images/tutor.png' },
  racer: { label: '폭주족 선배 🏍', image: '/images/racer.png' },
  prof: { label: '교수님 🎓', image: '/images/prof.png' },
  church: { label: '교회오빠 ✝', image: '/images/church.png' },
};

export const CCTVCamChickImageStyle = {
  default: undefined,
  racer: { width: '68%', height: '68%', objectFit: 'contain' },
  prof: { width: '68%', height: '68%', objectFit: 'contain' },
  church: { width: '68%', height: '68%', objectFit: 'contain' },
};

export function getTutorPersona(persona) {
  return TUTOR_PERSONA[persona] || TUTOR_PERSONA.default;
}

export function getPersonaModeDisplay(persona) {
  switch (persona) {
    case 'racer': return '🏍 폭주족 모드';
    case 'prof': return '🎓 교수님 모드';
    case 'church': return '✝ 교회오빠 모드';
    default: return '🐥 병아리 선배 모드';
  }
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function computeCctvChecks({
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

export function resolveCctvBubbleSituation({ docHidden, mouseInsideDoc, cctvK, resultTone }) {
  if (docHidden) return 'tab';
  if (!mouseInsideDoc) return 'mouse';
  if (resultTone === 'correct') return 'correct';
  if (resultTone === 'wrong') return 'wrong';
  if (cctvK === 4) return 'high';
  if (cctvK === 3) return 'mid';
  if (cctvK === 2) return 'mid';
  return 'low';
}

export function formatStudyMmSs(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function descToOpeningHint(desc) {
  const raw = String(desc || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '설명에서 요구하는 조건만 한 줄로 짚어 보면 돼';
  const firstLine = raw ? raw.split('\n')[0] : '';
  const stop = firstLine.search(/[.!?。路線](\s|$)/);
  let line = (stop >= 0 ? firstLine.slice(0, stop) : firstLine).trim();
  line = line.replace(/[.。!?！？]+$/g, '').trim();
  if (line.length > 88) line = `${line.slice(0, 85).trim()}…`;
  return line || firstLine.slice(0, 88);
}

export function tutorOpeningMessage(problem, persona = 'default') {
  const title = problem?.title?.trim() || '이번 문제';
  const hint = descToOpeningHint(problem?.desc);
  switch (persona) {
    case 'racer': return `「${title}」야. ${hint} 어떻게 할 건데?`;
    case 'prof': return `본 문제는 「${title}」입니다. ${hint} 접근 순서를 생각해 보시기 바랍니다.`;
    case 'church': return `「${title}」 문제예요~ ${hint} 천천히 같이 생각해봐요. 괜찮아요~`;
    default: return `「${title}」 문제야. ${hint} 어떻게 접근할 것 같아, 삐약?`;
  }
}

export function keywordToGuideQuestion(keyword, index) {
  const kw = String(keyword).trim();
  const templates = [
    (k) => (/^(if|for|while|switch|try)$/i.test(k) ? `${k}문이 뭐야?` : `${k}가 뭐야?`),
    (k) => `${k}는 언제 써?`,
    (k) => `${k}가 없으면 어떻게 돼?`,
    (k) => `${k}는 어떻게 써?`,
  ];
  return templates[index % templates.length](kw);
}

export function readStoredPersona(fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem('chickodePrefs') || '{}');
    return raw.persona ?? fallback ?? 'default';
  } catch {
    return fallback ?? 'default';
  }
}
