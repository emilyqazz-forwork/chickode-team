// Home.jsx - 메인 홈 화면 로비이자 단계별 학습 셋업 모달을 순차 제어하는 총괄 관제 파일
// 1. 언어별 챕터 설정
// 2. TUTORIAL_STEPS
// 3. 로컬스토리지 유틸 함수 (튜토리얼 봤는지 확인/저장)
// 4. HomeCoachmark 컴포넌트 (튜토리얼 말풍선)
// 5. Home 메인 컴포넌트 (홈 화면 본체)
// 6. LangModal (언어 선택 모달) - selectedLang
// 7. LevelModal (난이도 선택 모달) - selectedLevel
// 8. ChapterModal (단원 선택 모달) - selectedChapter
// 9. QuizSettingModal (문항 설정 모달) - settings

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getAttempts } from '../state/app-state';
import { settingsButtonRef } from '../state/tutorial-refs';

// --- [1. 정적 데이터 정의] ---
// ========================================================
// 1. JAVA 커리큘럼 상수 (JAVA_CHAPTERS)
// ========================================================
const JAVA_CHAPTERS = {
  basic: [
    {
      id: "java_basic_c1",
      title: "1단원: 자바 시작하기",
      description: "자바의 구동 원리와 개발 환경을 이해하고 기본 용어들을 배웁니다.",
      icon: "☕",
      units: ["java_basic_c1_u1"]
    },
    {
      id: "java_basic_c2",
      title: "2단원: 변수와 자료형",
      description: "기본형 자료형부터 캐스팅, 가변 자료형(var)까지 데이터 구조를 마스터합니다.",
      icon: "💽",
      units: ["java_basic_c2_u1", "java_basic_c2_u2", "java_basic_c2_u3", "java_basic_c2_u4", "java_basic_c2_u5"]
    },
    {
      id: "java_basic_c3",
      title: "3단원: 연산자와 제어문",
      description: "프로그램 로직 연산과 조건문, 반복문을 활용한 제어 구조를 완성합니다.",
      icon: "🔀",
      units: ["java_basic_c3_u1", "java_basic_c3_u2", "java_basic_c3_u3", "java_basic_c3_u4"]
    },
    {
      id: "java_basic_c4",
      title: "4단원: 배열과 문자열",
      description: "다차원 배열의 제어법과 가변 문자열(StringBuilder) 메커니즘을 배웁니다.",
      icon: "📚",
      units: ["java_basic_c4_u1", "java_basic_c4_u2", "java_basic_c4_u3", "java_basic_c4_u4"]
    }
  ],
  mid: [
    {
      id: "java_mid_c1",
      title: "1단원: 클래스와 객체",
      description: "객체지향 설계의 시작인 생성자, this 키워드 및 은닉화를 위한 은닉 제어를 다룹니다.",
      icon: "🏗️",
      units: ["java_mid_c1_u1", "java_mid_c1_u2", "java_mid_c1_u3", "java_mid_c1_u4"]
    },
    {
      id: "java_mid_c2",
      title: "2단원: 객체지향 핵심 4대 원칙",
      description: "캡슐화, 상속, 다형성, 인터페이스 등 진정한 OOP 구조 설계법을 습득합니다.",
      icon: "🎭",
      units: ["java_mid_c2_u1", "java_mid_c2_u2", "java_mid_c2_u3", "java_mid_c2_u4"]
    },
    {
      id: "java_mid_c3",
      title: "3단원: 컬렉션 프레임워크",
      description: "실무 알고리즘 구현의 필수 자료구조인 List, Map, Set의 특징과 활용법을 마스터합니다.",
      icon: "🗃️",
      units: ["java_mid_c3_u1", "java_mid_c3_u2", "java_mid_c3_u3", "java_mid_c3_u4"]
    },
    {
      id: "java_mid_c4",
      title: "4단원: 예외 처리",
      description: "프로그램의 안정성을 보장하기 위한 try-catch 흐름과 예외 던지기 아키텍처를 구축합니다.",
      icon: "🛡️",
      units: ["java_mid_c4_u1", "java_mid_c4_u2", "java_mid_c4_u3", "java_mid_c4_u4"]
    }
  ],
  adv: [
    {
      id: "java_adv_c1",
      title: "1단원: 제네릭과 모던 자바",
      description: "타입 안정성을 극대화하는 제네릭과 모던 자바의 꽃인 람다식, 스트림 API를 정복합니다.",
      icon: "⚡",
      units: ["java_adv_c1_u1", "java_adv_c1_u2", "java_adv_c1_u3", "java_adv_c1_u4"]
      // u1: 제네릭스(Generics), u2: 함수형 인터페이스와 람다식, u3: 스트림 API, u4: Optional 클래스
    },
    {
      id: "java_adv_c2",
      title: "2단원: 멀티 스레드와 JVM 구조",
      description: "병렬 처리를 위한 동시성 프로그래밍 스레드 동기화 및 JVM 메모리 영역을 제어합니다.",
      icon: "⚙️",
      units: ["java_adv_c2_u1", "java_adv_c2_u2", "java_adv_c2_u3", "java_adv_c2_u4"]
      // u1: 멀티 스레드와 동시성, u2: 스레드 동기화, u3: JVM 메모리 구조, u4: 가비지 컬렉션(GC)
    },
    {
      id: "java_adv_c3",
      title: "3단원: 입출력 및 네트워크 소켓",
      description: "시스템 스트림 기반의 파일 입출력(I/O) 데이터 처리와 소켓 기반 네트워킹을 학습합니다.",
      icon: "🌐",
      units: ["java_adv_c3_u1", "java_adv_c3_u2"]
      // u1: 입출력 스트림(I/O), u2: 네트워크 소켓 프로그래밍
    }
  ]
};

