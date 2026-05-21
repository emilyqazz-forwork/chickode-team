// --- [CHICKODE 전역 커리큘럼 정적 데이터 정의] ---

// ============== ==========================================
// 1. JAVA 커리큘럼 상수 (JAVA_CHAPTERS)
// ========================================================
export const JAVA_CHAPTERS = {
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
    },
    {
      id: "java_adv_c2",
      title: "2단원: 멀티 스레드와 JVM 구조",
      description: "병렬 처리를 위한 동시성 프로그래밍 스레드 동기화 및 JVM 메모리 영역을 제어합니다.",
      icon: "⚙️",
      units: ["java_adv_c2_u1", "java_adv_c2_u2", "java_adv_c2_u3", "java_adv_c2_u4"]
    },
    {
      id: "java_adv_c3",
      title: "3단원: 입출력 및 네트워크 소켓",
      description: "시스템 스트림 기반의 파일 입출력(I/O) 데이터 처리와 소켓 기반 네트워킹을 학습합니다.",
      icon: "🌐",
      units: ["java_adv_c3_u1", "java_adv_c3_u2"]
    }
  ]
};

// ========================================================
// 2. PYTHON 커리큘럼 상수 (PYTHON_CHAPTERS)
// ========================================================
export const PYTHON_CHAPTERS = {
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
// 3. C언어 커리큘럼 상수 (C_CHAPTERS)
// ========================================================
export const C_CHAPTERS = {
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

// constants.js 파일 맨 최하단에 추가
export const ALL_CHAPTERS = {
  java: JAVA_CHAPTERS,
  python: PYTHON_CHAPTERS,
  c: C_CHAPTERS
};