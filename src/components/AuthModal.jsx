import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; 

export function AuthModal({ onClose, t }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState({ text: '', success: false });
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage({ text: '', success: false });

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        setMessage({ text: '로그인 성공! 환영합니다.', success: true });
        setTimeout(() => { onClose(); }, 1000);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname } }
        });
        if (error) throw error;

        setMessage({ text: '가입 성공! 메일함을 확인해주세요.', success: true });
      }
    } catch (err) {
      setMessage({ text: err.message, success: false });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { queryParams: { access_type: 'offline', prompt: 'consent' } }
    });
    if (error) alert("구글 로그인 실패: " + error.message);
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" style={{ width: '420px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>로그인</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>회원가입</button>
        </div>

        <form className="auth-form" onSubmit={handleAuth}>
          <h2 className="modal-header">{tab === 'login' ? '🐥 로그인' : '🐣 회원가입'}</h2>
          
          <input 
            type="email" className="setting-input" placeholder="이메일 주소" 
            value={email} onChange={e => setEmail(e.target.value)} 
            style={{ width: '100%', marginBottom: '12px' }} required 
          />
          <input 
            type="password" className="setting-input" placeholder="비밀번호" 
            value={password} onChange={e => setPassword(e.target.value)} 
            style={{ width: '100%', marginBottom: '16px' }} required 
          />
          
          {tab === 'register' && (
            <input 
              type="text" className="setting-input" placeholder="닉네임" 
              value={nickname} onChange={e => setNickname(e.target.value)} 
              style={{ width: '100%', marginBottom: '16px' }} required 
            />
          )}

          <button className="clay-submit" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? '처리 중...' : tab === 'login' ? '로그인' : '가입하기'}
          </button>
          
          {message.text && (
            <p className="auth-msg" style={{ color: message.success ? '#2e7d32' : '#c62828', marginTop: '10px' }}>
              {message.text}
            </p>
          )}
        </form>

        <div style={{ margin: '20px 0', color: '#8d6e63', fontSize: '14px' }}>또는</div>

        <button onClick={handleGoogleLogin} className="chapter-item" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="Google" />
          구글 계정으로 시작하기
        </button>
      </div>
    </div>
  );
}