// ========================================================
// 2. PYTHON 커리큘럼 상수 (PYTHON_CHAPTERS)
// ========================================================
const PYTHON_CHAPTERS = {
  basic: [
    {
      id: "py_basic_c1",
      title: "1단원: 파이썬 시작하기",
      description: "파이썬의 실행 구조와 가독성 높은 환경, 기본 용어들을 정리합니다.",
      icon: "🐍",
      units: ["py_basic_c1_u1"]
    },
    {
      id: "py_basic_c2",
      title: "2단원: 변수와 기본 자료형",
      description: "파이썬의 동적 타이핑 시스템과 f-string 문자열 포맷팅, None 객체를 탐구합니다.",
      icon: "📝",
      units: ["py_basic_c2_u1", "py_basic_c2_u2", "py_basic_c2_u3", "py_basic_c2_u4", "py_basic_c2_u5"]
    },
    {
      id: "py_basic_c3",
      title: "3단원: 컬렉션 자료형",
      description: "다양한 데이터를 묶어 처리하는 가변/불변 시퀀스 컨테이너 및 슬라이싱을 마스터합니다.",
      icon: "📦",
      units: ["py_basic_c3_u1", "py_basic_c3_u2", "py_basic_c3_u3", "py_basic_c3_u4"]
    },
    {
      id: "py_basic_c4",
      title: "4단원: 조건문과 반복문",
      description: "분기 제어 구조 및 컴프리헨션(Comprehension), 이터레이터 내장 함수를 습득합니다.",
      icon: "🔄",
      units: ["py_basic_c4_u1", "py_basic_c4_u2", "py_basic_c4_u3", "py_basic_c4_u4"]
    }
  ],
  mid: [
    {
      id: "py_mid_c1",
      title: "1단원: 함수",
      description: "가변 인자 매커니즘(*args, **kwargs)과 함수형 언어의 기본인 람다, 고차 함수를 배웁니다.",
      icon: "🧩",
      units: ["py_mid_c1_u1", "py_mid_c1_u2", "py_mid_c1_u3", "py_mid_c1_u4"]
    },
    {
      id: "py_mid_c2",
      title: "2단원: 모듈과 패키지",
      description: "외부 라이브러리 가동을 위한 pip 사용법 및 가상환경(venv) 배포 환경을 격리 구축합니다.",
      icon: "📦",
      units: ["py_mid_c2_u1", "py_mid_c2_u2", "py_mid_c2_u3", "py_mid_c2_u4"]
    },
    {
      id: "py_mid_c3",
      title: "3단원: 파일 및 예외 처리",
      description: "with 블록 기반의 안전한 자원 반환 파일 제어와 예외 핸들링을 적용합니다.",
      icon: "💾",
      units: ["py_mid_c3_u1", "py_mid_c3_u2", "py_mid_c3_u3", "py_mid_c3_u4"]
    }
  ],
  adv: [
    {
      id: "py_adv_c1",
      title: "1단원: 객체 지향 프로그래밍",
      description: "던더(Dunder) 매직 메서드 활용법과 파이썬 특유의 캡슐화 상속 아키텍처를 이해합니다.",
      icon: "🏗️",
      units: ["py_adv_c1_u1", "py_adv_c1_u2", "py_adv_c1_u3", "py_adv_c1_u4"]
    },
    {
      id: "py_adv_c2",
      title: "2단원: 고급 파이썬 기법",
      description: "코드 가독성과 효율을 비약적으로 높이는 데코레이터, 제너레이터(yield)를 제어합니다.",
      icon: "⚡",
      units: ["py_adv_c2_u1", "py_adv_c2_u2", "py_adv_c2_u3", "py_adv_c2_u4"]
    },
    {
      id: "py_adv_c3",
      title: "3단원: 실전 프로젝트",
      description: "HTTP API 네트워킹 통신 및 크롤러, 판다스(Pandas) 데이터 정제 실무를 맛봅니다.",
      icon: "🌐",
      units: ["py_adv_c3_u1", "py_adv_c3_u2", "py_adv_c3_u3", "py_adv_c3_u4"]
    }
  ]
};

