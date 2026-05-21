// GlobalSettingsModal.jsx - 테마, 언어, BGM, AI 캐릭터 및 튜토리얼을 제어하는 전역 환경설정 팝업창

import { useEffect, useState } from 'react';

export function GlobalSettingsModal({ onClose, t, params, setParams }) {
  // --- [1. 파라미터 안전 가드 선언] ---
  // 부모 컴포넌트로부터 배달된 params가 비어있거나 특정 속성이 누락되었을 때를 대비해
  // 앱이 터지지 않도록 기본값(BGM 켬, 오두막 트랙, 기본 튜터 성격)을 확실하게 채워넣는 방어 코드입니다.
  const safeParams = {
    ...params,
    bgm: params?.bgm ?? true,
    bgmTrack: params?.bgmTrack ?? 'cabin',
    persona: params?.persona ?? 'default',
  };

  // --- [2. 상태 관리 정의] ---
  // 사용자가 '튜토리얼(가이드라인)을 다시 보지 않겠다'고 체크했는지 여부를 관리하는 로컬 상태
  const [dontShowTutorial, setDontShowTutorial] = useState(false);

  // --- [3. 초기화 라이프사이클 - 로컬 스토리지 데이터 동기화] ---
  useEffect(() => {
    try {
      // 브라우저의 내부 저장소(localStorage)에서 기존 튜토리얼 시청 기록 키값을 긁어옵니다.
      const seenRaw = window.localStorage.getItem('chickode_tutorial_seen');
      // 저장된 값이 문자열 'true'이거나 숫자 '1'이면 이미 가이드를 본 것으로 간주합니다.
      const seen = seenRaw === 'true' || seenRaw === '1';
      setDontShowTutorial(seen); // 확인된 결과로 체크박스 상태를 동기화
    } catch {
      // 로컬 스토리지 접근 오류(보안 제한 등) 발생 시 대피용 기본값 세팅
      setDontShowTutorial(false);
    }
  }, []); // 컴포넌트가 처음 화면에 띄워질 때 단 한 번만 실행

  // --- [4. 튜토리얼 설정 변경 처리 함수] ---
  // 사용자가 '가이드 숨기기' 체크박스를 누르거나 해제할 때 실행되는 함수
  const applyTutorialPref = (checked) => {
    setDontShowTutorial(checked); // 화면 UI 체크박스 상태 변경
    try {
      // 체크(true)했다면 브라우저 저장소에 기록을 남겨서 가이드가 안 나오게 막고,
      // 체크를 해제(false)했다면 브라우저 저장소에서 기록을 지워 가이드가 다시 나오게 유도합니다.
      if (checked) window.localStorage.setItem('chickode_tutorial_seen', 'true');
      else window.localStorage.removeItem('chickode_tutorial_seen');
    } catch {
      // noop: 에러 발생 시 아무것도 하지 않고 조용히 넘김 (오류 방지)
    }
  };

  // --- [5. 설정창 닫기 이벤트 핸들러] ---
  const handleSave = () => {
    onClose(); // 부모 컴포넌트가 내려준 모달 닫기 기능 실행
  };

  // --- [6. 화면 렌더링(JSX Output) 영역] ---
  return (
    // 모달창 뒷배경 (어두운 투명 레이어)
    <div className="modal-overlay" style={{ display: 'flex' }}>
      {/* 실질적인 흰색 모달 박스 콘텐츠 컨테이너 */}
      <div
        className="modal-content"
        style={{ width: '500px', maxHeight: '90vh', overflow: 'hidden', textAlign: 'center' }}
      >
        {/* 우측 상단 모달 닫기 엑스(&times;) 버튼 */}
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        {/* 다국어 설정값(lang)이 영어('en') 모드이면 'Global settings', 아니면 한글로 '설정' 출력 */}
        <h2 className="modal-header">{safeParams.lang === 'en' ? 'Global settings' : '설정'}</h2>
        
        {/* 환경설정 항목들을 정렬하기 위한 2열(Grid) 격자 형태의 폼 레이아웃 */}
        <div
          className="setting-form"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr', // 1대1 비율로 좌우 분할
            gap: '16px',
            marginTop: '30px',
          }}
        >
          {/* --- 항목 A: 테마 설정 (라이트/다크) --- */}
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_theme')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.theme}
              // 사용자가 고른 테마(Light/Dark)를 기존 파라미터에 얹어서 전역 상태 업데이트
              onChange={(e) => setParams({ ...safeParams, theme: e.target.value })}
            >
              <option value="light">{t('theme_light')}</option>
              <option value="dark">{t('theme_dark')}</option>
            </select>
          </div>

          {/* --- 항목 B: 다국어 설정 (한국어/English) --- */}
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_language')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.lang}
              // 사용자가 언어를 바꾸면 즉시 앱 전반의 번역 키셋(t)이 해당 언어로 실시간 교체됩니다.
              onChange={(e) => setParams({ ...safeParams, lang: e.target.value })}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* --- 항목 C: 배경음악 재생 온/오프 스위치 --- */}
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>BGM</label>
            <button
              type="button"
              // 버튼 클릭 시 재생 상태를 반전(ON <-> OFF)하여 GlobalNav의 오디오 재생기에 신호를 줍니다.
              onClick={() => setParams({ ...safeParams, bgm: !safeParams.bgm })}
              style={{
                width: '80%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.15)',
                // BGM이 켜져 있으면 초록색(#2e7d32), 꺼져 있으면 회색(#9e9e9e)으로 유동적 시각 효과 부여
                background: safeParams.bgm ? '#2e7d32' : '#9e9e9e',
                color: '#fff',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {safeParams.bgm ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* --- 항목 D: 사운드 트랙 테마 고르기 --- */}
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_bgm_track')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.bgmTrack}
              // [핵심 가드] 만약 위에 있는 BGM 스위치가 OFF(false)라면 이 트랙 선택창은 자동으로 잠깁니다(disabled).
              disabled={!safeParams.bgm}
              onChange={(e) => setParams({ ...safeParams, bgmTrack: e.target.value })}
            >
              <option value="cabin">{t('bgm_cabin')}</option>
              <option value="pixel">{t('bgm_pixel')}</option>
            </select>
          </div>

          {/* --- 항목 E: AI 튜터 성격(페르소나) 원격 제어 --- */}
          <div className="setting-group" style={{ alignItems: 'center' }}>
            <label style={{ fontSize: '13px', margin: 0 }}>{t('setting_persona')}</label>
            <select
              className="setting-select"
              style={{ width: '80%' }}
              value={safeParams.persona}
              // 여기서 변경한 캐릭터 세팅값은 Quiz.jsx에서 프롬프트 명령어를 조립할 때 반영됩니다.
              onChange={(e) => setParams({ ...safeParams, persona: e.target.value })}
            >
              <option value="default">{t('persona_default')} 🐥</option>
              <option value="racer">{t('persona_racer')} 🏍</option>
              <option value="prof">{t('persona_prof')} 🎓</option>
              <option value="church">{t('persona_church')} ✝</option>
            </select>
          </div>

          {/* 하단 통합 변경사항 저장 및 확인 버튼 (그리드 좌우칸을 통째로 차지) */}
          <button className="clay-submit" onClick={handleSave} style={{ gridColumn: '1 / -1' }}>
            {t('btn_save')}
          </button>

          {/* --- 하단 서브 섹션: 튜토리얼 시스템 핸들링 하위 레이어 --- */}
          <div style={{ gridColumn: '1 / -1', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
            
            {/* 체크박스형: 가이드라인 다시 보지 않기 토글 */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                gap: 8,
                fontSize: 13,
                color: '#5c3d2e',
                userSelect: 'none', // 더블클릭 시 텍스트 블록 지정 방지
              }}
            >
              <input
                type="checkbox"
                checked={dontShowTutorial}
                onChange={(e) => applyTutorialPref(e.target.checked)} // 체크 변경 시 로컬 스토리지 즉시 제어
              />
              {t('setting_tutorial_hide')}
            </label>

            {/* 버튼형: 튜토리얼 즉시 강제 처음부터 재생하기 기믹 버튼 */}
            <button
              type="button"
              onClick={() => {
                try {
                  // 1. 강제 가동을 위해 브라우저의 기존 시청 완료 기록을 지워버립니다.
                  window.localStorage.removeItem('chickode_tutorial_seen');
                } catch {
                  // noop
                }
                
                // 2. 일단 현재 보고 있는 환경설정 창을 닫아줍니다.
                onClose();
                
                // 3. 브라우저의 비동기 타이머 시스템을 빌려 팝업이 완벽히 닫힌 직후 이벤트를 트리거합니다.
                window.setTimeout(() => {
                  try {
                    // [이벤트 공중 전파] 관제탑인 App.jsx가 귀를 기울이고 있는 'chickode:start_tutorial' 전역 이벤트를 공중에 발사합니다.
                    // 이 리스너를 수신한 App.jsx는 유저를 무조건 로비('/')로 강제 압송한 후 가이드 코치마크를 실행합니다.
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
                background: '#5c3d2e', // 갈색 계열 테마 컬러 지정
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