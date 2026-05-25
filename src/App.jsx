// App.jsx - 앱의 최상위 컴포넌트 (모든 페이지/모달의 총괄 관리자)

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { GlobalNav } from './components/GlobalNav';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { AuthModal } from './components/AuthModal';
import { Home } from './pages/Home';
import { Quiz } from './pages/Quiz';
import { Note } from './pages/Note';
import { Pattern } from './pages/Pattern';
import { Result } from './pages/Result';
import { useI18n } from './state/i18n';
import { MiniGame } from './pages/MiniGame';

function AppRoutes() {
  const navigate = useNavigate();
  const { t, params, setParams } = useI18n();
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const handleTutorialReplay = () => {
      navigate('/');
      window.setTimeout(() => {
        window.dispatchEvent(new Event('chickode:start_tutorial_on_home'));
      }, 100);
    };
    window.addEventListener('chickode:start_tutorial', handleTutorialReplay);
    return () => window.removeEventListener('chickode:start_tutorial', handleTutorialReplay);
  }, [navigate]);

  // 뷰포트 높이 변화(주소창·리사이즈)에 맞춰 --home-vh 동기화 (전체 페이지)
  useEffect(() => {
    const setHomeVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--home-vh', `${h * 0.01}px`);
    };
    setHomeVh();
    window.addEventListener('resize', setHomeVh);
    window.visualViewport?.addEventListener('resize', setHomeVh);
    window.visualViewport?.addEventListener('scroll', setHomeVh);
    return () => {
      window.removeEventListener('resize', setHomeVh);
      window.visualViewport?.removeEventListener('resize', setHomeVh);
      window.visualViewport?.removeEventListener('scroll', setHomeVh);
      document.documentElement.style.removeProperty('--home-vh');
    };
  }, []);

  // body 스크롤·오버스크롤 차단 (전체 페이지)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  return (
    <>
      <GlobalNav
        onOpenSettings={() => setShowSettings(true)}
        onOpenAuth={() => setShowAuth(true)}
        t={t}
        params={params}
        setParams={setParams}
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} t={t} />}
      {showSettings && (
        <GlobalSettingsModal
          onClose={() => setShowSettings(false)}
          t={t}
          params={params}
          setParams={setParams}
        />
      )}

      <Routes>
        <Route path="/" element={<Home t={t} lang={params.lang} />} />
        <Route path="/quiz" element={<Quiz t={t} params={params} />} />
        <Route path="/note" element={<Note t={t} />} />
        <Route path="/pattern" element={<Pattern t={t} />} />
        <Route path="/result" element={<Result t={t} />} />
        <Route path="/minigame" element={<MiniGame />} />
        <Route path="/play" element={<Quiz t={t} params={params} />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;