// ========================================================
// 3. C언어 커리큘럼 상수 (C_CHAPTERS) - 요청 명세 100% 동기화
// ========================================================
const C_CHAPTERS = {
  basic: [
    {
      id: "c_basic_c1",
      title: "1단원: C언어 시작하기",
      description: "컴퓨터 작동의 메커니즘과 C언어 컴파일 기초 용어를 학습합니다.",
      icon: "💻",
      units: ["c_basic_c1_u1"]
    },
    {
      id: "c_basic_c2",
      title: "2단원: 변수와 자료형",
      description: "메모리 할당 크기별 기본 자료형과 표준 입출력(printf/scanf), 캐스팅을 마스터합니다.",
      icon: "💽",
      units: ["c_basic_c2_u1", "c_basic_c2_u2", "c_basic_c2_u3", "c_basic_c2_u4"]
    },
    {
      id: "c_basic_c3",
      title: "3단원: 연산자와 표현식",
      description: "기본 수식 연산부터 시스템 제어용 비트 연산자, 가독성 높은 삼항 표현식을 다룹니다.",
      icon: "🧮",
      units: ["c_basic_c3_u1", "c_basic_c3_u2", "c_basic_c3_u3", "c_basic_c3_u4"]
    },
    {
      id: "c_basic_c4",
      title: "4단원: 조건문과 반복문",
      description: "프로그램의 실행 트리를 제어하는 조건 분기문 및 다중 루프 제어를 정복합니다.",
      icon: "🔀",
      units: ["c_basic_c4_u1", "c_basic_c4_u2", "c_basic_c4_u3", "c_basic_c4_u4"]
    }
  ],
  mid: [
    {
      id: "c_mid_c1",
      title: "1단원: 함수",
      description: "프로그램 모듈화의 핵심인 함수 선언, 스택 메모리 순환 재귀함수 및 함수 포인터를 배웁니다.",
      icon: "🧩",
      units: ["c_mid_c1_u1", "c_mid_c1_u2", "c_mid_c1_u3", "c_mid_c1_u4"]
    },
    {
      id: "c_mid_c2",
      title: "2단원: 배열과 문자열",
      description: "메모리 연속 집합체인 배열 연산 및 char 배열 기반의 문자열 조작 라이브러리를 이해합니다.",
      icon: "📊",
      units: ["c_mid_c2_u1", "c_mid_c2_u2", "c_mid_c2_u3", "c_mid_c2_u4"]
    },
    {
      id: "c_mid_c3",
      title: "3단원: 포인터",
      description: "C언어의 핵심인 물리 주소 참조 연산자 및 다차원 포인터의 구조를 파헤칩니다.",
      icon: "📍",
      units: ["c_mid_c3_u1", "c_mid_c3_u2", "c_mid_c3_u3", "c_mid_c3_u4"]
    }
  ],
  adv: [
    {
      id: "c_adv_c1",
      title: "1단원: 구조체와 공용체",
      description: "커스텀 복합 데이터 타입을 선언하는 구조체 아키텍처와 메모리 공유형 공용체를 빌드합니다.",
      icon: "🏗️",
      units: ["c_adv_c1_u1", "c_adv_c1_u2", "c_adv_c1_u3", "c_adv_c1_u4"]
    },
    {
      id: "c_adv_c2",
      title: "2단원: 파일 입출력",
      description: "하드디스크 스트림에 데이터를 안전하게 파일로 쓰고 읽어내는 스트림 처리를 정복합니다.",
      icon: "💾",
      units: ["c_adv_c2_u1", "c_adv_c2_u2", "c_adv_c2_u3", "c_adv_c2_u4"]
    },
    {
      id: "c_adv_c3",
      title: "3단원: 동적 메모리 할당",
      description: "힙(Heap) 런타임 공간을 직접 제어하고 해제하며, 선형 자료구조(링크드 리스트)의 뼈대를 만듭니다.",
      icon: "🧠",
      units: ["c_adv_c3_u1", "c_adv_c3_u2", "c_adv_c3_u3", "c_adv_c3_u4"]
    }
  ]
};


const HOME_BACKGROUNDS = [
  '/images/bg1.png',
  '/images/bg2.png',
  '/images/bg3.png',
  '/images/bg4.png',
  '/images/bg5.png',
];

// TUTORIAL_STEPS: 홈 화면 진입 시 하이라이트할 타겟 DOM의 CSS 선택자(Selector) 및 설명 텍스트 번역 키 정의
const TUTORIAL_STEPS = [
  { selector: null, titleKey: 'tutorial_welcome_title', bodyKey: 'tutorial_welcome_body' }, // 첫 웰컴 인사 (스포트라이트 없음)
  { selector: '.home-page .button-wrapper', titleKey: 'tutorial_menu_title', bodyKey: 'tutorial_menu_body' }, // 메뉴 버튼 목록 강조
  { selector: '#globalSettingsBtn', titleKey: 'tutorial_settings_title', bodyKey: 'tutorial_settings_body' }, // 환경설정 아이콘 강조
  { selector: '.home-login-action', titleKey: 'tutorial_login_title', bodyKey: 'tutorial_login_body' }, // 프로필/로그인 바 강조
  { selector: '#homeBgmBtn', titleKey: 'tutorial_bgm_title', bodyKey: 'tutorial_bgm_body' }, // BGM LP판 강조
];

// --- [2. 로컬 스토리지 튜토리얼 유틸리티 함수] ---
// 사용자가 가이드를 시청 완료했는지 로컬 브라우저 저장소 조사
function hasSeenTutorial() {
  try {
    const seen = window.localStorage.getItem('chickode_tutorial_seen');
    return seen === 'true' || seen === '1';
  } catch {
    return false;
  }
}

// 사용자가 가이드를 완료했거나 스킵했을 때 로컬 브라우저에 시청 완료 도장 찍기
function markTutorialSeen() {
  try {
    window.localStorage.setItem('chickode_tutorial_seen', 'true');
  } catch {
    // noop
  }
}

