import { useEffect, useState } from 'react';

export function GlobalSettingsModal({ onClose, t, params, setParams }) {
  const safeParams = {
    ...params,
    bgm: params?.bgm ?? true,
    bgmTrack: params?.bgmTrack ?? 'cabin',
    persona: params?.persona ?? 'default',
  };

  const [dontShowTutorial, setDontShowTutorial] = useState(true);

  useEffect(() => {
    try {
      const seenRaw = window.localStorage.getItem('chickode_tutorial_seen');
      const seen = seenRaw === 'true' || seenRaw === '1';
      setDontShowTutorial(seen);
    } catch {
      setDontShowTutorial(true);
    }
  }, []);

  const applyTutorialPref = (checked) => {
    setDontShowTutorial(checked);
    try {
      if (checked) window.localStorage.setItem('chickode_tutorial_seen', 'true');
      else window.localStorage.removeItem('chickode_tutorial_seen');
    } catch {
      // noop
    }
  };

  const handleSave = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div
        className="modal-content"
        style={{ width: '500px', maxHeight: '90vh', overflow: 'hidden', textAlign: 'center' }}
      >
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 className="modal-header">{safeParams.lang === 'en' ? 'Global settings' : '설정'}</h2>
        <div
          className="setting-form"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '30px',
          }}
        >
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_theme')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.theme}
              onChange={(e) => setParams({ ...safeParams, theme: e.target.value })}
            >
              <option value="light">{t('theme_light')}</option>
              <option value="dark">{t('theme_dark')}</option>
            </select>
          </div>
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_language')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.lang}
              onChange={(e) => setParams({ ...safeParams, lang: e.target.value })}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>BGM</label>
            <button
              type="button"
              onClick={() => setParams({ ...safeParams, bgm: !safeParams.bgm })}
              style={{
                width: '80%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.15)',
                background: safeParams.bgm ? '#2e7d32' : '#9e9e9e',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {safeParams.bgm ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_bgm_track')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.bgmTrack}
              disabled={!safeParams.bgm}
              onChange={(e) => setParams({ ...safeParams, bgmTrack: e.target.value })}
            >
              <option value="cabin">{t('bgm_cabin')}</option>
              <option value="pixel">{t('bgm_pixel')}</option>
            </select>
          </div>

          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_persona')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.persona}
              onChange={(e) => setParams({ ...safeParams, persona: e.target.value })}
            >
              <option value="default">{t('persona_default')} 🐥</option>
              <option value="racer">{t('persona_racer')} 🏍</option>
              <option value="prof">{t('persona_prof')} 🎓</option>
              <option value="church">{t('persona_church')} ✝</option>
            </select>
          </div>

          <button className="clay-submit" onClick={handleSave} style={{ gridColumn: '1 / -1' }}>
            {t('btn_save')}
          </button>

          <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13,
                color: '#5c3d2e',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={dontShowTutorial}
                onChange={(e) => applyTutorialPref(e.target.checked)}
              />
              {t('setting_tutorial_hide')}
            </label>

            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem('chickode_tutorial_seen');
                } catch {
                  // noop
                }
                onClose();
                // Home.jsx에서 이벤트를 받아 코치마크를 다시 시작함
                window.setTimeout(() => {
                  try {
                    window.dispatchEvent(new Event('chickode:start_tutorial'));
                  } catch {
                    // noop
                  }
                }, 0);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.15)',
                background: '#5c3d2e',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {t('setting_tutorial_show')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
