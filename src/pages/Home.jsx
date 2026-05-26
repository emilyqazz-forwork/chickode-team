// Home.jsx - 메인 홈 화면 로비이자 단계별 학습 셋업 모달을 순차 제어하는 총괄 관제 파일
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getAttempts } from '../state/app-state';
import { settingsButtonRef } from '../state/tutorial-refs';
import { JAVA_CHAPTERS } from '../data/constants';

const HOME_BACKGROUNDS = [
  '/images/bg1.png',
  '/images/bg2.png',
  '/images/bg3.png',
  '/images/bg4.png',
  '/images/bg5.png',
];

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

      {!spotlightStyle && <div className="home-coachmark-backdrop" />}
      {spotlightStyle && (
        <>
          <div className="home-coachmark-cutout-piece" style={{ top: 0, left: 0, width: '100vw', height: `${Math.max(0, spotlightStyle.top)}px` }} />
          <div className="home-coachmark-cutout-piece" style={{ top: `${spotlightStyle.top + spotlightStyle.height}px`, left: 0, width: '100vw', height: `calc(100vh - ${spotlightStyle.top + spotlightStyle.height}px)` }} />
          <div className="home-coachmark-cutout-piece" style={{ top: `${spotlightStyle.top}px`, left: 0, width: `${Math.max(0, spotlightStyle.left)}px`, height: `${spotlightStyle.height}px` }} />
          <div className="home-coachmark-cutout-piece" style={{ top: `${spotlightStyle.top}px`, left: `${spotlightStyle.left + spotlightStyle.width}px`, width: `calc(100vw - ${spotlightStyle.left + spotlightStyle.width}px)`, height: `${spotlightStyle.height}px` }} />
          <div className="home-coachmark-spotlight" style={spotlightStyle} />
        </>
      )}

      <div className="home-coachmark-tooltip" style={{ top: tooltipTop, left: tooltipLeft, transform: tooltipTransform }}>
        <h3>{t(current.titleKey)}</h3>
        <p>{t(current.bodyKey)}</p>
        <div className="home-coachmark-actions">
          <button type="button" className="home-coachmark-skip" onClick={onSkip}>{t('tutorial_skip')}</button>
          <button type="button" className="home-coachmark-next" onClick={onNext}>{isLast ? t('tutorial_done') : t('tutorial_next')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Home({ t, lang }) {
  const [step, setStep] = useState(null);
  const [selectedLang, setSelectedLang] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [progress, setProgress] = useState({});
  const [displayText, setDisplayText] = useState('');
  const [tutorialStep, setTutorialStep] = useState(null);
  const [activeBg, setActiveBg] = useState(0);
  const [prevBg, setPrevBg] = useState(null);
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
      setActiveBg((current) => {
        setPrevBg(current);
        return (current + 1) % HOME_BACKGROUNDS.length;
      });
    }, 10000);
    return () => window.clearInterval(bgTimer);
  }, []);

  useEffect(() => {
    if (prevBg == null) return undefined;
    const fadeDone = window.setTimeout(() => setPrevBg(null), 2100);
    return () => window.clearTimeout(fadeDone);
  }, [activeBg, prevBg]);

  useEffect(() => {
    const attempts = getAttempts();
    const totalByChapter = { 1: 13, 2: 13, 3: 13, 4: 13 };
    const correctByChapter = {};
    const seenProblems = {};

    for (const a of attempts) {
      if (!a.isCorrect) continue;
      const ch = a.chapter;
      const pid = a.problemId || a.title;
      if (!seenProblems[pid]) {
        seenProblems[pid] = true;
        correctByChapter[ch] = (correctByChapter[ch] || 0) + 1;
      }
    }

    const newProgress = {};
    [1, 2, 3, 4].forEach(ch => {
      const total = totalByChapter[ch] || 1;
      const correct = correctByChapter[ch] || 0;
      newProgress[ch] = Math.min(Math.round((correct / total) * 100), 100);
    });
    setProgress(newProgress);
  }, []);

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

  const closeAll = () => {
    setStep(null);
    setSelectedLang(null);
    setSelectedLevel(null);
    setSelectedChapter(null);
  };

  return (
    <div className="main-container home-page" style={{ display: 'flex', backgroundImage: 'none' }}>
      <style>{`
        .main-container.home-page { position: fixed; inset: 0; width: 100%; height: calc(var(--home-vh, 1vh) * 100); min-height: calc(var(--home-vh, 1vh) * 100); max-height: calc(var(--home-vh, 1vh) * 100); overflow: hidden; overscroll-behavior: none; }
        .home-page .home-bg-layer { position: fixed; inset: 0; width: 100%; height: calc(var(--home-vh, 1vh) * 100); min-height: calc(var(--home-vh, 1vh) * 100); background-size: cover; background-position: center center; background-repeat: no-repeat; transition: opacity 2s ease-in-out; z-index: 0; pointer-events: none; }
        .home-page .home-bg-overlay { position: fixed; inset: 0; width: 100%; height: calc(var(--home-vh, 1vh) * 100); min-height: calc(var(--home-vh, 1vh) * 100); background: rgba(0, 0, 0, 0.35); z-index: 1; pointer-events: none; }
        .home-page > :not(.home-bg-layer):not(.home-bg-overlay):not(.modal-overlay) { position: relative; z-index: 2; }
        .home-page > .modal-overlay { z-index: 100; }
        .home-page .btn-link img { mix-blend-mode: multiply; transition: transform 0.25s ease, filter 0.25s ease; filter: drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 10px rgba(255,255,255,0.75)) drop-shadow(0 3px 12px rgba(0,0,0,0.9)) drop-shadow(0 1px 4px rgba(0,0,0,0.8)); }
        .home-page .btn-link:hover img { animation: home-btn-float 1.4s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(255, 235, 130, 1)) drop-shadow(0 0 14px rgba(255, 210, 70, 0.9)) drop-shadow(0 0 26px rgba(255, 193, 7, 0.55)); }
        .home-page .btn-link:active img { animation: home-btn-pop 0.45s ease forwards; filter: drop-shadow(0 0 8px rgba(255, 245, 170, 1)) drop-shadow(0 0 18px rgba(255, 220, 90, 1)) drop-shadow(0 0 34px rgba(255, 193, 7, 0.8)); }
        .home-page .btn-link:hover .home-btn-label { text-shadow: 0 0 8px rgba(255, 220, 100, 0.95), 0 0 16px rgba(255, 193, 7, 0.5), 0 1px 0 rgba(255, 248, 216, 0.8); }
        .home-page .btn-link:active .home-btn-label { text-shadow: 0 0 10px rgba(255, 235, 140, 1), 0 0 20px rgba(255, 200, 60, 0.85), 0 1px 0 rgba(255, 248, 216, 0.8); }
        .home-page .btn-link { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .home-page .home-btn-label { font-family: 'Jua', sans-serif; font-size: 15px; font-weight: 700; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7); pointer-events: none; }
        @keyframes home-btn-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes home-btn-pop { 0% { transform: translateY(0) scale(1); } 35% { transform: translateY(-16px) scale(1.06); } 65% { transform: translateY(-10px) scale(1.03); } 100% { transform: translateY(-12px) scale(1.04); } }
      `}</style>

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
        <p className="subtitle">{displayText}<span className="cursor">|</span></p>
      </header>

      <div className="button-wrapper">
        <button className="btn-link" onClick={() => setStep('lang')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src="/images/home_quiz.png" alt="" />
          <span className="home-btn-label">{t('btn_quiz')}</span>
        </button>
        <button className="btn-link" onClick={() => navigate('/note')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src="/images/home_ox.png" alt="" />
          <span className="home-btn-label">{t('btn_note')}</span>
        </button>
        <button className="btn-link" onClick={() => navigate('/pattern')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src="/images/home_pattern.png" alt="" />
          <span className="home-btn-label">{t('btn_pattern')}</span>
        </button>
        <button className="btn-link" onClick={() => navigate('/minigame')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src="/images/home_game.png" alt="" />
          <span className="home-btn-label">{t('btn_minigame')}</span>
        </button>
      </div>

      {step === 'lang' && (
        <LangModal
          t={t}
          onClose={closeAll}
          onSelect={(lang) => {
            setSelectedLang(lang);
            setStep('level');
          }}
        />
      )}

      {step === 'level' && (
        <LevelModal
          t={t}
          onClose={closeAll}
          onBack={() => setStep('lang')}
          onSelect={(level) => {
            setSelectedLevel(level);
            setStep('chapter');
          }}
        />
      )}

      {step === 'chapter' && (
        <ChapterModal
          t={t}
          level={selectedLevel}
          progress={progress}
          onClose={closeAll}
          onBack={() => setStep('level')}
          onSelect={(chapter) => {
            setSelectedChapter(chapter);
            setStep('setting');
          }}
        />
      )}

      {/* ✅ 핵심 수정: unitLang과 difficulty(한글 변환)를 함께 실어서 /play로 이동 */}
      {step === 'setting' && (
        <QuizSettingModal
          t={t}
          onClose={closeAll}
          onBack={() => setStep('chapter')}
          onStart={(settings) => {
            // 영문 레벨 ID → Quiz.jsx가 기대하는 한글 난이도로 변환
            const diffLabelMap = { basic: '기초', mid: '중급', adv: '고급' };
            closeAll();
            navigate('/play', {
              state: {
                ...settings,
                chapter: selectedChapter,
                unitLang: selectedLang,                           // ✅ 'java' | 'py' | 'c'
                difficulty: diffLabelMap[selectedLevel] || '기초', // ✅ '기초' | '중급' | '고급'
              },
            });
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
          onSkip={() => setTutorialStep(null)}
        />
      )}
    </div>
  );
}

function LangModal({ t, onClose, onSelect }) {
  const langs = [
    { id: 'java', label: 'Java', emoji: '☕', ready: true },
    { id: 'python', label: 'Python', emoji: '🐍', ready: false },
    { id: 'c', label: 'C언어', emoji: '⚙️', ready: false },
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
            <div key={level.id} className="chapter-item" onClick={() => onSelect(level.id)}>
              <span className="ch-title">{level.emoji} {level.label}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>← 이전</button>
      </div>
    </div>
  );
}

function ChapterModal({ t, level, progress, onClose, onBack, onSelect }) {
  const chapters = JAVA_CHAPTERS[level] || [];

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_chapter_title')}</h2>
        <div className="chapter-list" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
          {chapters.map(ch => (
            <div key={ch.id} className="chapter-item" onClick={() => onSelect(ch.id)}>
              <span className="ch-title">{t(ch.title)}</span>
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

function QuizSettingModal({ t, onClose, onBack, onStart }) {
  const [ratio, setRatio] = useState(50);
  const [countInput, setCountInput] = useState('10');
  const count = countInput === '' ? 0 : Number(countInput);
  const canStart = count >= 1 && count <= 10;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{t('modal_quiz_title')}</h2>
        <div className="setting-form">
          <div className="setting-group">
            <label>{t('quiz_count')}</label>
            <input type="number" min="1" max="10" value={countInput} onChange={(e) => setCountInput(e.target.value)} className="setting-input" />
            {count < 1 && (
              <p style={{ color: '#c62828', fontSize: '0.85rem', marginTop: '8px', marginBottom: 0 }}>{t('quiz_count_min_hint')}</p>
            )}
            {count > 10 && (
              <p style={{ color: '#c62828', fontSize: '0.85rem', marginTop: '8px', marginBottom: 0 }}>{t('quiz_count_max_hint')}</p>
            )}
          </div>
          <button
            className="clay-submit"
            disabled={!canStart}
            onClick={() => canStart && onStart({ ratio, count })}
            style={{ width: '100%', marginTop: '15px', opacity: canStart ? 1 : 0.5, cursor: canStart ? 'pointer' : 'not-allowed' }}
          >
            {t('btn_start_quiz')}
          </button>
        </div>
        <button onClick={onBack} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>← 이전</button>
      </div>
    </div>
  );
}