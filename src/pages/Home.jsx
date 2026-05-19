import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getAttempts } from '../state/app-state';
import { settingsButtonRef } from '../state/tutorial-refs';

// 챕터 데이터 - 난이도별(basic/mid/adv) 챕터 목록
const JAVA_CHAPTERS = {
  basic: [
    { id: 1, key: 'java_basic_1' },
    { id: 2, key: 'java_basic_2' },
  ],
  mid: [
    { id: 3, key: 'java_mid_1' },
    { id: 4, key: 'java_mid_2' },
  ],
  adv: [
    { id: 1, key: 'java_adv_1' },
    { id: 2, key: 'java_adv_2' },
  ],
};

const TUTORIAL_STEPS = [
  { selector: null, titleKey: 'tutorial_welcome_title', bodyKey: 'tutorial_welcome_body' },
  { selector: '.home-page .button-wrapper', titleKey: 'tutorial_menu_title', bodyKey: 'tutorial_menu_body' },
  { selector: '#globalSettingsBtn', titleKey: 'tutorial_settings_title', bodyKey: 'tutorial_settings_body' },
  { selector: '.home-login-action', titleKey: 'tutorial_login_title', bodyKey: 'tutorial_login_body' },
  { selector: '#homeBgmBtn', titleKey: 'tutorial_bgm_title', bodyKey: 'tutorial_bgm_body' },
];

function hasSeenTutorial() {
  try {
    const seen = window.localStorage.getItem('chickode_tutorial_seen');
    return seen === 'true' || seen === '1';
  } catch {
    return false;
  }
}

function markTutorialSeen() {
  try {
    window.localStorage.setItem('chickode_tutorial_seen', 'true');
  } catch {
    // noop
  }
}