// --- [3. 하이라이트 가이드 레이어: HomeCoachmark 컴포넌트] ---
function HomeCoachmark({ t, step, onNext, onSkip }) {
  const [rect, setRect] = useState(null); // 실시간 타겟 DOM의 위치 좌표(동적 크기 계산용)
  const current = TUTORIAL_STEPS[step];  // 현재 단계에 매핑되는 가이드 옵션 객체
  const isLast = step === TUTORIAL_STEPS.length - 1; // 마지막 단계 단계 확인 플래그
  const isSettingsStep = current?.selector === '#globalSettingsBtn'; // 현재 타겟이 헤더 환경설정인지 체크

  // 타겟 엘리먼트의 브라우저 상의 절대 위치(getBoundingClientRect)를 실시간 추적하여 스포트라이트 구멍을 뚫어주는 효과
  useEffect(() => {
    if (step == null || !current?.selector) {
      setRect(null);
      return undefined;
    }
    const update = () => {
      // 헤더 환경설정 버튼의 경우 GlobalNav 쪽에 렌더링되므로 참조 Ref를 따로 가져와 계산하는 가드식
      if (isSettingsStep && settingsButtonRef.current) {
        setRect(settingsButtonRef.current.getBoundingClientRect());
        return;
      }
      const el = document.querySelector(current.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    // 창 크기가 조절되거나 마우스 스크롤이 움직여도 구멍의 위치가 엘리먼트를 실시간으로 쫓아가도록 프레임 단위 추적
    const raf = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step, current?.selector, isSettingsStep]);

  if (step == null || !current) return null;

  const pad = 10; // 구멍 크기에 약간의 여백(Padding) 추가 계산
  const spotlightStyle = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // 툴팁 말풍선 기본 중앙 정렬 배치 초깃값 설정
  let tooltipTop = '50%';
  let tooltipLeft = '50%';
  let tooltipTransform = 'translate(-50%, -50%)';
  const tooltipMaxWidth = 320;

  // 타겟 DOM이 잡혔을 때, 툴팁이 타겟 바로 아래 혹은 위 공간 중 넉넉한 위치를 찾아 알아서 달라붙는 연산 기믹
  if (rect && isSettingsStep) {
    const gap = 12;
    const centerX = rect.left + rect.width / 2;
    tooltipTop = `${rect.bottom + gap}px`;
    tooltipLeft = `${Math.min(
      Math.max(centerX, tooltipMaxWidth / 2 + 16),
      window.innerWidth - tooltipMaxWidth / 2 - 16,
    )}px`;
    tooltipTransform = 'translateX(-50%)';
  } else if (rect) {
    const below = rect.bottom + 16;
    const above = rect.top - 16;
    const placeBelow = below + 180 < window.innerHeight; // 화면 하단 공간이 남는지 검사
    tooltipLeft = `${Math.min(
      Math.max(rect.left + rect.width / 2, tooltipMaxWidth / 2 + 16),
      window.innerWidth - tooltipMaxWidth / 2 - 16,
    )}px`;
    tooltipTransform = 'translateX(-50%)';
    tooltipTop = placeBelow ? `${below}px` : `${above}px`; // 공간이 있으면 밑에, 모자라면 위에 배치
    if (!placeBelow) tooltipTransform = 'translate(-50%, -100%)';
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="home-coachmark-root" role="dialog" aria-modal="true">
      {/* 툴팁 및 가이드 전용 CSS 스타일 인젝션 */}
      <style>{`
        .home-coachmark-root { position: fixed; inset: 0; z-index: 999999; }
        .home-coachmark-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 1000000; }
        .home-coachmark-cutout-piece { position: fixed; background: rgba(0, 0, 0, 0.55); z-index: 1000000; }
        .home-coachmark-spotlight { position: fixed; border-radius: 14px; box-shadow: 0 0 0 3px rgba(255, 213, 79, 0.85), 0 0 24px 6px rgba(255, 213, 79, 0.55); z-index: 1000001; pointer-events: none; transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease; }
        .home-coachmark-tooltip { position: fixed; z-index: 1000002; width: min(320px, calc(100vw - 32px)); background: #fdf6e3; border: 3px solid #5d4037; border-radius: 16px; padding: 18px 18px 14px; box-shadow: 6px 6px 0 #3e2723; font-family: 'Jua', sans-serif; color: #3e2723; }
        .home-coachmark-tooltip h3 { margin: 0 0 8px; font-size: 1.1rem; }
        .home-coachmark-tooltip p { margin: 0 0 14px; font-size: 0.95rem; line-height: 1.45; }
        .home-coachmark-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .home-coachmark-actions button { border: 2px solid #5d4037; border-radius: 10px; padding: 8px 14px; font-family: 'Jua', sans-serif; font-weight: 700; cursor: pointer; }
        .home-coachmark-skip { background: #e8dcc8; color: #5d4037; }
        .home-coachmark-next { background: #5d4037; color: #fff8d8; }
      `}</style>
      
      {/* 타겟 정보가 아예 없는 첫 단계는 온 화면을 막는 일반 암막 처리, 타겟이 잡히면 구멍이 뚫린 스포트라이트 활성화 */}
      {!spotlightStyle && <div className="home-coachmark-backdrop" />}
      {spotlightStyle && (
        <>
          <div
            className="home-coachmark-cutout-piece"
            style={{ top: 0, left: 0, width: '100vw', height: `${Math.max(0, spotlightStyle.top)}px` }}
          />
          <div
            className="home-coachmark-cutout-piece"
            style={{
              top: `${spotlightStyle.top + spotlightStyle.height}px`,
              left: 0,
              width: '100vw',
              height: `calc(100vh - ${spotlightStyle.top + spotlightStyle.height}px)`,
            }}
          />
          <div
            className="home-coachmark-cutout-piece"
            style={{
              top: `${spotlightStyle.top}px`,
              left: 0,
              width: `${Math.max(0, spotlightStyle.left)}px`,
              height: `${spotlightStyle.height}px`,
            }}
          />
          <div
            className="home-coachmark-cutout-piece"
            style={{
              top: `${spotlightStyle.top}px`,
              left: `${spotlightStyle.left + spotlightStyle.width}px`,
              width: `calc(100vw - ${spotlightStyle.left + spotlightStyle.width}px)`,
              height: `${spotlightStyle.height}px`,
            }}
          />
          <div className="home-coachmark-spotlight" style={spotlightStyle} />
        </>
      )}
      
      {/* 캡션 안내 텍스트 정보가 출력되는 귀여운 말풍선 카드 */}
      <div
        className="home-coachmark-tooltip"
        style={{ top: tooltipTop, left: tooltipLeft, transform: tooltipTransform }}
      >
        <h3>{t(current.titleKey)}</h3>
        <p>{t(current.bodyKey)}</p>
        <div className="home-coachmark-actions">
          {/* 스킵 버튼: 누르면 가이드 전체 종료 */}
          <button type="button" className="home-coachmark-skip" onClick={onSkip}>
            {t('tutorial_skip')}
          </button>
          {/* 다음 버튼: 마지막 단계라면 '완료' 문구를 띄우고 종료, 아니면 다음 인덱스로 변경 */}
          <button type="button" className="home-coachmark-next" onClick={onNext}>
            {isLast ? t('tutorial_done') : t('tutorial_next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// --- [4. 홈화면 메인 독립 컴포넌트 실행 파트] ---
export function Home({ t, lang }) {
  // --- [상태 전용 스위치 정의] ---
  const [step, setStep] = useState(null);                       // 모달 진행 단계 상태 플래그 (null | 'lang' | 'level' | 'chapter' | 'setting')
  const [selectedLang, setSelectedLang] = useState(null);       // 사용자가 선택 완료한 언어 상태 (java)
  const [selectedLevel, setSelectedLevel] = useState(null);      // 사용자가 선택 완료한 난이도 상태 (basic, mid, adv)
  const [selectedChapter, setSelectedChapter] = useState(null);  // 사용자가 선택 완료한 최종 챕터 식별 번호 (1~4)
  const [progress, setProgress] = useState({});                 // 데이터베이스에서 집계해온 챕터별 실시간 진도율 퍼센트 맵 객체
  const [displayText, setDisplayText] = useState('');           // 메인 타이틀 자막에 한 글자씩 써내려가는 가변 텍스트 상태
  const [tutorialStep, setTutorialStep] = useState(null);       // 현재 진행 중인 코치마크 인덱스 상태 (null이면 미작동)
  const [activeBg, setActiveBg] = useState(0);                   // 현재 표시 중인 배경 인덱스 (0~4)
  const [prevBg, setPrevBg] = useState(null);                  // 크로스페이드 직전 배경 인덱스
  const navigate = useNavigate();                               // 주소 경로 이동 처리용 React-Router 네비게이터 훅

  // 가이드라인 시청 최종 스케줄 마감 처리 콜백
  const finishTutorial = useCallback(() => {
    setTutorialStep(null);
    markTutorialSeen(); // 로컬 스토리지 시청 완료 마킹
  }, []);

  // 가이드라인 프로세스 초기화 스타트 콜백
  const startTutorial = useCallback(() => {
    setStep(null);        // 열려있는 일반 모달창 강제 종료
    setTutorialStep(0);   // 가이드 0번 인덱스(웰컴 메시지) 로드
  }, []);

  // [이벤트 연동 리스너] GlobalNav나 GlobalSettingsModal에서 '가이드 다시보기' 원격 신호가 오면 수신 감지 후 스타트
  useEffect(() => {
    const onStart = () => startTutorial();
    window.addEventListener('chickode:start_tutorial_on_home', onStart);
    return () => window.removeEventListener('chickode:start_tutorial_on_home', onStart);
  }, [startTutorial]);

  // [첫 진입 가드] 시청 완료 이력이 없는 완전 첫 가입/첫 방문 유저라면, 0.6초 뒤에 가이드 자동 실행
  useEffect(() => {
    if (hasSeenTutorial()) return undefined;
    const timer = window.setTimeout(() => startTutorial(), 600);
    return () => window.clearTimeout(timer);
  }, [startTutorial]);

  // 애니메이션 배경화면 스위칭 장치: 10초마다 배경1→2→3→4→5→1 순환
  useEffect(() => {
    const bgTimer = window.setInterval(() => {
      setActiveBg((current) => {
        setPrevBg(current);
        return (current + 1) % HOME_BACKGROUNDS.length;
      });
    }, 10000);
    return () => window.clearInterval(bgTimer);
  }, []);

  // 크로스페이드 종료 후 이전 레이어 숨김 (opacity 0 레이어가 위에 남아 가리는 현상 방지)
  useEffect(() => {
    if (prevBg == null) return undefined;
    const fadeDone = window.setTimeout(() => setPrevBg(null), 2100);
    return () => window.clearTimeout(fadeDone);
  }, [activeBg, prevBg]);

  // --- [5. 실시간 진도율 및 통계 정산 연산 파트] ---
  useEffect(() => {
    const attempts = getAttempts(); // 로컬이나 전역에 적립된 전체 풀이 시도 이력 로드
    const totalByChapter = { 1: 13, 2: 13, 3: 13, 4: 13 }; // 시스템 명세 상 각 챕터별 고정 배치 총 문항 개수
    const correctByChapter = {};
    const seenProblems = {}; // 동일 문항 중복 정답 처리를 차단하기 위한 고유 식별 분별용 보관소

    for (const a of attempts) {
      if (!a.isCorrect) continue; // 맞춘 정답 풀이만 골라내는 조건부 패스
      const ch = a.chapter;
      const pid = a.problemId || a.title;
      // 한 번 카운트한 유니크 문제 코드는 재연산에서 제외시켜 중복 어뷰징 점수 차단
      if (!seenProblems[pid]) {
        seenProblems[pid] = true;
        correctByChapter[ch] = (correctByChapter[ch] || 0) + 1; // 해당 챕터 맞춘 개수 누적 가산
      }
    }

    // 최종 챕터별 퍼센트 연산 정산서 생성 (맞춘 개수 / 총 문제수 * 100, 최대 100% 한계치 방어)
    const newProgress = {};
    [1, 2, 3, 4].forEach(ch => {
      const total = totalByChapter[ch] || 1;
      const correct = correctByChapter[ch] || 0;
      newProgress[ch] = Math.min(Math.round((correct / total) * 100), 100);
    });
    setProgress(newProgress); // 정산 완료된 진도율 상태 등록
  }, []);

  // --- [6. ⌨️ 서브타이틀 텍스트 한 글자씩 타이핑 구현 기믹] ---
  useEffect(() => {
    const fullText = t('main_subtitle'); // 다국어 변역 번들에서 서브타이틀 원본 문장을 긁어옵니다.
    let idx = 0;
    setDisplayText(''); // 기존 자막 초기 비우기
    const timer = setInterval(() => {
      idx += 1;
      setDisplayText(fullText.slice(0, idx)); // 80ms 간격으로 문자열을 한 칸씩 더 슬라이싱해서 이어붙임
      if (idx >= fullText.length) clearInterval(timer); // 문장 완성이 끝나면 타이머 폭파 종료
    }, 80);
    return () => clearInterval(timer);
  }, [lang, t]); // 사용 언어가 바뀌면 타이핑 애니메이션 재시작

  // 열려있는 모달 인덱스 정보 및 캐싱 상태를 완전 제로 상태로 리셋하는 청소 함수
  const closeAll = () => {
    setStep(null);
    setSelectedLang(null);
    setSelectedLevel(null);
    setSelectedChapter(null);
  };

  return (
    <div className="main-container home-page" style={{ display: 'flex', backgroundImage: 'none', overflow: 'hidden' }}>
      {/* 로비 대시보드 인터페이스 전용 CSS 마크다운 주입 */}
      <style>{`
        .home-page .home-bg-layer { position: absolute; inset: 0; background-size: cover; background-position: center; background-repeat: no-repeat; transition: opacity 2s ease-in-out; z-index: 0; pointer-events: none; }
        .home-page .home-bg-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.35); z-index: 1; pointer-events: none; }
        .home-page > :not(.home-bg-layer):not(.home-bg-overlay):not(.modal-overlay) { position: relative; z-index: 2; }
        .home-page > .modal-overlay { z-index: 100; }
        .home-page .btn-link img { mix-blend-mode: multiply; transition: transform 0.25s ease, filter 0.25s ease; filter: drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 10px rgba(255,255,255,0.75)) drop-shadow(0 3px 12px rgba(0,0,0,0.9)) drop-shadow(0 1px 4px rgba(0,0,0,0.8)); }
        /* 메뉴 마우스 오버 시 공중에 둥둥 뜨고 불타오르는 듯한(drop-shadow 삼중 연산) 네온 효과 정의 */
        .home-page .btn-link:hover img { animation: home-btn-float 1.4s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(255, 235, 130, 1)) drop-shadow(0 0 14px rgba(255, 210, 70, 0.9)) drop-shadow(0 0 26px rgba(255, 193, 7, 0.55)); }
        /* 메뉴 버튼을 마우스로 꾸욱 눌렀을 때 탄력 있게 팅겨오르는 팝업 애니메이션 바인딩 */
        .home-page .btn-link:active img { animation: home-btn-pop 0.45s ease forwards; filter: drop-shadow(0 0 8px rgba(255, 245, 170, 1)) drop-shadow(0 0 18px rgba(255, 220, 90, 1)) drop-shadow(0 0 34px rgba(255, 193, 7, 0.8)); }
        .home-page .btn-link:hover .home-btn-label { text-shadow: 0 0 8px rgba(255, 220, 100, 0.95), 0 0 16px rgba(255, 193, 7, 0.5), 0 1px 0 rgba(255, 248, 216, 0.8); }
        .home-page .btn-link:active .home-btn-label { text-shadow: 0 0 10px rgba(255, 235, 140, 1), 0 0 20px rgba(255, 200, 60, 0.85), 0 1px 0 rgba(255, 248, 216, 0.8); }
        .home-page .btn-link { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .home-page .home-btn-label { font-family: 'Jua', sans-serif; font-size: 15px; font-weight: 700; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7); pointer-events: none; }
        @keyframes home-btn-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes home-btn-pop { 0% { transform: translateY(0) scale(1); } 35% { transform: translateY(-16px) scale(1.06); } 65% { transform: translateY(-10px) scale(1.03); } 100% { transform: translateY(-12px) scale(1.04); } }
      `}</style>
      
      {/* 2초 동안 부드럽게 교차되는 크로스페이드 배경 레이어 5개 배치 */}
      {HOME_BACKGROUNDS.map((src, index) => {
        const isActive = activeBg === index;
        const isPrev = prevBg === index;
        const isVisible = isActive || isPrev;
        return (
          <div
            key={src}
            className="home-bg-layer"
            style={{
              backgroundImage: `url('${src}')`,
              opacity: isActive ? 1 : 0,
              visibility: isVisible ? 'visible' : 'hidden',
              zIndex: isActive ? 2 : isPrev ? 1 : 0,
            }}
          />
        );
      })}
      <div className="home-bg-overlay" />
      
      <header className="header">
        <h1 className="glow-title">{t('main_title')}</h1>
        {/* 타이핑 효과가 흘러나오는 서브 문구 및 끝부분에 깜빡이는 커서 바(|) 노출 */}
        <p className="subtitle">{displayText}<span className="cursor">|</span></p>
      </header>

      {/* --- [7. 대시보드 중앙 핵심 4대 메뉴 대형 아이콘 버튼 보드판] --- */}
      <div className="button-wrapper">
        {/* 메뉴 1: 문제 풀이 모드 실행 (클릭 시 1단계 언어선택 'lang' 모달창 트리거 실행) */}
        <button
          className="btn-link"
          onClick={() => setStep('lang')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_quiz.png" alt="" />
          <span className="home-btn-label">{t('btn_quiz')}</span>
        </button>
        {/* 메뉴 2: 오답노트 페이지 이동 링크 */}
        <button
          className="btn-link"
          onClick={() => navigate('/note')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_ox.png" alt="" />
          <span className="home-btn-label">{t('btn_note')}</span>
        </button>
        {/* 메뉴 3: 문법 패턴 분석기 페이지 이동 링크 */}
        <button
          className="btn-link"
          onClick={() => navigate('/pattern')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_pattern.png" alt="" />
          <span className="home-btn-label">{t('btn_pattern')}</span>
        </button>
        {/* 메뉴 4: 타자 연습 미니게임 페이지 이동 링크 */}
        <button
          className="btn-link"
          onClick={() => navigate('/minigame')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_game.png" alt="" />
          <span className="home-btn-label">{t('btn_minigame')}</span>
        </button>
      </div>

      {/* =========================================================
          [8. 조건부 하위 모달 연쇄 인터록 렌더링 시스템 파트 (State 분기)]
          ========================================================= */}

      {/* 1단계: 개발 코딩 언어 선택 모달 디렉토리 */}
      {step === 'lang' && (
        <LangModal
          t={t}
          onClose={closeAll}
          onSelect={(lang) => {
            setSelectedLang(lang); // 'java' 등 선택값 저장
            setStep('level');      // 보관 완료 후 즉시 다음 단계인 '난이도 선택'창 스위치 격상
          }}
        />
      )}

      {/* 2단계: 난이도 설정 모달 디렉토리 */}
      {step === 'level' && (
        <LevelModal
          t={t}
          onClose={closeAll}
          onBack={() => setStep('lang')} // 이전 버튼 클릭 시 역방향 언어선택 화면 리턴 백 기믹
          onSelect={(level) => {
            setSelectedLevel(level);   // 'basic', 'mid' 등 보관
            setStep('chapter');        // 완료 후 즉시 다음 단계인 '챕터(단원) 선택'창 격상
          }}
        />
      )}

      {/* 3단계: 세부 단원(챕터) 마이그레이션 모달 디렉토리 */}
      {step === 'chapter' && (
        <ChapterModal
          t={t}
          level={selectedLevel}        // 앞서 선택해놓은 난이도 값을 넘겨 해당 챕터 그룹만 한정 노출 유도
          progress={progress}          // 집계 완료된 진도율 퍼센트 데이터 바인딩
          onClose={closeAll}
          onBack={() => setStep('level')}
          onSelect={(chapter) => {
            setSelectedChapter(chapter); // 최종 공부할 단원 넘버 등록
            setStep('setting');          // 마지막 단계인 '문항 세부 커스텀 설정'창 격상
          }}
        />
      )}

      {/* 4단계: 퀴즈 최종 분배 조율 모달 디렉토리 */}
      {step === 'setting' && (
        <QuizSettingModal
          t={t}
          onClose={closeAll}
          onBack={() => setStep('chapter')}
          onStart={(settings) => {
            closeAll(); // 모달 청소
            // [최종 폭주 출발] 조립 완료된 모든 커스텀 세팅값(문항수, 비율, 단원 번호)을 보따리에 가득 실어
            // 본격적인 코딩 문제 풀이 전용 컴포넌트 페이지인 '/play' 경로로 유저를 로켓 발사시킵니다.
            navigate('/play', { state: { ...settings, chapter: selectedChapter } });
          }}
        />
      )}

      {/* 전역 가이드라인 투어 모달 레이어 컴포넌트 실시간 탑재부 */}
      {tutorialStep != null && (
        <HomeCoachmark
          t={t}
          step={tutorialStep}
          onNext={() => {
            // 마지막 인덱스 단계에 다다르면 최종 수료 완료 처리, 아직 남았다면 다음 번호로 레벨업 카운트
            if (tutorialStep >= TUTORIAL_STEPS.length - 1) finishTutorial();
            else setTutorialStep((s) => s + 1);
          }}
          onSkip={() => setTutorialStep(null)}
        />
      )}
    </div>
  );
}

// =========================================================
// [9. 하위 독립 보조 컴포넌트 폼 모음 (Modals 포메이션)]
// =========================================================

// (1) LangModal: 학습하려는 핵심 언어를 필터링 고르는 카드 창
function LangModal({ t, onClose, onSelect }) {
  const langs = [
    { id: 'java', label: 'Java', emoji: '☕', ready: true },
    { id: 'python', label: 'Python', emoji: '🐍', ready: false }, // 시스템 확장용 대기 가드식
    { id: 'c', label: 'C언어', emoji: '⚙️', ready: false },       // 시스템 확장용 대기 가드식
  ];

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_lang_title')}</h2>
        <div className="chapter-list">
          {langs.map(lang => (
            <div
              key={lang.id}
              className="chapter-item"
              // [안전 설계] 아직 완성되지 않은 공사중 언어 아이템은 투명도를 0.5로 낮추고 마우스 포인터를 금지 마크로 봉쇄합니다.
              style={{ opacity: lang.ready ? 1 : 0.5, cursor: lang.ready ? 'pointer' : 'not-allowed', justifyContent: 'space-between' }}
              onClick={() => lang.ready && onSelect(lang.id)} // 준비 완료된 코어 패키지만 선택 클릭 이벤트 개방
            >
              <span className="ch-title">{lang.emoji} {lang.label}</span>
              {!lang.ready && <span style={{ fontSize: 12, color: '#aaa' }}>준비중</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// (2) LevelModal: 학습 레벨(초급🌱/중급🌿/고급🌳)의 깊이를 다루는 설정 창
function LevelModal({ t, onClose, onBack, onSelect }) {
  const levels = [
    { id: 'basic', label: t('level_basic'), emoji: '🌱' },
    { id: 'mid', label: t('level_mid'), emoji: '🌿' },
    { id: 'adv', label: t('level_adv'), emoji: '🌳' },
  ];

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_level_title')}</h2>
        <div className="chapter-list">
          {levels.map(level => (
            <div
              key={level.id}
              className="chapter-item"
              onClick={() => onSelect(level.id)}
            >
              <span className="ch-title">{level.emoji} {level.label}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>← 이전</button>
      </div>
    </div>
  );
}

// (3) ChapterModal: 선택한 난이도 내 배정된 단원을 탐색하고 개별 진도 성적표(Progress)를 막대로 그려주는 창
function ChapterModal({ t, level, progress, onClose, onBack, onSelect }) {
  // JAVA_CHAPTERS 오브젝트 매핑 테이블에서 사용자가 고른 레벨에 부합하는 배열( basic | mid | adv )을 실시간 적출합니다.
  const chapters = JAVA_CHAPTERS[level] || [];

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_chapter_title')}</h2>
        <div className="chapter-list" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
          {chapters.map(ch => (
            <div
              key={ch.id}
              className="chapter-item"
              onClick={() => onSelect(ch.id)}
            >
              <span className="ch-title">{t(ch.title)}</span>
              {/* 챕터 정면에 바짝 붙어있는 미니 게이지 바 컴포넌트: 사용자가 쌓아놓은 진도 퍼센트(`0~100%`) 만큼 가로 채우기 가동 */}
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress[ch.id] || 0}%` }}></div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>← 이전</button>
      </div>
    </div>
  );
}

// (4) QuizSettingModal: 주관식/객관식 출제 문항 가중치 조율 슬라이더 바 및 총 문제 수 인풋 수렴 최종 가동 창
function QuizSettingModal({ t, onClose, onBack, onStart }) {
  const [ratio, setRatio] = useState(50); // 슬라이더 제어용 임시 비율 상태 (기본 하프 앤 하프인 50% 세팅)
  const [count, setCount] = useState(10); // 풀고 싶은 퀴즈 문항 누적 개수 타겟 컴포넌트 상태 (기본 10개)

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_quiz_title')}</h2>
        <div className="setting-form">
          {/* 배율 컨트롤용 슬라이더 블록 */}
          <div className="setting-group">
            <label>{t('quiz_ratio')}</label>
            <div className="range-slider-wrapper">
              {/* 슬라이더 인풋 핸들을 쥐고 양옆으로 슬라이드 하면 객관식과 주관식 비율 수치가 도합 100에 맞게 실시간 대칭 조절됨 */}
              <span><span>{t('quiz_obj')}</span> {ratio}%</span>
              <input type="range" min="0" max="100" step="10" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
              <span><span>{t('quiz_subj')}</span> {100 - ratio}%</span>
            </div>
          </div>
          {/* 문항 수 컨트롤용 넘버 입력 폼 */}
          <div className="setting-group">
            <label>{t('quiz_count')}</label>
            <input type="number" min="1" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} className="setting-input" />
          </div>
          {/* 최종 관문: 축적 완료된 팩(ratio, count)을 담은 채로 런타임 출발 스위치 트리거 실행 */}
          <button
            className="clay-submit"
            onClick={() => onStart({ ratio, count })}
            style={{ width: '100%', marginTop: '15px' }}
          >
            {t('btn_start_quiz')}
          </button>
        </div>
        <button onClick={onBack} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>← 이전</button>
      </div>
    </div>
  );
}