/*문제 풀이 및 IDE 화면을 담당하는 컴포넌트입니다. 사용자가 코드를 직접 작성하거나 객관식 답안을 고르며
 AI 튜터(병아리 선배)의 도움을 받아 학습할 수 있는 공간*/
const settings = location.state || { count: 10, ratio: 50, chapter: 1, difficulty: '중' }; // 라우터 변수에서 세션 설정 획득 또는 디폴트 객체 할당
console.log('settings:', settings); // 콘솔창에 현재 구동될 퀴즈 환경설정 출력


import { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // 리액트 컴포넌트 제어에 필요한 핵심 훅 임포트
import { useLocation, useNavigate } from 'react-router-dom'; // 라우팅 및 페이지 전환을 위한 훅 임포트
import { javaProblems } from '../data/problems'; // 자바 문제 데이터셋 배열 가져오기
import { addAttempt, getProfile } from '../state/app-state'; // 풀이 기록 저장 및 프로필 조회 함수 임포트
import CodeMirror from '@uiw/react-codemirror'; // 소스코드 작성을 위한 에디터 컴포넌트 임포트
import { java } from '@codemirror/lang-java'; // 에디터용 Java 문법 하이라이터 임포트
import { oneDark } from '@codemirror/theme-one-dark'; // 에디터용 원다크 어두운 테마 임포트

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // 환경변수에서 API 주소를 읽어오거나 디폴트 백엔드 포트 지정

/** CHICK CAM 말풍선 — 상황별 풀 (15초마다 같은 상황 내 랜덤 교체) */
const CCTV_MSG_HIGH = [ // 집중도 최상(점수 4점)일 때 띄우는 한국어 칭찬 대사 배열
 '열심히 하네~ 좋아!',
 '오 제법인데? 삐약!',
 '이 정도면 합격이야 삐약!',
 '계속 이렇게만 해봐!',
 '집중력 최고야 삐약!',
 '내 제자 맞지? 뿌듯해~',
];
const CCTV_MSG_MID = [ // 집중도 보통(점수 2~3점)일 때 환기시키는 한국어 대사 배열
 '조금 더 집중해봐 삐약!',
 '살짝 느슨해지는데?',
 '방심하면 안 돼 삐약!',
 '딴생각 하는 거 다 보여~',
 '힘내! 거의 다 왔어 삐약!',
 '슬슬 집중력이 떨어지는군...',
];
const CCTV_MSG_LOW = [ // 집중도 최하(점수 0~1점)일 때 경고하는 한국어 대사 배열
 '집중 끊겼어! 지금 뭐 해?',
 '⚠️ 경고! 딴짓 발견!',
 '이러다 다 틀린다 삐약!',
 '지금 당장 집중 안 해?!',
 '내가 보고 있다는 거 잊었어?',
 '공부하러 온 거 맞지? 삐약!',
];
const CCTV_MSG_TAB = [ // 브라우저 탭 이탈 시 한소리 하는 한국어 대사 배열
 '어디 갔다 왔어? 👀',
 '유튜브 본 거 다 알아 삐약!',
 '탭 이동 감지됨... 수상해!',
 'AI한테 물어본 거지? 삐약!',
 '잠깐! 딴 탭 발견! 집중도 감소!',
 '어딜 돌아다녀~ 빨리 와 삐약!',
];
const CCTV_MSG_MOUSE = [ // 마우스 포인터가 윈도우 밖으로 나갔을 때의 한국어 대사 배열
 '도망가려고? 삐약!',
 '마우스 이탈 감지! 👀',
 '어디 가? 아직 다 못 풀었잖아!',
 '잠깐, 손이 왜 거기 있어?',
 '핸드폰 만지려는 거 알아 삐약!',
];
const CCTV_MSG_CORRECT = [ // 채점 결과 정답일 때 축하해주는 한국어 대사 배열
 '오!! 정답! 역시 내 제자!',
 '완벽해! 삐약! 🎉',
 '대박! 이 문제 맞추다니!',
 '감시한 보람이 있네~ 삐약!',
];
const CCTV_MSG_WRONG = [ // 채점 결과 오답일 때 격려하는 한국어 대사 배열
 '아쉽다... 다시 생각해봐!',
 '틀렸어! 집중 안 한 탓이야 삐약!',
 '이건 좀 더 공부가 필요해~',
 '괜찮아, 다음엔 맞출 수 있어!',
];

const CCTV_MSG_HIGH_EN = [ // 집중도 최상 모드일 때의 영어(Global) 대사 배열
 "You're doing great! Keep it up!",
 'Nice work! 🐥',
 "That's the spirit!",
 'Stay focused!',
 "You're on fire!",
 'Proud of you~',
];
const CCTV_MSG_MID_EN = [ // 집중도 보통 모드일 때의 영어 대사 배열
 'Stay focused! 🐥',
 'Getting a bit distracted?',
 "Don't lose focus!",
 'I can see you daydreaming~',
 'Almost there, keep going!',
 'Focus is slipping...',
];
const CCTV_MSG_LOW_EN = [ // 집중도 최하 모드일 때의 영어 경고 대사 배열
 'Hey! What are you doing?!',
 '⚠️ Warning! Slacking detected!',
 "You'll get them all wrong!",
 'Focus RIGHT NOW!',
 "Don't forget I'm watching!",
 'You came here to study, right?!',
];
const CCTV_MSG_TAB_EN = [ // 탭 이탈 시의 영어 잔소리 대사 배열
 'Where did you go? 👀',
 'I know you watched YouTube!',
 'Tab switch detected... suspicious!',
 'Did you ask another AI? 🐥',
 'Caught you! Focus dropping!',
 'Come back here~ 🐥',
];
const CCTV_MSG_MOUSE_EN = [ // 마우스 창 밖 이탈 시의 영어 대사 배열
 'Trying to escape? 🐥',
 'Mouse escape detected! 👀',
 'Where are you going?!',
 'Why is your hand over there?',
 'I know you want your phone!',
];
const CCTV_MSG_CORRECT_EN = [ // 정답 처리에 대한 영어 축하 대사 배열
 "Correct! That's my student!",
 'Perfect! 🎉',
 'Amazing! You got it!',
 'Worth watching you~ 🐥',
];
const CCTV_MSG_WRONG_EN = [ // 오답 처리에 대한 영어 피드백 대사 배열
 'Aww... think again!',
 "Wrong! Should've focused more!",
 'Need more study on this~',
 "It's okay, next time!",
];

const CCTV_MSG_BY_SITUATION = { // 한국어 상황별 멘트 리스트를 모아둔 매핑 딕셔너리
 high: CCTV_MSG_HIGH,
 mid: CCTV_MSG_MID,
 low: CCTV_MSG_LOW,
 tab: CCTV_MSG_TAB,
 mouse: CCTV_MSG_MOUSE,
 correct: CCTV_MSG_CORRECT,
 wrong: CCTV_MSG_WRONG,
};

const CCTV_MSG_BY_SITUATION_EN = { // 영어 상황별 멘트 리스트를 모아둔 매핑 딕셔너리
 high: CCTV_MSG_HIGH_EN,
 mid: CCTV_MSG_MID_EN,
 low: CCTV_MSG_LOW_EN,
 tab: CCTV_MSG_TAB_EN,
 mouse: CCTV_MSG_MOUSE_EN,
 correct: CCTV_MSG_CORRECT_EN,
 wrong: CCTV_MSG_WRONG_EN,
};

/** CHICK CAM — 페르소나별 멘트 */
const CCTV_MSG_RACER = { // '폭주족 선배' 부캐릭터 성격의 상황별 대사 매핑 객체
 high: ['오 나쁘지 않아!', '그 속도 유지!', '이 정도면 간다!', '집중 유지!', '금방 끝낸다!', '좋아 붙어!'],
 mid: ['집중 안 해?!', '딴짓 치우고 와!', '빨리빨리!', '손 놀리지 마!', '탭 또 돌아다녀?!', '한 번에 박자!'],
 low: ['지금 뭐 해?!', '집중 파탄이다!', '이러다 전부 날린다!', '당장 화면으로!', '공부하러 왔지?!', '빨리 복귀!'],
 tab: ['어딜 갔어!', '탭 닫고 와!', '유튜브 금지!', '또 빠졌어?!', '당장 돌아와!', '감시 중이다!'],
 mouse: ['도망가?', '손 어디!', '화면 밖으로 나와!', '핸드폰 그만!', '자리 지켜!'],
 correct: ['오! 정답!', '가자!', '이거지!', '역시!', '통과!'],
 wrong: ['틀렸어. 다시!', '아깝다 한 번 더!', '집중 안 해서 그래!', '다시 쳐봐!'],
};
const CCTV_MSG_PROF = { // '교수님' 부캐릭터 성격의 이성적이고 딱딱한 대사 매핑 객체
 high: ['학습 몰입도가 양호합니다.', '좋은 진전입니다.', '계속 유지하십시오.', '적절한 학습 태도입니다.', '훌륭한 집중력입니다.', '이 페이스가 바람직합니다.'],
 mid: ['학습 효율이 저하되고 있습니다.', '집중력을 유지하세요.', '약간의 산만함이 관찰됩니다.', '목표 달성을 위해 재정비가 필요합니다.', '학습 리듬을 찾으시기 바랍니다.', '주의가 분산되고 있습니다.'],
 low: ['집중 유지에 실패했습니다.', '학습 세션이 위험 수준입니다.', '즉시 태도를 교정하십시오.', '이탈 행동이 반복되고 있습니다.', '학습 목표에서 이탈 중입니다.', '경고: 집중도 최저 수준입니다.'],
 tab: ['탭 전환이 감지되었습니다.', '다른 작업으로 이탈한 것으로 보입니다.', '학습 환경으로 복귀하십시오.', '부적절한 멀티태스킹입니다.', '수업 화면으로 돌아오십시오.', '주의: 탭 이탈입니다.'],
 mouse: ['포인터 이탈이 확인되었습니다.', '작업 영역을 이탈했습니다.', '입력 장치 위치를 확인하십시오.', '학습 구역에 포인터를 두십시오.', '이탈이 반복되고 있습니다.'],
 correct: ['정답입니다. 훌륭합니다.', '매우 정확한 풀이입니다.', '개념 이해가 확인되었습니다.', '훌륭한 결과입니다.', '계속 유지하십시오.'],
 wrong: ['오답입니다. 재검토가 필요합니다.', '풀이에 오류가 있습니다.', '개념을 다시 확인하십시오.', '논리를 점검해 보십시오.'],
};
const CCTV_MSG_CHURCH = { // '교회 오빠' 부캐릭터 성격의 다정다감하고 온화한 대사 매핑 객체
 high: ['잘하고 있어요~', '할 수 있어요!', '함께 해봐요!', '너무 좋아요~', '하나님이 보고 계셔요~ 뿌듯해요', '이대로 가면 돼요~'],
 mid: ['조금만 더 힘내봐요~', '괜찮아요, 다시 집중해봐요', '함께 천천히 해볼까요?', '딴생각은 잠깐 내려놔요~', '힘내세요, 거의 왔어요~', '기도하며 집중해요~'],
 low: ['괜찮아요~ 여기까지 온 것도 대단해요', '천천히 다시 와요~', '실수해도 괜찮아요', '지금부터 같이 다시 해봐요!', '놓치지 말아요, 할 수 있어요~', '음... 집중이 끊겼네요? 괜찮아요~'],
 tab: ['잠깐 멀리 갔다 오셨나요? 환영해요~', '다시 같이 해요~', '유튜브는 나중에~ 지금은 공부 시간이에요', '돌아와줘서 고마워요~', '천천히, 탭으로 돌아와요~', '기다리고 있었어요~'],
 mouse: ['어디 가요~ 같이 있어요', '손 놓치지 말아요~', '천천히 화면으로~', '핸드폰은 잠깐 내려놔요~', '여기 함께해요~'],
 correct: ['축하해요! 정답이에요~', '참 잘했어요!', '기뻐요~', '하나님께도 감사드려요~', '대단해요, 함께 기뻐해요!'],
 wrong: ['괜찮아요~ 다음엔 맞출 수 있어요', '실수는 배움의 한 조각이에요~', '다시 생각해봐요, 응원할게요~', '힘내요, 포기하지 마요~'],
};

const CCTV_MSG_RACER_EN = { // '폭주족 선배' 영문 모드 전용 대사 데이터셋
 high: ['Not bad!', 'Keep that pace!', 'You got this!', 'Stay locked in!', 'Almost done!', 'Nice, keep going!'],
 mid: ['Focus!!', 'Quit slacking!', 'Faster faster!', 'Hands on keyboard!', 'Switching tabs again?!', 'One beat at a time!'],
 low: ['What are you doing?!', 'Focus is gone!', "You'll blow it all!", 'Back to the screen!', 'You came to study?!', 'Get back now!'],
 tab: ['Where did you go!', 'Close that tab!', 'No YouTube!', 'Slacking again?!', 'Come back now!', "I'm watching!"],
 mouse: ['Running away?', 'Where are your hands!', 'Off screen!', 'Phone down!', 'Stay in your seat!'],
 correct: ['Yes! Correct!', "Let's go!", "That's it!", 'Knew it!', 'Pass!'],
 wrong: ['Wrong. Again!', 'So close, once more!', "You weren't focused!", 'Try again!'],
};
const CCTV_MSG_PROF_EN = { // '교수님' 영문 모드 전용 대사 데이터셋
 high: ['Your engagement is satisfactory.', 'Good progress.', 'Please maintain this pace.', 'Appropriate study attitude.', 'Excellent focus.', 'This pace is commendable.'],
 mid: ['Learning efficiency is declining.', 'Please maintain focus.', 'Mild distraction observed.', 'Recalibration needed for goals.', 'Please find your rhythm.', 'Attention is diverging.'],
 low: ['Failed to maintain focus.', 'Session at risk level.', 'Correct your attitude immediately.', 'Repeated disengagement.', 'Drifting from learning goals.', 'Warning: minimum focus level.'],
 tab: ['Tab switch detected.', 'Appears you left the task.', 'Please return to study.', 'Inappropriate multitasking.', 'Return to the lesson screen.', 'Caution: tab departure.'],
 mouse: ['Pointer departure confirmed.', 'Left the work area.', 'Check input device position.', 'Keep pointer in study zone.', 'Repeated departure.'],
 correct: ['Correct. Excellent.', 'Very accurate solution.', 'Concept understanding confirmed.', 'Outstanding result.', 'Please continue.'],
 wrong: ['Incorrect. Review needed.', 'Error in solution.', 'Please verify concept.', 'Check your logic.'],
};
const CCTV_MSG_CHURCH_EN = { // '교회 오빠' 영문 모드 전용 대사 데이터셋
 high: ["You're doing well~", 'You can do it!', "Let's do this together!", 'So good~', 'God is watching~ proud of you', 'Keep going like this~'],
 mid: ['Just a little more~', "It's okay, focus again~", "Let's take it slow together~", 'Set aside distractions for a bit~', 'Cheer up, almost there~', 'Pray and focus~'],
 low: ["It's okay~ you made it this far", 'Come back slowly~', 'Mistakes are fine', "Let's start again together!", "Don't give up, you can do it~", "Hmm... lost focus? That's okay~"],
 tab: ['Welcome back~ were you away?', "Let's do this together~", 'YouTube can wait~ study time now', 'Thanks for coming back~', 'Come back to the tab, slowly~', 'I was waiting for you~'],
 mouse: ["Where are you going~ stay with me", "Don't let go~", 'Back to the screen, gently~', 'Put the phone down for a bit~', "Let's stay together here~"],
 correct: ['Congrats! Correct~', 'Well done!', 'So happy~', 'Thankful~', "Amazing, let's celebrate together!"],
 wrong: ["It's okay~ you'll get the next one", 'Mistakes are part of learning~', 'Think again, cheering for you~', "Don't give up~"],
};

const CCTV_MSG_BY_PERSONA = { // 한국어의 모든 페르소나 객체를 한 번 더 상위에서 매핑한 마스터 딕셔너리
 default: CCTV_MSG_BY_SITUATION,
 racer: CCTV_MSG_RACER,
 prof: CCTV_MSG_PROF,
 church: CCTV_MSG_CHURCH,
};

const CCTV_MSG_BY_PERSONA_EN = { // 영어의 모든 페르소나 객체를 한 번 더 상위에서 매핑한 마스터 딕셔너리
 default: CCTV_MSG_BY_SITUATION_EN,
 racer: CCTV_MSG_RACER_EN,
 prof: CCTV_MSG_PROF_EN,
 church: CCTV_MSG_CHURCH_EN,
};

function getCctvSituationMessages(lang) { // 인자 언어값(lang)에 대응하는 디폴트 대사 팩을 가려내는 헬퍼 함수
 return lang === 'en' ? CCTV_MSG_BY_SITUATION_EN : CCTV_MSG_BY_SITUATION;
}

function getCctvPersonaTable(persona, lang) { // 페르소나와 매칭 언어를 상호 조회하여 맵 조각을 도출하는 헬퍼 함수
 const map = lang === 'en' ? CCTV_MSG_BY_PERSONA_EN : CCTV_MSG_BY_PERSONA;
 return map[persona] || map.default;
}

function pickCctvPool(persona, situation, lang) { // 페르소나, 특수 상황 코드, 유저 언어 3종을 혼합해 대사 목록(풀)을 리턴하는 핵심 제어식
 const situ = getCctvSituationMessages(lang);
 const table = getCctvPersonaTable(persona, lang);
 return table[situation] || situ.high;
}

const TUTOR_PERSONA = { // 대화창 및 대쉬보드 헤더용 타이틀 텍스트 및 대표 캐릭터 아바타 경로 객체
 default: { label: '병아리 선배 🐥', image: '/images/chick.png' },
 racer: { label: '폭주족 선배 🏍', image: '/images/chick.png' },
 prof: { label: '교수님 🎓', image: '/images/chick.png' },
 church: { label: '교회오빠 ✝', image: '/images/chick.png' },
};

function getTutorPersona(persona) { // 키워드로 매칭되는 프로필 이미지 정보 서칭 헬퍼 함수
 return TUTOR_PERSONA[persona] || TUTOR_PERSONA.default;
}

/** 왼쪽 패널 페르소나 모드 표시용 */
function getPersonaModeDisplay(persona) { // 좌측 하단에 타이틀 문구 렌더링 목적의 분기 문자열 리턴 함수
 switch (persona) {
   case 'racer':
     return '🏍 폭주족 모드';
   case 'prof':
     return '🎓 교수님 모드';
   case 'church':
     return '✝ 교회오빠 모드';
   default:
     return '🐥 병아리 선배 모드';
 }
}

function pickRandom(arr) { // 배열에서 임의의 요소 1개를 임의 난수 추출하는 공통 수학 식
 return arr[Math.floor(Math.random() * arr.length)];
}

/** 말풍선 상황 키 (우선순위: 탭 이탈 → 마우스 이탈 → 정답/오답 피드백 → 집중도 구간) */
/** CHICK CAM 감시 4항목 (집중도 k와 동일 정의) */
function computeCctvChecks({ // 4가지 조작 로그 스탬프를 판별해 실시간 집중도 척도 계수 k를 산출해 내는 함수
 now,
 isCoding,
 docHidden,
 mouseInsideDoc,
 editorTyping,
 lastCodeEditAt,
 lastMcqAt,
 lastActivityAt,
}) {
 // 30초 내 타이핑 혹은 객관식 마킹이 활발히 이뤄졌는지 플래그 확보
 const itemCodeTyping = isCoding
   ? lastCodeEditAt != null && now - lastCodeEditAt < 30000
   : lastMcqAt != null && now - lastMcqAt < 30000;
 const itemTabOk = !docHidden; // 다른 사이트로의 탭 이동 없음 여부
 const itemSteadyTyping = isCoding // 타이핑 입력 또는 종합 상호작용이 끊김 없이 활발한가
   ? lastCodeEditAt != null && now - lastCodeEditAt < 30000
   : now - lastActivityAt < 30000;
 const itemMouseOk = mouseInsideDoc; // 포인터가 윈도우 안에 안착해 있는가
 const checks = [itemCodeTyping, itemTabOk, itemSteadyTyping, itemMouseOk]; // 4개 참/거짓 판단 요소를 묶음 배열 처리
 const k = checks.filter(Boolean).length; // true인 원소의 총 개수 연산 (0~4점 점수 산정)
 return { checks, k, itemCodeTyping, itemTabOk, itemSteadyTyping, itemMouseOk }; // 연산 정보 전반을 묶어 패키징 리턴
}

/** 감시항목 충족 개수(0~4) → 말풍선 풀. 탭/마우스/채점 피드백 우선 */
function resolveCctvBubbleSituation({ docHidden, mouseInsideDoc, cctvK, resultTone }) { // 상태 계수값들에 따라 CCTV 멘트 태그 상황을 확정하는 엔진 함수
 if (docHidden) return 'tab'; // 탭 이탈을 최우선으로 'tab' 태그 반환
 if (!mouseInsideDoc) return 'mouse'; // 마우스 가출을 2순위로 'mouse' 태그 반환
 if (resultTone === 'correct') return 'correct'; // 방금 맞춘 상황이면 'correct' 반환
 if (resultTone === 'wrong') return 'wrong'; // 방금 틀린 상황이면 'wrong' 반환
 if (cctvK === 4) return 'high'; // 만점 시 최상 집중 'high' 반환
 if (cctvK === 3) return 'mid'; // 보통 상태 'mid' 반환
 if (cctvK === 2) return 'mid'; // 보통 상태 'mid' 반환
 return 'low'; // 1점 이하 딴짓 심각 시 'low' 경고 반환
}

function formatStudyMmSs(totalSec) { // 숫자로 이뤄진 총 누적 초 단위를 디지털 시계용 텍스트 포맷으로 바꾸는 변환기
 const m = Math.floor(totalSec / 60);
 const s = totalSec % 60;
 return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 문제 설명에서 첫 문장·한 줄 정도만 뽑아 오프닝에 씀 */
function descToOpeningHint(desc) { // 문제 지문 본문에서 첫 문장의 마침표 구역까지만 스마트 슬라이싱해 주는 문장 가공 함수
 const raw = String(desc || '').trim().replace(/\s+/g, ' ');
 if (!raw) return '설명에서 요구하는 조건만 한 줄로 짚어 보면 돼';
 const firstLine = raw.split('\n')[0];
 const stop = firstLine.search(/[.!?。！？](\s|$)/);
 let line = (stop >= 0 ? firstLine.slice(0, stop) : firstLine).trim();
 line = line.replace(/[.。!?！？]+$/g, '').trim();
 if (line.length > 88) line = `${line.slice(0, 85).trim()}…`; // 가로 폭 유지를 위해 88글자 초과 시 말줄임표 변환
 return line || firstLine.slice(0, 88);
}

/** 짧은 질문형 오프닝 (최대 2문장 느낌, 마지막은 질문) */
function tutorOpeningMessage(problem, persona = 'default') { // 최초 진입 시 문제 소개와 힌트를 부캐 성격에 맞추어 오프닝 멘트로 출력하는 함수
 const title = problem?.title?.trim() || '이번 문제';
 const hint = descToOpeningHint(problem?.desc);
 switch (persona) {
   case 'racer':
     return `「${title}」야. ${hint} 어떻게 할 건데?`;
   case 'prof':
     return `본 문제는 「${title}」입니다. ${hint} 접근 순서를 생각해 보시기 바랍니다.`;
   case 'church':
     return `「${title}」 문제예요~ ${hint} 천천히 같이 생각해봐요. 괜찮아요~`;
   default:
     return `「${title}」 문제야. ${hint} 어떻게 접근할 것 같아, 삐약?`;
 }
}

const MCQ_GUIDE_CHIP_QUESTIONS = [ // 객관식 풀이 형태에서 채팅 추천 가이드 칩 영역에 채워 넣는 기본 고정 질문문 리스트
 '이 문제 핵심이 뭐야?',
 '각 보기 차이가 뭐야?',
 '헷갈리는 개념 설명해줘',
];

const GUIDE_QUESTION_TEMPLATES = [ // 코딩 문제 유형에서 키워드를 품은 자연스러운 질문 형태로 다채롭게 바꿔주는 순환형 함수 포뮬러
 (k) => (/^(if|for|while|switch|try)$/i.test(k) ? `${k}문이 뭐야?` : `${k}가 뭐야?`),
 (k) => `${k}는 언제 써?`,
 (k) => `${k}가 없으면 어떻게 돼?`,
 (k) => `${k}는 어떻게 써?`,
];

/** 가이드 칩에 보여 줄 질문 문장 (키워드당 템플릿 순환) */
function keywordToGuideQuestion(keyword, index) { // 템플릿 목록 인덱스를 순환 잉여 계산하여 입체적인 자동 가이드 문구를 도출하는 매칭 기하식
 const kw = String(keyword).trim();
 return GUIDE_QUESTION_TEMPLATES[index % GUIDE_QUESTION_TEMPLATES.length](kw);
}

function normalizeKeywordKey(keyword) { // 스트링 키워드의 공백을 한 칸으로 통일하고 소문자로 획일 정규화 처리해주는 문자 마사지 로직
 const kw = String(keyword).trim();
 return String(keyword).trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 오프라인: 키워드별 구체 답변 (표에 없으면 문제 맥락 일반 설명) */
function getOfflineKeywordAnswer(keyword, problem) { // 서버 연결에 예기치 못한 에러가 나도 기본 자바 키워드는 자체 선에서 해결해 주는 하드코딩 백업 데이터 웅덩이
 const title = problem?.title?.trim() || '이 문제';
 const k = normalizeKeywordKey(keyword);
 const table = {
   if: `**if**는 조건이 참일 때만 중괄호 {} 안 코드를 실행하는 **조건문**이야. 조건은 소괄호 () 안에 넣고, 비교·논리 연산자를 섞어 쓸 수 있어. 「${title}」에서는 "언제 이 블록을 탈지"를 말로 먼저 적어 보면 if 조건식이 잡히기 쉬워, 삐약!`,
   'else if': `**else if**는 앞의 **if**(또는 else if)가 거짓일 때 **다른 조건을 한 번 더** 검사할 때 써. if만으로는 갈래가 부족할 때 이어 붙이면 돼. 여러 else if를 나열하면 위에서부터 순서대로만 하나가 실행돼. 「${title}」도 경우의 수를 나눌 때 순서가 중요해, 삐약!`,
   else: `「else」는 위쪽 if·else if가 전부 거짓일 때 실행할 기본 동작을 넣는 자리야. 꼭 필요한 건 아니지만, "나머지 전부"를 처리하려면 else가 깔끔해. else가 없으면 조건에 안 맞을 때는 아무 것도 안 하고 그냥 지나갈 수 있어—그게 버그 원인이 될 때도 있어, 삐약!`,
   for: `**for**는 보통 **반복 횟수가 정해졌을 때** 쓰는 반복문이야. for(초기식; 조건식; 증감식) 형태로, 조건이 참인 동안 블록을 반복해. 배열 인덱스 0부터 끝까지 도는 패턴이 자주 나와. 「${title}」에서 몇 번·어떤 범위를 도는지 먼저 정리해 봐, 삐약!`,
   while: `**while**은 조건이 **참인 동안** 블록을 계속 반복해. 횟수보다 "이 조건이 만족되는 한"에 가깝지. 조건이 영원히 참이면 무한 루프니까, 루프 안에서 조건이 바뀌게 만드는지 꼭 확인해. 「${title}」의 종료 조건이 뭔지 말로 써 보는 게 좋아, 삐약!`,
   switch: `**switch**는 **하나의 값**을 기준으로 여러 경우로 **갈라줄 때** 쓰는 문법이야. switch(값) 아래에 case 레이블을 두고, break로 흐름을 끊어 주는 게 일반적이야. if-else if를 길게 쓴 것과 비슷한데, "같은 변수의 동등 비교"가 많을 때 읽기 좋을 때가 있어, 삐약!`,
   case: `**case**는 **switch** 안에서 "이 값일 때 여기로 온다"를 표시하는 **레이블**이야. 실행은 그 case부터 아래로 쭉 내려가서, 보통 **break**로 switch를 빠져나와. break를 빼면 fall-through라서 다음 case도 이어서 실행돼—의도한 거면 괜찮지만 실수면 버그야, 삐약!`,
   break: `**break**는 **가장 가까운** switch나 반복문(for·while·do-while)을 **즉시 빠져나오게** 해. 중첩 루프에서는 안쪽 루프만 빠져나가. 「${title}」에서 "여기서 더 돌 필요 없음"을 표현할 때 쓰는 거야, 삐약!`,
   continue: `**continue**는 **이번 반복만 건너뛰고** 다음 반복으로 바로 가. break는 루프 전체를 끝내지만, continue는 나머지 도는 건 유지해. 특정 조건일 때 이번 바퀴만 스킵할 때 쓰여, 삐약!`,
   return: `**return**은 **메서드를 끝내고** 호출한 쪽에 **값을 돌려줄 때**(또는 void면 그냥 종료) 써. return을 만나면 그 아래 코드는 실행되지 않아. 「${title}」에서 "정답/결과를 언제 돌려줄지"를 정하면 return 위치가 보일 거야, 삐약!`,
   class: `**class**는 객체의 설계도야. 필드(데이터)랑 메서드(동작)를 묶어. Java에서는 보통 한 파일에 public class 하나가 많고, 이름이 파일명과 맞춰져. 「${title}」에서 어떤 역할을 하는 객체인지 한 문장으로 적어 보면 class 구성이 잡혀, 삐약!`,
   public: `**public**은 **어디서든** 접근 가능하다는 **접근 제한자**야. class·메서드·필드 앞에 붙일 수 있어. 반대로 private은 클래스 안에서만. Main에서 부를 메서드면 public static이 자주 나와, 삐약!`,
   private: `**private**는 **그 클래스 안에서만** 필드·메서드를 쓰게 막아. 캡슐화해서 바깥에서 함부로 못 바꾸게 할 때 써. 필요하면 public getter/setter로만 열어 주는 패턴이 흔해, 삐약!`,
   static: `**static**은 **인스턴스가 아니라 클래스에 붙는** 멤버야. static 메서드는 객체를 만들기 전에도 클래스 이름으로 호출할 수 있어. main이 static인 이유도 그거야. 인스턴스 필드를 static 메서드에서 바로 못 쓰는 경우가 있어—주의해, 삐약!`,
   void: `**void**는 메서드가 **값을 돌려주지 않는다**는 뜻이야. return 타입 자리에 온다. 반환값이 있으면 int, String 같은 타입을 쓰고, return으로 그 타입 값을 돌려줘야 해, 삐약!`,
   int: `**int**는 정수 타입이야. 소수 없이 32비트 범위의 정수를 다뤄. 계산·카운터·배열 인덱스에 자주 써. 나눗셈에서 소수가 필요하면 double/float을 써야 해, 삐약!`,
   double: `**double**은 **실수(부동소수점)** 타입이야. int 나눗셈과 달리 소수 결과를 낼 수 있어. 금융처럼 정확도가 중요하면 BigDecimal 같은 걸 쓰기도 하지만, 「${title}」 수준에서는 double로 충분할 때가 많아, 삐약!`,
   boolean: `**boolean**은 **true / false**만 가질 수 있는 타입이야. if·while 조건식이 boolean 문맥이 되는 경우가 많아. 비교 연산(==, <, ...)의 결과도 boolean이야, 삐약!`,
   string: `**String**은 문자열 타입이야. 참조형이라 내용이 같아도 == 비교는 참조를 비교할 수 있어—**내용 비교는 equals()**를 써. +로 이어붙이기도 하지만, 많이 반복하면 StringBuilder가 나을 때도 있어, 삐약!`,
   char: `**char**는 **글자 하나**를 담는 타입이야. 작은따옴표 'a'처럼 써. String은 char들의 나열이라고 보면 돼, 삐약!`,
   array: `**배열(array)** 은 같은 타입을 **고정 길이**로 나란히 담는 구조야. int[] arr = new int[n]; 처럼 만들고 arr[i]로 접근해. 길이는 arr.length. 범위 밖 인덱스는 에러 나니까 반복문 조건을 잘 맞춰, 삐약!`,
   list: `**List**(예: ArrayList)는 **길이가 늘었다 줄었다** 하는 동적 목록이야. 배열과 달리 add/remove가 편해. import java.util.*; 하고 List<String> list = new ArrayList<>(); 같은 식으로 많이 써, 삐약!`,
   try: `**try**는 **예외가 날 수 있는 코드**를 감싸는 블록이야. try 안에서 예외가 나면 **catch**로 넘어가서 처리해. finally가 있으면 성공·실패와 관계없이 실행되는 구간이야, 삐약!`,
   catch: `**catch**는 try에서 던져진 **예외를 잡아서** 처리하는 블록이야. catch (Exception e)처럼 타입을 정해. 잡은 뒤 로그·메시지·대체 동작을 넣을 수 있어. 아무 것도 안 하면 문제를 숨길 수 있으니 주의해, 삐약!`,
   finally: `**finally**는 try-catch 뒤에 붙어서 **거의 항상 실행**되는 블록이야. 파일 닫기·락 해제처럼 "꼭 정리해야 할 것"에 써. return이 있어도 finally는 보통 실행된다고 기억해, 삐약!`,
   throw: `**throw**는 **직접 예외를 던질 때** 써. throw new IllegalArgumentException("..."); 처럼. 메서드 시그니처에 throws를 선언하면 호출자에게 넘길 수도 있어, 삐약!`,
   new: `**new**는 **객체를 새로 만들 때** 쓰는 연산자야. new 클래스이름() 하면 생성자가 호출돼. 배열도 new int[10]처럼 만들 수 있어, 삐약!`,
   this: `**this**는 **현재 인스턴스**를 가리켜. 필드와 매개변수 이름이 같을 때 this.name = name처럼 구분할 때 많이 써. 생성자에서 다른 생성자를 this(...)로 부를 때도 써, 삐약!`,
   super: `**super**는 **부모 클래스** 쪽을 가리켜. super(...)로 부모 생성자 호출, super.method()로 오버라이드한 메서드의 부모 구현을 호출할 때 써, 삐약!`,
   extends: `**extends**는 **클래스 상속**할 때 써. class 자식 extends 부모 형태야. 부모의 public·protected 멤버를 물려받고, 메서드는 @Override로 재정의할 수 있어, 삐약!`,
   implements: `**implements**는 **인터페이스를 구현**한다는 뜻이야. class가 interface의 추상 메서드를 전부 구현해야 해. Java는 클래스 다중 상속 대신 인터페이스 여러 개 implements가 가능해, 삐약!`,
   interface: `**interface**는 **해야 할 메서드 목록(계약)** 을 정의해. 구현은 class가 implements로 책임져. 상수(public static final)나 default 메서드도 둘 수 있어, 삐약!`,
   import: `**import**는 다른 패키지의 클래스 이름을 **짧게 쓰기 위해** 가져와. java.util.Scanner처럼 풀 패키지 대신 Scanner만 쓰게 해. 같은 패키지·java.lang은 생략 가능한 경우가 많아, 삐약!`,
   package: `**package**는 파일 맨 위에 적어서 **이 클래스가 속한 폴더(패키지)** 를 정해. 디렉터리 구조와 맞춰야 하고, 다른 패키지에서 쓰려면 import가 필요해, 삐약!`,
   null: `**null**은 **참조가 아무 객체도 가리키지 않음**을 뜻해. null인데 .method()나 필드에 접근하면 NullPointerException이 나. if (x != null) 같이 검사하는 습관이 중요해, 삐약!`,
   scanner: `**Scanner**는 입력을 읽을 때 쓰는 클래스야. Scanner sc = new Scanner(System.in); 하고 nextInt(), nextLine() 등으로 읽어. 한 줄 읽고 숫자 읽을 때 nextLine과 nextInt 섞이면 버퍼 때문에 헷갈릴 수 있어—순서 조심해, 삐약!`,
   system: `**System**은 표준 입출력·시간 등 시스템 관련 static 멤버가 있는 클래스야. **System.out.println**으로 콘솔에 출력, **System.in**은 표준 입력. 「${title}」에서 출력 확인할 때 자주 볼 거야, 삐약!`,
   println: `**println**은 **한 줄 출력하고 줄 바꿈**해. System.out.println(값); 괄호 안을 문자열로 이어 붙이려면 +를 쓰거나 String.format을 써. print는 줄 바꿈 없어, 삐약!`,
   printf: `**printf**는 **포맷 문자열**로 출력해. System.out.printf("%d %s%n", n, s); 처럼 써. C 스타일 포맷이라 %d, %f, %s를 맞춰야 해, 삐약!`,
   length: `**length**는 배열이면 **arr.length**(필드), String이면 **str.length()**(메서드)야. 헷갈리기 쉬우니 문제에서 뭔 타입인지 보고 골라, 삐약!`,
   equals: `**equals**는 객체의 **내용이 같은지** 비교할 때 써. String은 반드시 equals로 비교하는 습관을 들여. ==는 참조 동일 여부일 때만 true야, 삐약!`,
   '==': `**==**는 **기본형**이면 값이 같은지, **참조형**이면 같은 객체를 가리키는지 비교해. String 내용 비교에는 equals를 써. 숫자 비교는 타입을 맞추고(캐스팅) 하는 게 안전해, 삐약!`,
   main: `**main**은 프로그램 **시작점**이야. public static void main(String[] args) 시그니처를 JVM이 찾아. args는 커맨드라인 인자야. 「${title}」 실행 흐름이 여기서 시작된다고 보면 돼, 삐약!`,
 };
 if (table[k]) { // 찾는 검색어가 테이블 내부에 확보된 정식 단어인 경우 가공값 즉시 송출
   return `${table[k].replace(/\*\*/g, '')} (오프라인 모드 삐약)`;
 }
 const kwOriginal = String(keyword).trim(); // 테이블 사전에 부재하는 예외적인 키워드 질문 시 정형화된 우회 안내 스크립트 작성
 const others = (problem?.keywords || []).filter(
   (x) => normalizeKeywordKey(x) !== k
 );
 const extra = others.length
   ? ` 같이 보면 좋은 키워드는 ${others.slice(0, 2).map((x) => `「${x}」`).join(', ')}야.`
   : '';
 return `「${kwOriginal}」는 「${title}」에서 요구하는 풀이랑 직결되는 표현이야.${extra} 코드나 보기에서 「${kwOriginal}」가 나오는 위치가 조건인지, 값인지, 반복 제어인지 한 줄로만 적어 보면 개념이 정리될 거야, 삐약! (오프라인 모드 삐약)`;
}

/** 사용자가 칩과 동일한 질문을 직접 입력했을 때 키워드 역추적 */
function findKeywordMatchingGuideQuestion(text, keywords) { // 질문 추천용 문장을 텍스트 창에 직접 입력했을 시 어떤 키워드를 역유추하는지 검증하는 보정기
 const trimmed = String(text).trim();
 const list = keywords || [];
 for (let i = 0; i < list.length; i++) {
   const kw = list[i];
   for (let t = 0; t < GUIDE_QUESTION_TEMPLATES.length; t++) {
     if (keywordToGuideQuestion(kw, t) === trimmed) return kw; // 템플릿 질문과 100% 매칭 시 해당 키워드 조기 강제 리턴
   }
 }
 return null;
}

function getOfflineMcqChipAnswer(question, problem) { // 객관식용 핵심 칩 삼총사를 강타했을 시 서버 다운 타임에 대신 출력되는 정적 가이드문 딕셔너리
 const title = problem?.title?.trim() || '이 문제';
 const desc = String(problem?.desc || '').trim();
 const opts = problem?.options || [];
 const optLines = opts
   .slice(0, 6)
   .map((o, i) => `${problem?.type === 'ox' ? '' : `${i + 1}. `}${String(o).slice(0, 72)}${String(o).length > 72 ? '…' : ''}`)
   .join(' / ');
 const descShort = desc.length > 140 ? `${desc.slice(0, 137)}…` : desc;
 switch (question) {
   case '이 문제 핵심이 뭐야?':
     return `핵심은 「${title}」가 무엇을 묻는지 한 문장으로 말하는 거야.${descShort ? ` 설명에 따르면 ${descShort}` : ''} 객관식이면 정답을 외우기보다, 문제 조건과 어긋나는 보기 하나씩 지워 나가면 돼, 삐약! (오프라인 모드 삐약)`;
   case '각 보기 차이가 뭐야?':
     return `보기를 나란히 놓고 다른 단어·전제·결과만 표시해 봐.${optLines ? ` 지금 보기는 ${optLines}.` : ''} O/X면 한쪽이 반드시 틀린 전제를 깔고 있는지 보면 돼. 「${title}」 설명의 정의와 안 맞는 쪽을 찾는 게 빠르게 가는 길이야, 삐약! (오프라인 모드 삐약)`;
   case '헷갈리는 개념 설명해줘':
     return `비슷해 보여도 보기마다 적용 범위나 조건이 달라.${descShort ? ` 이번 문항 설명(${descShort})을 기준 용어로 삼고` : ' 문제 설명을 기준 용어로 삼고'} 각 보기가 그 정의를 만족하는지만 체크해 봐. 막히면 보기 두 개만 골라 "둘 다 참일 수 있나?"부터 물어보면 정리돼, 삐약! (오프라인 모드 삐약)`;
   default:
     return `「${title}」는 객관식이니까 설명·보기를 천천히 대조해 봐. 더 물어보고 싶은 표현이 있으면 채팅으로 보내 줘, 삐약! (오프라인 모드 삐약)`;
 }
}

function readStoredPersona(fallback) { // 로컬 스토리지 데이터 무단 손실이나 크래시 상황에 대비해 예외 처리를 감싼 페르소나 리더기
 try {
   const raw = JSON.parse(localStorage.getItem('chickodePrefs') || '{}');
   return raw.persona ?? fallback ?? 'default';
 } catch {
   return fallback ?? 'default';
 }
}

export function Quiz({ t, params }) { // 메인 페이지 풀이 및 가상 컴파일러 뷰를 총 지휘하는 최상위 단독 컴포넌트 선언식
 const location = useLocation(); // 라우터 위치 정보 가져오기
 const navigate = useNavigate(); // 라우터 리다이렉션 트리거 가져오기
 const settings = location.state || { count: 10, ratio: 50, chapter: 1 }; // 진입 단계에서 넘어온 퀴즈 배정 조건문 적재

 const [persona, setPersona] = useState(() => readStoredPersona(params?.persona)); // 현재 타겟 캐릭터 상태 선언 (초기값은 내부 스토리지 연동)
 const tutorPersona = getTutorPersona(persona); // 선별된 캐릭터의 이미지 정보 바인딩

 useEffect(() => { // 주소창 파라미터 강제 변조 시 리액트 상태 동기화 처리 부수효과
   setPersona(readStoredPersona(params?.persona));
 }, [params?.persona]);

 useEffect(() => { // 멀티 브라우저 팝업이나 전역 세팅 변경에 초응전하기 위한 1.2초 폴링 긴급 동기화 스크립트 리스너 등록
   const sync = () => setPersona(readStoredPersona(params?.persona));
   const id = window.setInterval(sync, 1200);
   window.addEventListener('focus', sync);
   window.addEventListener('storage', sync);
   return () => { // 메모리 가비지 컬렉팅을 유발하는 누수 요인 차단 및 해제문
     clearInterval(id);
     window.removeEventListener('focus', sync);
     window.removeEventListener('storage', sync);
   };
 }, [params?.persona]);

 const [quizList, setQuizList] = useState([]); // 엄선되어 걸러진 최종 문제 꾸러미 리스트 상태 변수
 const [currentIndex, setCurrentIndex] = useState(0); // 현재 사용자가 집중하고 있는 퀴즈 문항 번호 상태
 const [correctCount, setCorrectCount] = useState(0); // 정답을 맞혀 획득한 기여 점수 카운트 상태
 const [isSubmitted, setIsSubmitted] = useState(false); // 현재 번호 문제의 채점(제출)을 완료했는지 기록하는 락 플래그
 const [selectedOption, setSelectedOption] = useState(null); // 사용자가 마우스로 체킹한 객관식 보기 내용물 상태
 const [codeValue, setCodeValue] = useState(''); // 에디터창 소스코드 내부 문자열 전체를 담는 상태
 const [termOutput, setTermOutput] = useState([ // 블랙 테마 터미널 콘솔 로그 출력 전용 리스트 배열 상태
   { type: 'system', text: '> Chickode IDE Console v1.0.0' },
   { type: 'system', text: '> Ready for compilation...' },
 ]);
 const [chatHistory, setChatHistory] = useState([]); // 과외 전용 챗창의 대화 핑퐁 누적 기록 리스트 상태
 const [chatInput, setChatInput] = useState(''); // 대화 하단 전송창에 사용자가 치고 있는 인풋 상태
 const [isChatOpen, setIsChatOpen] = useState(false); // 우측 단독 대화창 패널 개방 혹은 접힘(CCTV 모드)을 가르는 상태
 const lang = params?.lang ?? 'ko'; // 다국어 정보 세팅 파싱
 const [reactionMessage, setReactionMessage] = useState(() => { // 감시 화면 상의 말풍선 메시지 상태 (초기값은 최적의 칭찬 멘트로 초기화)
   const p = readStoredPersona(params?.persona ?? 'default');
   return pickRandom(pickCctvPool(p, 'high', params?.lang ?? 'ko'));
 });
 const [studySeconds, setStudySeconds] = useState(0); // 해당 문항 풀이에 사용한 누적 초 단위 정수형 시간 스톱워치 상태
 const [isEditorTyping, setIsEditorTyping] = useState(false); // 키보드로 코드를 맹타하는 박진감 넘치는 상태 판별 (모션 트리거)
 const [resultStatus, setResultStatus] = useState(t('quiz_result_wait')); // 터미널 상단 우측의 채점 결과 라벨 상태
 const [resultColor, setResultColor] = useState('#d4d4d4'); // 채점 결과 글자색을 다이내믹하게 칠해주는 색상코드 상태
 const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden); // 탭을 가리거나 최소화했는지 감지 플래그
 const [mouseInsideDoc, setMouseInsideDoc] = useState(true); // 마우스가 브라우저 바디 밖으로 도주했는지 체크하는 상태 플래그
 const [cctvResultTone, setCctvResultTone] = useState(null); // 정오답 직후 10초간 리액션 대사를 고정시키기 위한 가이드 톤 상태
 const chatDisplayRef = useRef(null); // 대화가 누적될 시 강제 스크롤 최하단 조정을 유발하기 위한 DOM 레퍼런스 포인터
 const lastActivityRef = useRef(Date.now()); // 마우스 움직임 등 일체의 상호작용 최종 발생 시각 Ref (렌더링 유발 없음)
 const lastCodeEditRef = useRef(null); // 마지막 코드 한 바퀴 변경 타임스탬프 Ref
 const lastMcqRef = useRef(null); // 마지막 보기 마킹 클릭 타임스탬프 Ref
 const editorTypingTimeoutRef = useRef(null); // 키보드 연타 멈춤 감지용 디바운싱 타이머 소켓 Ref
 const cctvResultClearTimeoutRef = useRef(null); // 리액션 고정 멘트의 10초 카운트다운 소멸용 타이머 소켓 Ref

 const bumpActivity = useCallback(() => { // 활동 감지 시 최종 타임스탬프를 실시간 클로저로 리프레시 처리해 주는 콜백
   lastActivityRef.current = Date.now();
 }, []);

 useEffect(() => { // [생명주기] 최초 구동 시 지정 단원 및 비율에 기량 맞춰 커스텀 퀴즈 리스트를 난수 조립해 내는 핵심 이펙트
   if (settings.singleProblemId) { // 특정 1개 문제집 세션 단독 열람 모드 처리 루틴
     const targetProblem = javaProblems.find(
       (p) => p.id === settings.singleProblemId || p.title === settings.singleProblemId
     );
     if (targetProblem) {
       setQuizList([targetProblem]);
       return;
     }
   }
   const { count, ratio, chapter } = settings; // 세팅에서 기본 출제비율 구조 분해 할당
   let pool = javaProblems.filter((p) => p.chapter === chapter || chapter === 0); // 타겟팅 단원 문제 필터링
   if (pool.length === 0) pool = javaProblems.filter((p) => p.chapter === chapter || chapter === 0);
   if (pool.length === 0) pool = javaProblems; // 전방위 예외 방어용 백업
   const objCount = Math.round(count * (ratio / 100)); // 비율 비례 객관식 계산
   const subCount = count - objCount; // 잔여분 코딩 문제 계산
   const objPool = pool.filter((p) => p.type === 'ox' || p.type === 'multiple').sort(() => 0.5 - Math.random()); // 객관식 무작위 셔플
   const subPool = pool.filter((p) => p.type === 'coding').sort(() => 0.5 - Math.random()); // 코딩 문항 무작위 셔플
   const list = [];
   if (objPool.length > 0) for (let i = 0; i < objCount; i++) list.push(objPool[i % objPool.length]); // 목록 순환 취합
   if (subPool.length > 0) for (let i = 0; i < subCount; i++) list.push(subPool[i % subPool.length]); // 목록 순환 취합
   setQuizList(list.sort(() => 0.5 - Math.random())); // 완전 뒤섞기로 시험지 배출 완료
 }, []);

 useEffect(() => { // [생명주기] 문제 인덱스가 강제 포워딩될 시 이전 찌꺼기를 세척하고 완전 무결한 새 퀴즈창 컨디션을 전개하는 효과
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
   setChatHistory((prev) => [...prev, { role: 'bot', text: tutorOpeningMessage(currentProblem, persona) }]); // 첫 소개 멘트 채팅 라인 바인딩
 }, [currentIndex, quizList]);

 useEffect(() => { // [생명주기] 메시지가 위로 밀려날 때마다 최하단 강제 스크롤 고정 효과
   if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
 }, [chatHistory, isChatOpen]);

 useEffect(() => { // [생명주기] 문제 세트 완성 즉시 1초 간격 시계 스톱워치 구동 및 초 누적 누크 효과
   if (!quizList.length) return;
   const id = setInterval(() => setStudySeconds((s) => s + 1), 1000);
   return () => clearInterval(id);
 }, [quizList.length]);

 useEffect(() => { // [생명주기] Page Visibility API와 연계한 이탈 추적 이벤트 핸들러 부착
   const onVis = () => setDocHidden(document.hidden);
   document.addEventListener('visibilitychange', onVis);
   return () => document.removeEventListener('visibilitychange', onVis);
 }, []);

 useEffect(() => { // [생명주기] 최상위 루트 돔 엘리먼트에 마우스 가출/진입 하드 트래킹 이벤트 이식
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

 const cctvBubbleSituation = useMemo(() => { // [메모이제이션] 미세 조작 값에 기반하여 렌더링 무관하게 실시간 감시 상황 코드만 가려내는 정밀 연산식
   if (!quizList.length) return 'high';
   const problem = quizList[currentIndex];
   if (!problem) return 'high';
   const now = Date.now();
   const { k: cctvK } = computeCctvChecks({ // 종합 검문소 연산식 수치 투입
     now,
     isCoding: problem.type === 'coding',
     docHidden,
     mouseInsideDoc,
     editorTyping: isEditorTyping,
     lastCodeEditAt: lastCodeEditRef.current,
     lastMcqAt: lastMcqRef.current,
     lastActivityAt: lastActivityRef.current,
   });
   return resolveCctvBubbleSituation({ // 취합된 점수로 상황 키 워프 확정
     docHidden,
     mouseInsideDoc,
     cctvK,
     resultTone: cctvResultTone,
   });
 }, [ // 연동 의존성 변수 리스트 구성
   quizList,
   currentIndex,
   docHidden,
   mouseInsideDoc,
   cctvResultTone,
   isEditorTyping,
   studySeconds,
   codeValue,
   selectedOption,
 ]);

 useEffect(() => { // [생명주기] 대화창이 꺼진 기본 감시 보드 레이아웃일 때만 활성화되는 15초 단위 말풍선 순환 타이머
   if (isChatOpen) return;
   const pool = pickCctvPool(persona, cctvBubbleSituation, lang);
   const tick = () => setReactionMessage(pickRandom(pool));
   tick();
   const id = window.setInterval(tick, 15000);
   return () => clearInterval(id);
 }, [isChatOpen, cctvBubbleSituation, persona, lang]);

 useEffect(() => { // [생명주기] 문제 스위칭 순간 발생할 타이핑 오폭 방지 클리어 이펙트
   setIsEditorTyping(false);
   if (editorTypingTimeoutRef.current) {
     clearTimeout(editorTypingTimeoutRef.current);
     editorTypingTimeoutRef.current = null;
   }
 }, [currentIndex, isChatOpen, quizList.length]);

 useEffect( // [생명주기] 컴포넌트 해체(Unmount) 직전 유령 타임아웃까지 완전 무결하게 증발 소멸시키는 마감재 이펙트
   () => () => {
     if (editorTypingTimeoutRef.current) clearTimeout(editorTypingTimeoutRef.current);
     if (cctvResultClearTimeoutRef.current) clearTimeout(cctvResultClearTimeoutRef.current);
   },
   []
 );

 const addTermLog = (msg, type = 'system') => // 터미널 줄 생성 함수 구체 기술
   setTermOutput((prev) => [...prev, { type, text: `> ${msg}` }]);

 const handleSendChat = async (message = null, chipKeyword = null) => { // 사용자의 의도 질문을 분석해 비동기 LLM API 연동 및 오프라인 대체 답변을 책임지는 메인 코어 함수
   const text = // 추천 칩 정보 강제 주입 유무 판별 수식
     message !== undefined && message !== null && String(message).trim() !== ''
       ? String(message).trim()
       : chatInput.trim();
   if (!text) return;
   setChatInput('');
   const currentProblem = quizList[currentIndex];
   const thinkingText = // 캐릭터 보이스 톤에 매칭시킨 AI 생각 중 전용 로딩 스크립팅 문구 분기
     persona === 'racer'
       ? '잠깐만! 🤔'
       : persona === 'prof'
         ? '검토 중입니다... 🤔'
         : persona === 'church'
           ? '천천히 생각해볼게요~ 🤔'
           : '생각중이야 삐약... 🤔';
   setChatHistory((prev) => [...prev, { role: 'user', text }, { role: 'bot', text: thinkingText, thinking: true }]); // 챗 히스토리에 로딩 행 추가 부착
   try {
     const res = await fetch(`${API_URL}/chat`, { // 백엔드 LLM 추론 서버 연동 시도
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         user_question: text,
         user_code: codeValue,
         problem_context: currentProblem?.title || '',
       }),
     });
     const data = await res.json();
     setChatHistory((prev) => [...prev.filter((m) => !m.thinking), { role: 'bot', text: data.answer }]); // 로딩 행을 제거하고 실제 정성 어린 답변 교체 이식
   } catch { // [서버 다운 시 오프라인 비상 구동 엔진가동 파트]
     const kws = currentProblem?.keywords || [];
     const chipKw =
       chipKeyword != null && String(chipKeyword).trim() !== '' ? String(chipKeyword).trim() : '';
     const fromChipMeta =
       chipKw && kws.some((k) => k === chipKw || normalizeKeywordKey(k) === normalizeKeywordKey(chipKw));
     const resolvedKw = // 적힌 자연어 문장 껍데기에서 타겟 자바 예약어 역파싱 기법 구동
       (fromChipMeta ? chipKw : null) ||
       findKeywordMatchingGuideQuestion(text, kws) ||
       (kws.includes(text) ? text : null);
     const keywordForLine = resolvedKw || kws[0] || '핵심 개념';

     if (persona === 'racer') { // 폭주족 선배 모드 하드코딩 백업 피드백
       setChatHistory((prev) => [
         ...prev.filter((m) => !m.thinking),
         { role: 'bot', text: '그냥 해봐! 틀려도 되니까 일단 쳐봐 삐약!' },
       ]);
       return;
     }
     if (persona === 'prof') { // 교수님 모드 하드코딩 백업 피드백
       setChatHistory((prev) => [
         ...prev.filter((m) => !m.thinking),
         { role: 'bot', text: `해당 개념의 정의부터 살펴보겠습니다. 키워드는 '${keywordForLine}'입니다.` },
       ]);
       return;
     }
     if (persona === 'church') { // 교회오빠 모드 하드코딩 백업 피드백
       setChatHistory((prev) => [
         ...prev.filter((m) => !m.thinking),
         { role: 'bot', text: `괜찮아요~ 천천히 생각해봐요! '${keywordForLine}' 기억하죠? 😊` },
       ]);
       return;
     }

     let mock; // 디폴트 병아리 선배 상태일 때 사전식 백업 답변 조각 호출 연계
     if (resolvedKw) {
       mock = getOfflineKeywordAnswer(resolvedKw, currentProblem);
     } else if (kws.length) {
       mock = `지금 문제 「${currentProblem?.title || ''}」는 키워드 ${kws
         .slice(0, 3)
         .map((k) => `「${k}」`)
         .join(', ')}와 깊게 연결돼 있어. "${text}"에 대해 생각할 때, 이 키워드들이 문제 설명·요구사항과 어떻게 맞닿는지 순서대로 적어 보면 정리가 될 거야. (오프라인 모드 삐약)`;
     } else {
       mock = `지금은 서버와 연결되지 않아 AI 답변은 어렵지만, 「${currentProblem?.title || '문제'}」 설명을 문장 단위로 다시 읽고, 모르는 용어만 골라 정리해 보자. 그다음에 같은 질문을 다시 보내줘도 돼, 삐약!`;
     }
     setChatHistory((prev) => [...prev.filter((m) => !m.thinking), { role: 'bot', text: mock }]); // 최종 가공 가이드 메시지 표출 마감
   }
 };

 const handleSubmit = () => { // 채점 연산 및 다음 문항 이동을 복합 통제하는 퀴즈 핵심 액션 핸들러
   bumpActivity();
   if (!quizList[currentIndex]) return;
   if (isSubmitted) { // 이미 정답 확인을 끝마친 상태라면 문항을 스위칭하거나 최종 보고서 성적표 화면 리다이렉팅 수행
     if (currentIndex + 1 < quizList.length) setCurrentIndex(currentIndex + 1);
     else navigate('/result', { state: { total: quizList.length, correct: correctCount } });
     return;
   }
   const currentProblem = quizList[currentIndex];
   let isCorrect = false;
   if (currentProblem.type === 'multiple' || currentProblem.type === 'ox') { // [객관식 채점 갈래 분기]
     if (!selectedOption) {
       alert('답을 선택해주세요!');
       return;
     }
     isCorrect = selectedOption === currentProblem.answer;
   } else { // [코딩형 문항 키워드 매칭 채점 분기]
     isCorrect = currentProblem.keywords.every((kw) => codeValue.includes(kw));
   }
   addAttempt({ // 영구 오답노트 저장소 DB 적재용 정보 패키징 구성 발송
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
   setIsSubmitted(true); // 현재 화면 상태를 락(Lock) 처리
   addTermLog('============================', 'system');
   addTermLog('Evaluating code...', 'system');
   setTimeout(() => { // 리얼리티 개발 감성을 위해 0.5초의 인위적 딜레이 부여 후 컴파일 완료 로그 마감 작업
     if (cctvResultClearTimeoutRef.current) {
       clearTimeout(cctvResultClearTimeoutRef.current);
       cctvResultClearTimeoutRef.current = null;
     }
     if (isCorrect) { // 정답 판별 완결 시 가상 콘솔 메시지 칠하기
       setCorrectCount((c) => c + 1);
       addTermLog('Compile Success: 0 errors, 0 warnings', 'success');
       addTermLog('Result: O 정답입니다!', 'success');
       setResultStatus('결과: 🎉 정답이야!');
       setResultColor('#55ff55');
       setChatHistory((prev) => [...prev, { role: 'bot', text: '정답! 아주 잘했어 삐약! 👏' }]);
       setCctvResultTone('correct');
     } else { // 오답 판별 완결 시 가상 콘솔 에러 메시지 칠하기
       addTermLog('Result: X 오답입니다!', 'error');
       setResultStatus('결과: ❌ 오답입니다!');
       setResultColor('#ff5555');
       setChatHistory((prev) => [
         ...prev,
         { role: 'bot', text: '아쉽지만 오답이야... 다음 번엔 맞출 수 있을 거야! 🐥' },
       ]);
       setCctvResultTone('wrong');
     }
     cctvResultClearTimeoutRef.current = window.setTimeout(() => { // 10초 경과 후 감시 카메라 톤 원상 롤백 타이머 작동
       setCctvResultTone(null);
       cctvResultClearTimeoutRef.current = null;
     }, 10000);
   }, 500);
 };

 if (!quizList.length) return <div style={{ color: 'white', padding: '50px' }}>Loading...</div>; // 퀴즈 미준비 시 조기 렌더링 방어막
 const currentProblem = quizList[currentIndex];
 const savedUser = JSON.parse(localStorage.getItem('chickode_user') || 'null'); // 스토리지 유저명 추출 파싱
 const rawNickname = savedUser ? savedUser.nickname : getProfile().name;
 const nickname = rawNickname && rawNickname.includes('상우') ? '게스트' : rawNickname; // 특정 이름 특이사항 감지 보정식 적용

 const nowCctv = Date.now();
 const isCodingProblem = currentProblem.type === 'coding';
 const { // 현재 프레임 렌더링에 사용할 체크 항목 세트 디코딩 연계
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
 const isCctvWarnState = cctvK <= 1; // 딴짓 등급 산정 컴포넌트 클래스 명명식 조립 라인
 const reactionChickClass = [
   'quiz-reaction-chick-wrap',
   isCctvWarnState
     ? 'quiz-reaction-chick-wrap--sleepy'
     : isEditorTyping && currentProblem.type === 'coding'
       ? 'quiz-reaction-chick-wrap--typing'
       : 'quiz-reaction-chick-wrap--float',
 ].join(' ');

 const centerColumn = ( // [하위 JSX 트리 분리] 중앙 화면 배치 레이아웃 파트 단독 추출
   <div
     className="center"
     onPointerDownCapture={() => {
       if (!isChatOpen) bumpActivity(); // 유저 상호작용 클릭 인지 즉시 타임 기록
     }}
   >
     {currentProblem.type === 'coding' ? ( // 분기 1단계: 코딩형 문제면 CodeMirror 컴포넌트 노출
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
             if (!isChatOpen && currentProblem.type === 'coding') { // 타이핑 연타 모션 작동용 450ms 타임 셋업 가동 파트
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
     ) : ( // 분기 2단계: 객관식 문항일 경우 보기 버튼형 컨테이너 나열 노출
       <div className="mcq-container">
         <div className="mcq-options">
           {currentProblem.options.map((opt, i) => (
             <button
               key={i}
               className={`mcq-option-btn ${selectedOption === opt ? 'selected' : ''}`} // 셀렉트 마킹에 따른 액티브 CSS 부여 단락
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
     <div className="terminal-container"> {/* 가상 터미널 보드 영역 렌더링 파트 */}
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

 return ( // 리액트 컴포넌트 메인 레이아웃 외곽 프레임 바인딩 반환 시작점
   <div className="coding-view" style={{ display: 'flex' }}>
     <nav className="top-nav"> {/* 네비게이션 헤더라인 마크업 */}
       <button id="backToMain" title="돌아가기" onClick={() => navigate(-1)}>
         ❮
       </button>
       <div className="logo">CHICKODE</div>
       <div className="top-right-group">
         <span className="chapter-badge">Chapter {settings.chapter}</span>
         <div className="user-tag">👤 {nickname} 님</div>
       </div>
     </nav>
     <main className={`content${isChatOpen ? '' : ' content--quiz-chat-collapsed'}`}> {/* 챗 창 오픈 유무에 따른 그리드 압축 확장 가변 처리 */}
       <div className="left"> {/* 퀴즈 지문 내용 기술 구역 */}
         <div className="problem-card">
           <h3>
             [{currentIndex + 1}/{quizList.length}] {currentProblem.title}
           </h3>
           <p>{currentProblem.desc}</p>
         </div>
         <div
           style={{
             fontSize: 12,
             color: '#5c3d2e',
             marginBottom: 6,
           }}
         >
           {getPersonaModeDisplay(persona)}
         </div>
         <div className="quiz-progress-panel"> {/* 시험지 프로그레스 게이지바 비주얼 영역 */}
           <div className="quiz-progress-label">
             {currentIndex + 1} / {quizList.length} 문제
           </div>
           <div className="progress-bar-container">
             <div
               className="progress-bar"
               style={{ width: `${Math.round(((currentIndex + 1) / quizList.length) * 100)}%` }}
             />
           </div>
         </div>
       </div>

       {isChatOpen ? ( // 과외 챗방 온오프 레이아웃 상호 3항 분기 전개점
         <>
           {centerColumn} {/* 에디터가 담긴 중앙 칼럼 안착 */}
           <div className="right"> {/* 과외창 전용 컨테이너 바디 */}
             <div className="chat-container">
               <div className="chat-panel-header">
                 <span className="chat-panel-title">{tutorPersona.label}</span>
                 <button
                   type="button"
                   className="chat-panel-close"
                   aria-label="채팅 닫기"
                   onClick={() => setIsChatOpen(false)}
                 >
                   ×
                 </button>
               </div>
               <div className="chat-display" ref={chatDisplayRef}> {/* 핑퐁 메시지 루프 파트 */}
                 {chatHistory.map((m, i) => (
                   <div key={i} className={`msg-row ${m.role === 'bot' ? 'bot-msg' : 'user-msg'}`}>
                     {m.role === 'bot' && (
                       <div className="avatar">
                         <img src={tutorPersona.image} alt="" />
                       </div>
                     )}
                     <div
                       style={{
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: m.role === 'bot' ? 'flex-start' : 'flex-end',
                         maxWidth: '75%',
                       }}
                     >
                       <div className="msg-meta">{m.role === 'bot' ? tutorPersona.label : '나'}</div>
                       <div className="bubble">{m.text}</div>
                     </div>
                   </div>
                 ))}
               </div>
               <div className="chat-guide-chips"> {/* 연관 단어 자동 질문문 칩 노출 루프 */}
                 {(currentProblem.keywords || []).slice(0, 3).map((kw, i) => {
                   const q = keywordToGuideQuestion(kw, i);
                   return (
                     <button
                       key={`${kw}-${i}`}
                       type="button"
                       className="chat-guide-chip"
                       onClick={() => handleSendChat(q, kw)}
                     >
                       {q}
                     </button>
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
                 <button type="button" onClick={() => handleSendChat()} style={{ height: 44 }}>
                   {t('btn_send')}
                 </button>
               </div>
             </div>
           </div>
         </>
       ) : ( // 챗 패널 비활성화 시 노출되는 블랙박스 스타일 감시용 CHICK CAM HUD 인터페이스
         <div className="quiz-center-reaction-split">
           {centerColumn}
           <aside className="quiz-cctv-panel" aria-label="CHICK CAM">
             <style>{`
               @keyframes chickCamRecBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.25; } }
             `}</style>
             <div className="quiz-cctv-vignette" aria-hidden />
             <div className="quiz-cctv-desk-shade" aria-hidden />
             <span className="quiz-cctv-corner quiz-cctv-corner-tl" aria-hidden />
             <span className="quiz-cctv-corner quiz-cctv-corner-tr" aria-hidden />
             <span className="quiz-cctv-corner quiz-cctv-corner-bl" aria-hidden />
             <span className="quiz-cctv-corner quiz-cctv-corner-br" aria-hidden />

             <header className="quiz-cctv-hud">
               <span className="quiz-cctv-cam-id">
                 <span className="quiz-cctv-live-dot" aria-hidden />
                 CHICK CAM 01
               </span>
               <span className="quiz-cctv-rec" style={{ animation: 'chickCamRecBlink 1s infinite' }}>
                 REC
               </span>
             </header>

             <div className="quiz-cctv-body">
               <div className="quiz-cctv-stack">
                 <div className="quiz-cctv-speak-col"> {/* 조는 모션 혹은 타이핑 연타 모션이 일어나는 일러스트 패널 */}
                   <div className={`quiz-cctv-bubble${isCctvWarnState ? ' quiz-cctv-bubble--warn' : ''}`}>
                     {reactionMessage}
                   </div>
                   <div className={`quiz-cctv-chick-hero ${reactionChickClass}`}>
                     <img className="quiz-reaction-chick" src="/images/chick.png" alt="" />
                   </div>
                 </div>
                 <div className="quiz-cctv-checklist"> {/* 행동 4개 조작 로그 전광판 판넬 구역 */}
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
                   <button
                     type="button"
                     className="quiz-cctv-open-chat"
                     onClick={() => {
                       bumpActivity();
                       setIsChatOpen(true);
                     }}
                   >
                     {t('cctv_open_chat')}
                   </button>
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