function HomeCoachmark({ t, step, onNext, onSkip }) {
  const [rect, setRect] = useState(null);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isSettingsStep = current?.selector === '#globalSettingsBtn';

  useEffect(() => {
    if (step == null || !current?.selector) {
      setRect(null);
      return undefined;
    }
    const update = () => {
      if (isSettingsStep && settingsButtonRef.current) {
        setRect(settingsButtonRef.current.getBoundingClientRect());
        return;
      }
      const el = document.querySelector(current.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
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

  const pad = 10;
  const spotlightStyle = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  let tooltipTop = '50%';
  let tooltipLeft = '50%';
  let tooltipTransform = 'translate(-50%, -50%)';
  const tooltipMaxWidth = 320;

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
    const placeBelow = below + 180 < window.innerHeight;
    tooltipLeft = `${Math.min(
      Math.max(rect.left + rect.width / 2, tooltipMaxWidth / 2 + 16),
      window.innerWidth - tooltipMaxWidth / 2 - 16,
    )}px`;
    tooltipTransform = 'translateX(-50%)';
    tooltipTop = placeBelow ? `${below}px` : `${above}px`;
    if (!placeBelow) tooltipTransform = 'translate(-50%, -100%)';
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="home-coachmark-root" role="dialog" aria-modal="true">
      <style>{`
        .home-coachmark-root {
          position: fixed;
          inset: 0;
          z-index: 999999;
        }
        .home-coachmark-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          z-index: 1000000;
        }
        .home-coachmark-cutout-piece {
          position: fixed;
          background: rgba(0, 0, 0, 0.55);
          z-index: 1000000;
        }
        .home-coachmark-spotlight {
          position: fixed;
          border-radius: 14px;
          box-shadow: 0 0 0 3px rgba(255, 213, 79, 0.85), 0 0 24px 6px rgba(255, 213, 79, 0.55);
          z-index: 1000001;
          pointer-events: none;
          transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
        }
        .home-coachmark-tooltip {
          position: fixed;
          z-index: 1000002;
          width: min(320px, calc(100vw - 32px));
          background: #fdf6e3;
          border: 3px solid #5d4037;
          border-radius: 16px;
          padding: 18px 18px 14px;
          box-shadow: 6px 6px 0 #3e2723;
          font-family: 'Jua', sans-serif;
          color: #3e2723;
        }
        .home-coachmark-tooltip h3 {
          margin: 0 0 8px;
          font-size: 1.1rem;
        }
        .home-coachmark-tooltip p {
          margin: 0 0 14px;
          font-size: 0.95rem;
          line-height: 1.45;
        }
        .home-coachmark-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .home-coachmark-actions button {
          border: 2px solid #5d4037;
          border-radius: 10px;
          padding: 8px 14px;
          font-family: 'Jua', sans-serif;
          font-weight: 700;
          cursor: pointer;
        }
        .home-coachmark-skip {
          background: #e8dcc8;
          color: #5d4037;
        }
        .home-coachmark-next {
          background: #5d4037;
          color: #fff8d8;
        }
      `}</style>
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
      <div
        className="home-coachmark-tooltip"
        style={{ top: tooltipTop, left: tooltipLeft, transform: tooltipTransform }}
      >
        <h3>{t(current.titleKey)}</h3>
        <p>{t(current.bodyKey)}</p>
        <div className="home-coachmark-actions">
          <button type="button" className="home-coachmark-skip" onClick={onSkip}>
            {t('tutorial_skip')}
          </button>
          <button type="button" className="home-coachmark-next" onClick={onNext}>
            {isLast ? t('tutorial_done') : t('tutorial_next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Home({ t, lang }) {
  // step: 현재 어떤 모달을 보여줄지 관리 (null이면 모달 없음)
  const [step, setStep] = useState(null); // null | 'lang' | 'level' | 'chapter' | 'setting'
  const [selectedLang, setSelectedLang] = useState(null);     // 선택한 언어 (java, python 등)
  const [selectedLevel, setSelectedLevel] = useState(null);   // 선택한 난이도 (basic, mid, adv)
  const [selectedChapter, setSelectedChapter] = useState(null); // 선택한 챕터 번호
  const [progress, setProgress] = useState({});               // 챕터별 진도율 (0~100%)
  const [displayText, setDisplayText] = useState('');         // 타이핑 애니메이션 텍스트
  const [tutorialStep, setTutorialStep] = useState(null);
  const [activeBg, setActiveBg] = useState(0);
  const navigate = useNavigate();

  const finishTutorial = useCallback(() => {
    setTutorialStep(null);
    markTutorialSeen();
  }, []);

  const startTutorial = useCallback(() => {
    setStep(null);
    setTutorialStep(0);
  }, []);

  useEffect(() => {
    const onStart = () => startTutorial();
    window.addEventListener('chickode:start_tutorial_on_home', onStart);
    return () => window.removeEventListener('chickode:start_tutorial_on_home', onStart);
  }, [startTutorial]);

  useEffect(() => {
    if (hasSeenTutorial()) return undefined;
    const timer = window.setTimeout(() => startTutorial(), 600);
    return () => window.clearTimeout(timer);
  }, [startTutorial]);

  useEffect(() => {
    const bgTimer = window.setInterval(() => {
      setActiveBg((current) => (current + 1) % 5);
    }, 30000);

    return () => window.clearInterval(bgTimer);
  }, []);

  // 챕터별 진도율 계산
  useEffect(() => {
    const attempts = getAttempts(); // 저장된 풀이 기록 가져오기
    const totalByChapter = { 1: 13, 2: 13, 3: 13, 4: 13 }; // 챕터별 총 문제 수
    const correctByChapter = {};
    const seenProblems = {}; // 같은 문제 중복 카운트 방지용

    for (const a of attempts) {
      if (!a.isCorrect) continue; // 틀린 문제는 건너뜀
      const ch = a.chapter;
      const pid = a.problemId || a.title;
      if (!seenProblems[pid]) {
        seenProblems[pid] = true;
        correctByChapter[ch] = (correctByChapter[ch] || 0) + 1; // 챕터별 정답 수 누적
      }
    }

    // 챕터별 진도율 계산 (정답수 / 총문제수 * 100, 최대 100%)
    const newProgress = {};
    [1, 2, 3, 4].forEach(ch => {
      const total = totalByChapter[ch] || 1;
      const correct = correctByChapter[ch] || 0;
      newProgress[ch] = Math.min(Math.round((correct / total) * 100), 100);
    });
    setProgress(newProgress);
  }, []);

  // 타이핑 애니메이션 - 한 글자씩 80ms마다 추가
  useEffect(() => {
    const fullText = t('main_subtitle');
    let idx = 0;
    setDisplayText('');
    const timer = setInterval(() => {
      idx += 1;
      setDisplayText(fullText.slice(0, idx));
      if (idx >= fullText.length) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [lang, t]);

  // 모달 전체 닫기 및 선택값 초기화
  const closeAll = () => {
    setStep(null);
    setSelectedLang(null);
    setSelectedLevel(null);
    setSelectedChapter(null);
  };

  return (
    <div className="main-container home-page" style={{ display: 'flex', backgroundImage: 'none', overflow: 'hidden' }}>
      <style>{`
        .home-page .home-bg-layer {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: opacity 2s ease-in-out;
          z-index: 0;
          pointer-events: none;
        }
        .home-page .home-bg-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.35);
          z-index: 1;
          pointer-events: none;
        }
        .home-page > :not(.home-bg-layer):not(.home-bg-overlay):not(.modal-overlay) {
          position: relative;
          z-index: 2;
        }
        .home-page > .modal-overlay {
          z-index: 100;
        }
        .home-page .btn-link img {
          mix-blend-mode: multiply;
          transition: transform 0.25s ease, filter 0.25s ease;
        }
        .home-page .btn-link:hover img {
          animation: home-btn-float 1.4s ease-in-out infinite;
          filter:
            drop-shadow(0 0 6px rgba(255, 235, 130, 1))
            drop-shadow(0 0 14px rgba(255, 210, 70, 0.9))
            drop-shadow(0 0 26px rgba(255, 193, 7, 0.55));
        }
        .home-page .btn-link:active img {
          animation: home-btn-pop 0.45s ease forwards;
          filter:
            drop-shadow(0 0 8px rgba(255, 245, 170, 1))
            drop-shadow(0 0 18px rgba(255, 220, 90, 1))
            drop-shadow(0 0 34px rgba(255, 193, 7, 0.8));
        }
        .home-page .btn-link:hover .home-btn-label {
          text-shadow:
            0 0 8px rgba(255, 220, 100, 0.95),
            0 0 16px rgba(255, 193, 7, 0.5),
            0 1px 0 rgba(255, 248, 216, 0.8);
        }
        .home-page .btn-link:active .home-btn-label {
          text-shadow:
            0 0 10px rgba(255, 235, 140, 1),
            0 0 20px rgba(255, 200, 60, 0.85),
            0 1px 0 rgba(255, 248, 216, 0.8);
        }
        .home-page .btn-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .home-page .home-btn-label {
          font-family: 'Jua', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #3e2723;
          text-shadow: 0 1px 0 rgba(255, 248, 216, 0.8);
          pointer-events: none;
        }
        @keyframes home-btn-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes home-btn-pop {
          0% { transform: translateY(0) scale(1); }
          35% { transform: translateY(-16px) scale(1.06); }
          65% { transform: translateY(-10px) scale(1.03); }
          100% { transform: translateY(-12px) scale(1.04); }
        }
      `}</style>
      <div
        className="home-bg-layer"
        style={{ backgroundImage: "url('/images/배경.png')", opacity: activeBg === 0 ? 1 : 0 }}
      />
      <div
        className="home-bg-layer"
        style={{ backgroundImage: "url('/images/배경2.png')", opacity: activeBg === 1 ? 1 : 0 }}
      />
      <div
        className="home-bg-layer"
        style={{ backgroundImage: "url('/images/배경3.png')", opacity: activeBg === 2 ? 1 : 0 }}
      />
      <div
        className="home-bg-layer"
        style={{ backgroundImage: "url('/images/배경4.png')", opacity: activeBg === 3 ? 1 : 0 }}
      />
      <div
        className="home-bg-layer"
        style={{ backgroundImage: "url('/images/배경5.png')", opacity: activeBg === 4 ? 1 : 0 }}
      />
      <div className="home-bg-overlay" />
      <header className="header">
        <h1 className="glow-title">{t('main_title')}</h1>
        {/* 타이핑 애니메이션 텍스트 + 깜빡이는 커서 */}
        <p className="subtitle">{displayText}<span className="cursor">|</span></p>
      </header>

      {/* 메인 버튼 메뉴 */}
      <div className="button-wrapper">
        <button
          className="btn-link"
          onClick={() => setStep('lang')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_quiz.png" alt="" />
          <span className="home-btn-label">{t('btn_quiz')}</span>
        </button>
        <button
          className="btn-link"
          onClick={() => navigate('/note')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_ox.png" alt="" />
          <span className="home-btn-label">{t('btn_note')}</span>
        </button>
        <button
          className="btn-link"
          onClick={() => navigate('/pattern')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_pattern.png" alt="" />
          <span className="home-btn-label">{t('btn_pattern')}</span>
        </button>
        <button
          className="btn-link"
          onClick={() => navigate('/minigame')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/images/home_game.png" alt="" />
          <span className="home-btn-label">{t('btn_minigame')}</span>
        </button>
      </div>

      {/* step 상태에 따라 해당 모달만 렌더링 */}

      {/* 1단계: 언어 선택 모달 */}
      {step === 'lang' && (
        <LangModal
          t={t}
          onClose={closeAll}
          onSelect={(lang) => {
            setSelectedLang(lang);
            setStep('level'); // 언어 선택 후 난이도 선택으로 이동
          }}
        />
      )}

      {/* 2단계: 난이도 선택 모달 */}
      {step === 'level' && (
        <LevelModal
          t={t}
          onClose={closeAll}
          onBack={() => setStep('lang')} // 이전 버튼 누르면 언어 선택으로 돌아감
          onSelect={(level) => {
            setSelectedLevel(level);
            setStep('chapter'); // 난이도 선택 후 챕터 선택으로 이동
          }}
        />
      )}

      {/* 3단계: 챕터 선택 모달 */}
      {step === 'chapter' && (
        <ChapterModal
          t={t}
          level={selectedLevel}
          progress={progress}
          onClose={closeAll}
          onBack={() => setStep('level')} // 이전 버튼 누르면 난이도 선택으로 돌아감
          onSelect={(chapter) => {
            setSelectedChapter(chapter);
            setStep('setting'); // 챕터 선택 후 퀴즈 설정으로 이동
          }}
        />
      )}

      {/* 4단계: 퀴즈 설정 모달 */}
      {step === 'setting' && (
        <QuizSettingModal
          t={t}
          onClose={closeAll}
          onBack={() => setStep('chapter')} // 이전 버튼 누르면 챕터 선택으로 돌아감
          onStart={(settings) => {
            closeAll();
            // 퀴즈 시작 - 설정값과 챕터 정보를 가지고 /play 페이지로 이동
            navigate('/play', { state: { ...settings, chapter: selectedChapter } });
          }}
        />
      )}

      {tutorialStep != null && (
        <HomeCoachmark
          t={t}
          step={tutorialStep}
          onNext={() => {
            if (tutorialStep >= TUTORIAL_STEPS.length - 1) finishTutorial();
            else setTutorialStep((s) => s + 1);
          }}
          onSkip={finishTutorial}
        />
      )}
    </div>
  );
}

// 언어 선택 모달 컴포넌트
function LangModal({ t, onClose, onSelect }) {
  const langs = [
    { id: 'java', label: 'Java', emoji: '☕', ready: true },
    { id: 'python', label: 'Python', emoji: '🐍', ready: false }, // 준비중
    { id: 'c', label: 'C언어', emoji: '⚙️', ready: false },       // 준비중
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
              // 준비중인 언어는 클릭 불가 (opacity 0.5, cursor not-allowed)
              style={{ opacity: lang.ready ? 1 : 0.5, cursor: lang.ready ? 'pointer' : 'not-allowed', justifyContent: 'space-between' }}
              onClick={() => lang.ready && onSelect(lang.id)}
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

// 난이도 선택 모달 컴포넌트
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

// 챕터 선택 모달 컴포넌트
function ChapterModal({ t, level, progress, onClose, onBack, onSelect }) {
  // 선택한 난이도에 해당하는 챕터 목록 가져오기
  const chapters = JAVA_CHAPTERS[level] || [];

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_chapter_title')}</h2>
        <div className="chapter-list">
          {chapters.map(ch => (
            <div
              key={ch.id}
              className="chapter-item"
              onClick={() => onSelect(ch.id)}
            >
              <span className="ch-title">{t(ch.key)}</span>
              {/* 챕터별 진도율 프로그레스바 */}
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

// 퀴즈 설정 모달 컴포넌트
function QuizSettingModal({ t, onClose, onBack, onStart }) {
  const [ratio, setRatio] = useState(50);           // 객관식/주관식 비율 (기본 50:50)
  const [count, setCount] = useState(10);           // 문제 수 (기본 10개)

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_quiz_title')}</h2>
        <div className="setting-form">
          {/* 객관식/주관식 비율 슬라이더 */}
          <div className="setting-group">
            <label>{t('quiz_ratio')}</label>
            <div className="range-slider-wrapper">
              <span><span>{t('quiz_obj')}</span> {ratio}%</span>
              <input type="range" min="0" max="100" step="10" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
              <span><span>{t('quiz_subj')}</span> {100 - ratio}%</span>
            </div>
          </div>
          {/* 문제 수 입력 */}
          <div className="setting-group">
            <label>{t('quiz_count')}</label>
            <input type="number" min="1" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} className="setting-input" />
          </div>
          {/* 퀴즈 시작 버튼 - 설정값을 onStart에 전달 */}
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