import React, { useState } from 'react';
import { API_BASE_URL } from './config';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ message: '', type: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice({ message: '', type: '' });
    try {
      const endpoint = isRegister ? '/api/register-student' : '/api/login';
      const payload = isRegister
        ? { username: username.trim(), name: name.trim(), mobileNumber: mobileNumber.trim(), password }
        : { username: username.trim(), password };
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ message: data.message || 'We could not complete that request. Please try again.', type: 'error' });
        return;
      }
      if (isRegister) {
        setNotice({ message: 'Your account is ready. Sign in to continue.', type: 'success' });
        setIsRegister(false);
        setPassword('');
        setName('');
        setMobileNumber('');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('mobileNumber', data.mobileNumber);
      localStorage.setItem('isAdmin', String(data.isAdmin));
      onLoginSuccess(Boolean(data.isAdmin));
    } catch {
      setNotice({ message: 'Could not reach SafeChat. Check your connection and try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story auth-story-student">
        <a className="auth-brand" href="/" aria-label="SafeChat home">
          <span className="auth-brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4.7 11.4-11 14C9.7 26.4 5 22 5 15V7l11-4Z" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="m11 16 3.2 3.2L21.5 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <span>safechat<span className="auth-brand-period">.</span></span>
        </a>
        <div className="auth-story-copy">
          <span className="auth-eyebrow"><span className="auth-live-dot" /> A safer space to connect</span>
          <h1>Your voice<br />belongs here.</h1>
          <p>Real conversations. More kindness. A little more care in every message.</p>
          <div className="auth-visual" aria-hidden="true">
            <div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" />
            <div className="auth-glass-card auth-glass-main"><span className="auth-chat-symbol">✳</span><div><strong>Kindness is a superpower.</strong><small>Make it part of every conversation.</small></div><span className="auth-heart">♡</span></div>
            <div className="auth-glass-card auth-glass-note"><span className="auth-note-icon">✓</span><div><strong>You're in a safe space</strong><small>Thoughtful by design</small></div></div>
            <span className="auth-spark auth-spark-a">✳</span><span className="auth-spark auth-spark-b">✦</span>
          </div>
        </div>
        <div className="auth-story-footer"><span>Built for better conversations.</span><span>Privacy · Respect · Safety</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><span className="auth-brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4.7 11.4-11 14C9.7 26.4 5 22 5 15V7l11-4Z" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="m11 16 3.2 3.2L21.5 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>safechat<span className="auth-brand-period">.</span></div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <span className="auth-step-label">{isRegister ? 'CREATE YOUR SPACE' : 'WELCOME BACK'}</span>
            <h2>{isRegister ? 'Let’s get you started.' : 'Good to see you.'}</h2>
            <p>{isRegister ? 'A few details and you’re ready to join the conversation.' : 'Sign in to pick up where your conversations left off.'}</p>
          </div>
          <div className="auth-mode-switch" role="group" aria-label="Account action">
            <button type="button" className={!isRegister ? 'active' : ''} onClick={() => { setIsRegister(false); setNotice({ message: '', type: '' }); }} disabled={loading}>Sign in</button>
            <button type="button" className={isRegister ? 'active' : ''} onClick={() => { setIsRegister(true); setNotice({ message: '', type: '' }); }} disabled={loading}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && <div className="auth-field"><label htmlFor="student-name">Your full name</label><input id="student-name" type="text" placeholder="e.g. Aanya Sharma" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={100} required disabled={loading} /></div>}
            <div className="auth-field"><label htmlFor="student-username">Username</label><input id="student-username" type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" minLength={3} maxLength={30} required disabled={loading} /></div>
            {isRegister && <div className="auth-field"><label htmlFor="parent-mobile">Parent contact number (optional)</label><input id="parent-mobile" type="tel" placeholder="Optional parent contact number" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} autoComplete="tel" disabled={loading} /><span className="auth-field-hint">This is only a contact detail. To connect accounts, your parent uses the one-time code in SafeChat and may use a different mobile number.</span></div>}
            <div className="auth-field"><div className="auth-label-row"><label htmlFor="student-password">Password</label><span className="auth-inline-note">{isRegister ? '8+ characters' : 'Keep it private'}</span></div><input id="student-password" type="password" placeholder={isRegister ? 'Create a strong password' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required disabled={loading} /></div>
            {notice.message && <div className={`auth-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'error' ? '!' : '✓'} <span>{notice.message}</span></div>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? <><span className="auth-spinner" /> Please wait…</> : <>{isRegister ? 'Create student account' : 'Sign in to SafeChat'} <span aria-hidden="true">↗</span></>}</button>
          </form>
          <div className="auth-divider"><span>OR</span></div>
          <a className="auth-alternate-link" href="/admin-login"><span className="auth-alternate-icon">⌂</span><span><strong>Are you a parent?</strong><small>Go to the parent safety portal</small></span><span className="auth-link-arrow">→</span></a>
          <p className="auth-legal">By continuing, you agree to use SafeChat with respect and care.</p>
        </div>
        <footer className="auth-panel-footer"><span>© {new Date().getFullYear()} SafeChat</span><span><span className="auth-footer-dot" /> Your wellbeing matters</span></footer>
      </section>
    </main>
  );
}

export default Login;
