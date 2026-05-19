// GlobalNav.jsx - 앱 전체의 네비게이션바, 배경음악, 프로필 설정을 총괄하는 멀티 컴포넌트

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { savePreferences } from '../state/i18n';
import { settingsButtonRef } from '../state/tutorial-refs';

export function GlobalNav({ onOpenSettings, onOpenAuth, t, params, setParams }) {
  // --- [1. 상태 관리 정의] ---
  const [menuOpen, setMenuOpen] = useState(false);             // 모바일/반응형 사이드 메뉴 열림 여부
  const [user, setUser] = useState(null);                     // Supabase에서 받아온 현재 로그인 유저 세션 정보
  const [profile, setProfile] = useState(null);               // 유저의 메타데이터 (닉네임, 프로필 이미지 등)
  const [showProfileMenu, setShowProfileMenu] = useState(false); // 미니 프로필 팝업 메뉴 토글 상태
  const [editMode, setEditMode] = useState(false);             // 닉네임 수정 모드 활성화 여부
  const [newName, setNewName] = useState('');                 // 수정할 새 닉네임 입력값 저장 상태

  // --- [2. Ref(참조값) 정의] ---
  const navRef = useRef(null);          // 네비게이션 외부 클릭 감지를 위한 DOM 참조 변수
  const settingsBtnRef = useRef(null);  // 설정 버튼 DOM 참조 변수 (튜토리얼 코치마크용)
  const location = useLocation();        // 현재 브라우저의 URL 주소 경로 감지 훅
  const bgmRef = useRef(null);          // 오디오 재생기(Audio 객체) 인스턴스를 유지하기 위한 Ref
  const userStartedRef = useRef(false);  // 사용자가 브라우저에서 첫 상호작용(클릭 등)을 시작했는지 여부 기록

  // --- [3. 튜토리얼 참조 연동] ---
  // 렌더링될 때마다 전역 튜토리얼 참조 변수에 현재 설정 버튼의 DOM 엘리먼트를 동기화
  useEffect(() => {
    settingsButtonRef.current = settingsBtnRef.current;
    return () => {
      settingsButtonRef.current = null; // 컴포넌트 소멸(unmount) 시 전역 참조 해제
    };
  });

  // --- [4. 파라미터 안전 가드 선언] ---
  // params가 비어있거나 null일 경우를 대비해 기본값(BGM 켬, 오두막 트랙)을 보장하는 안전 장치
  const safeParams = {
    ...params,
    bgm: params?.bgm ?? true,
    bgmTrack: params?.bgmTrack ?? 'cabin',
  };

  // 파라미터 업데이트 및 로컬 저장소(다국어 등) 동시 반영 유틸리티 함수
  const updateParams = (next) => {
    setParams(next);
    savePreferences(next);
  };

  // --- [5. 🎵 배경음악(BGM) 자동 제어 오케스트레이션] ---
  useEffect(() => {
    // 오디오 객체가 아직 없다면 단 한 번만 새롭게 생성 및 기본 볼륨 세팅
    if (!bgmRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0.4;
      bgmRef.current = audio;
    }

    const audio = bgmRef.current;
    // 사용자가 설정한 값에 따라 오두막(cabin) 혹은 픽셀(pixel) MP3 음원 파일 경로 매핑
    const track = safeParams.bgmTrack === 'pixel' ? 'pixel' : 'cabin';
    const src = track === 'pixel' ? '/audio/bgm/BGM픽셀로파이st.mp3' : '/audio/bgm/BGM오두막st.mp3';
    const desiredHref = new URL(src, window.location.origin).href;

    // 현재 재생하려는 소스 주소와 오디오 객체에 설정된 주소가 다를 때만 새로 로드 (중복 로딩 방지)
    if (audio.src !== desiredHref) {
      audio.src = desiredHref;
      audio.loop = true;
      audio.volume = 0.4;
      audio.load(); // 새로운 음원 로딩
    }

    // [예외 가드] 만약 현재 페이지가 미니게임('/minigame')이라면 BGM을 강제 일시정지 후 탈출
    if (location.pathname === '/minigame') {
      audio.pause();
      return;
    }

    // 전역 설정 상 BGM이 ON 상태이면 재생 시작, OFF 상태이면 일시정지
    if (safeParams.bgm) audio.play().catch(() => {}); // 브라우저 자동재생 제한 에러 우회 처리
    else audio.pause();
  }, [safeParams.bgm, safeParams.bgmTrack, location.pathname]); // BGM 켬/끔, 트랙 종류, 주소창 경로가 바뀔 때마다 실행

  // --- [6. 🔐 Supabase 로그인 세션 동기화 및 라이프사이클 관리] ---
  useEffect(() => {
    // 앱이 처음 켜질 때 현재 로그인된 유저 세션이 있는지 즉시 단발성 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(); // 유저가 존재하면 상세 프로필 로드
    });

    // 사용자의 인증 상태(로그인, 로그아웃, 비밀번호 변경 등)가 변하는 것을 상시 감시하는 이벤트 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(); // 상태가 '로그인'으로 바뀌면 프로필 갱신
      else setProfile(null);            // 상태가 '로그아웃'이면 프로필 상태 초기화
    });

    return () => subscription.unsubscribe(); // 컴포넌트가 사라질 때 감시 리스너 제거 (메모리 누수 차단)
  }, []);

  // --- [7. 데이터베이스/인증 서버 연동 CRUD 비즈니스 로직 함수군] ---
  
  // 로그인한 사용자의 정보를 토대로 상단바에 출력할 닉네임과 아바타 이미지를 세팅하는 함수
  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setProfile({
        username: user.user_metadata?.username || user.email?.split('@')[0], // 닉네임이 없으면 이메일 앞자리 사용
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }
  }

  // 로그아웃 버튼을 눌렀을 때 Supabase 서버 세션을 해제하고 미니 팝업 메뉴를 닫는 함수
  async function handleLogout() {
    await supabase.auth.signOut();
    setShowProfileMenu(false);
  }

  // 사용자가 프로필 창에서 새로운 이름을 입력하고 저장했을 때 Supabase Auth 유저 정보를 업데이트하는 함수
  async function handleNameUpdate() {
    if (!newName.trim()) return; // 공백 입력 차단
    const { error } = await supabase.auth.updateUser({
      data: { username: newName } // 유저 메타데이터의 username 필드 교체
    });
    if (!error) {
      setProfile(prev => ({ ...prev, username: newName })); // 로컬 화면 상태 즉시 동기화
      setEditMode(false);                                   // 수정 모드 종료
      setNewName('');                                       // 인풋창 초기화
    }
  }

  // 사용자가 새로운 프로필 사진을 선택하면 Supabase Storage 서비스 서버로 파일을 실시간 업로드하는 함수
  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop(); // 파일 확장자 추출 (.png, .jpg 등)
    const filePath = `${user.id}/avatar.${fileExt}`; // 사용자 고유 ID별 단독 파일 경로 지정

    // 'avatars'라는 스토리지 버킷 공간에 파일 업로드 처리 (기존 파일이 있으면 upsert 옵션으로 덮어쓰기)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      // 업로드가 완료되면 해당 파일의 외부 접속용 공개 주소(Public URL)를 획득
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 획득한 공개 주소를 회원 계정 정보의 프로필 사진 주소(`avatar_url`) 정보로 최종 매핑 업데이트
      await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl }
      });
      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl })); // 화면 UI 이미지 즉시 교체
    }
  }

  // --- [8. UI 예외 제어 - 네비게이션 외부 영역 클릭 시 메뉴 자동 닫기] ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      // 현재 켜진 네비게이션 영역 밖의 엉뚱한 마탕화면을 클릭했을 때만 닫히도록 마킹
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // --- [9. 화면 렌더링(JSX Output) 영역] ---
  return (
    <>
      {/* 햄버거 메뉴 버튼 (모바일 화면 등에서 ☰ 메뉴를 토글하는 버튼) */}
      <button
        id="globalMenuBtn"
        className="global-menu-btn"
        title="Menu"
        onClick={(e) => {
          e.stopPropagation(); // 외부 클릭 감지 이벤트와 엉켜서 바로 닫히는 현상 차단
          setMenuOpen(!menuOpen);
        }}
        style={{ display: 'block' }}
      >
        ☰
      </button>

      {/* 실질적인 네비게이션 링크 컨테이너 메뉴바 */}
      <nav className={`main-nav ${menuOpen ? 'show' : ''}`} id="globalNav" ref={navRef}>
        <div className="nav-logo">
          {/* 로고 클릭 시 홈 화면으로 부드럽게 라우팅 이동 */}
          <Link style={{ color: 'inherit', textDecoration: 'none' }} to="/">{t('nav_logo')}</Link>
        </div>
        {/* 서비스 기능별 각 페이지 이동 경로 가이드 링크 모음 리스트 */}
        <ul className="nav-links">
          <li><Link to="/">{t('nav_home')}</Link></li>
          <li><Link to="/quiz">{t('btn_quiz')}</Link></li>
          <li><Link to="/note">{t('nav_note')}</Link></li>
          <li><Link to="/pattern">{t('nav_pattern') || "패턴분석"}</Link></li>
          <li><Link to="/minigame">{t('nav_minigame')}</Link></li>
          <li>
            {/* 환경설정은 페이지 이동이 아니라 모달 팝업창을 여는 이벤트 핸들러(`onOpenSettings`) 배치 */}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onOpenSettings(); }}
              style={{ cursor: 'pointer' }}
            >
              {t('btn_setting')}
            </a>
          </li>
        </ul>
      </nav>

      {/* --- [10. 오직 홈 화면('/')에서만 단독 노출되는 우측 상단 특수 제어 레이어] --- */}
      {location.pathname === '/' && (
        <div className="top-control-layer">
          <div className="top-right-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            
            {/* 내부 특수 효과 스타일시트 삽입 (LP판 스핀 애니메이션 및 마우스 호버 효과 정밀 정의) */}
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .home-top-actions { display: flex; justify-content: flex-end; }
              .home-settings-wrap { display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto; column-gap: 8px; row-gap: 2px; align-items: center; }
              .home-settings-btn { grid-column: 1; grid-row: 1; align-self: center; }
              .home-login-action { grid-column: 2; grid-row: 1; align-self: center; flex-shrink: 0; }
              .home-settings-label { grid-column: 1; grid-row: 2; justify-self: center; margin-top: -2px; }
              .home-settings-btn { display: block; background: none !important; border: none !important; box-shadow: none !important; width: auto !important; height: auto !important; padding: 0 !important; line-height: 0; cursor: pointer; }
              .home-settings-btn:hover, .home-settings-btn:active { transform: none !important; }
              .home-settings-label { font-family: 'Jua', sans-serif; font-size: 15px; font-weight: 700; color: #3e2723; text-shadow: 0 1px 0 rgba(255, 248, 216, 0.8); pointer-events: none; white-space: nowrap; line-height: 1; margin: 0; }
              .home-settings-wrap:hover .home-settings-label { text-shadow: 0 0 8px rgba(255, 220, 100, 0.95), 0 0 16px rgba(255, 193, 7, 0.5), 0 1px 0 rgba(255, 248, 216, 0.8); }
              .home-settings-wrap:active .home-settings-label { text-shadow: 0 0 10px rgba(255, 235, 140, 1), 0 0 20px rgba(255, 200, 60, 0.85), 0 1px 0 rgba(255, 248, 216, 0.8); }
              .home-settings-img { width: 96px; height: auto; max-height: 96px; object-fit: contain; object-position: center bottom; mix-blend-mode: multiply; transition: transform 0.25s ease, filter 0.25s ease; display: block; margin: 18px 0 -2px 0; vertical-align: bottom; }
              .home-settings-wrap:hover .home-settings-img { filter: drop-shadow(0 0 6px rgba(255, 235, 130, 1)) drop-shadow(0 0 14px rgba(255, 210, 70, 0.9)) drop-shadow(0 0 26px rgba(255, 193, 7, 0.55)); }
              .home-settings-wrap:active .home-settings-img { transform: scale(1.08); filter: drop-shadow(0 0 8px rgba(255, 245, 170, 1)) drop-shadow(0 0 18px rgba(255, 220, 90, 1)) drop-shadow(0 0 34px rgba(255, 193, 7, 0.8)); }
            `}</style>

            <div className="home-top-actions">
              <div className="home-settings-wrap">
                {/* 톱니바퀴 대신 귀여운 병아리집 모양의 대형 환경설정 바로가기 아이콘 버튼 */}
                <button
                  ref={settingsBtnRef}
                  id="globalSettingsBtn"
                  className="settings-btn home-settings-btn"
                  title={t('btn_setting')}
                  onClick={onOpenSettings}
                >
                  <img src="/images/home_settings.png" alt="" className="home-settings-img" />
                </button>

              {/* [조건부 렌더링 A : 유저가 로그인 상태일 때 - 마이프로필 영역 출력] */}
              {user ? (
                <div className="home-login-action" style={{ position: 'relative' }}>
                  {/* 동그란 프로필 사진 및 유저 네임 바 */}
                  <div
                    onClick={() => setShowProfileMenu(!showProfileMenu)} // 클릭 시 하단 미니 회원메뉴 토글
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', background: 'rgba(255,248,216,0.9)',
                      border: '3px solid #5d4037', borderRadius: 40,
                      padding: '6px 14px', boxShadow: '0 4px 0 #3e2723',
                    }}
                  >
                    <img
                      src={profile?.avatar_url || '/images/chick.png'} // 설정된 아바타 사진이 없으면 기본 대피용 병아리 이미지 출력
                      alt="프로필"
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #5d4037' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#5d4037' }}>
                      {profile?.username || user.email?.split('@')[0] || '삐약이'}
                    </span>
                  </div>

                  {/* 미니 프로필 관리 팝업 레이어 박스 (토글 노출) */}
                  {showProfileMenu && (
                    <div style={{
                      position: 'absolute', right: 0, top: 50,
                      background: '#fdf6e3', border: '3px solid #5d4037',
                      borderRadius: 16, padding: 20, width: 220,
                      boxShadow: '6px 6px 0 #3e2723', zIndex: 9999,
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <img
                          src={profile?.avatar_url || '/images/chick.png'}
                          alt="프로필"
                          style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: '3px solid #5d4037' }}
                        />
                      </div>

                      {/* 이름 수정 활성화 시 인풋 필드로 가변 교체 */}
                      {editMode ? (
                        <div style={{ marginBottom: 12 }}>
                          <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="새 이름 입력"
                            style={{
                              width: '100%', padding: '6px 10px', borderRadius: 8,
                              border: '2px solid #8d6e63', marginBottom: 6, fontSize: 13,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleNameUpdate} style={{ flex: 1, padding: '6px', borderRadius: 8, background: '#5d4037', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>저장</button>
                            <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '6px', borderRadius: 8, background: '#e0d0b0', color: '#5d4037', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>취소</button>
                          </div>
                        </div>
                      ) : (
                        // 평소엔 이름 변경 토글 스위치 노출
                        <button
                          onClick={() => { setEditMode(true); setNewName(profile?.username || ''); }}
                          style={{ width: '100%', padding: '8px', borderRadius: 8, marginBottom: 8, background: '#fdf6e3', border: '2px solid #8d6e63', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', color: '#5d4037' }}
                        >✏️ 이름 변경</button>
                      )}

                      {/* 회원 세션 파괴 로그아웃 실행 버튼 */}
                      <button
                        onClick={handleLogout}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#ef9a9a', border: '2px solid #c62828', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', color: '#c62828' }}
                      >🚪 로그아웃</button>
                    </div>
                  )}
                </div>
              ) : (
                /* [조건부 렌더링 B : 유저가 비로그인(게스트) 상태일 때 - 로그인 안내 유도 바 출력] */
                <div
                  className="home-login-action"
                  onClick={onOpenAuth} // 로그인 입력 폼 모달 활성화 트리거 실행
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', background: 'rgba(255,248,216,0.9)',
                    border: '3px solid #5d4037', borderRadius: 40,
                    padding: '6px 14px', boxShadow: '0 4px 0 #3e2723',
                  }}
                >
                  <img src="/images/chick.png" alt="게스트" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #5d4037' }} />
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#5d4037' }}>{t('btn_login')}</span>
                </div>
              )}

                <span className="home-settings-label">{t('btn_setting')}</span>
              </div>
            </div>

            {/* BGM 재생 상태 연동 회전 LP판 컨트롤 기믹 인터페이스 디스플레이 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <img
                id="homeBgmBtn"
                src="/images/LP.png"
                alt="BGM"
                width={80}
                height={80}
                onClick={() => {
                  // 첫 클릭 시 음원 차단 락 해제를 유도하고 BGM을 강제 작동 세팅하는 가드
                  if (!userStartedRef.current) {
                    userStartedRef.current = true;
                    updateParams({ ...safeParams, bgm: true });
                    return;
                  }
                  // 토글 클릭 시 BGM 활성화/비활성화 스위치 상태 대칭 반전 처리
                  updateParams({ ...safeParams, bgm: !safeParams.bgm });
                }}
                style={{
                  width: 80, height: 80, cursor: 'pointer',
                  animation: 'spin 2s linear infinite', // 일정한 속도로 무한 회전
                  animationPlayState: safeParams.bgm ? 'running' : 'paused', // 음악이 나오면 돌고 꺼지면 멈춤 정지
                }}
              />
              {/* 현재 재생하고 있는 사운드 트랙 앨범 태그 안내 명칭 출력 */}
              <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}>
                {`🎵 ${safeParams.bgmTrack === 'pixel' ? t('bgm_pixel') : t('bgm_cabin')}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}