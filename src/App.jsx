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