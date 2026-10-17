import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import './AdminLogin.css';

function AdminLogin({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/register-admin' : '/api/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobileNumber.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'We could not complete that request. Please try again.');
        return;
      }
      if (isRegister) {
        setSuccess('Parent account created. Please sign in, then connect a student from your dashboard.');
        setIsRegister(false);
        setPassword('');
        return;
      }
      if (!data.isAdmin) {
        setError('This portal is for parent accounts only.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('mobileNumber', data.mobileNumber);
      localStorage.setItem('isAdmin', 'true');
      onLoginSuccess(true);
    } catch {
      setError('Could not reach SafeChat. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page-parent">
      <section className="auth-story auth-story-parent">
        <a className="auth-brand" href="/" aria-label="SafeChat home"><span className="auth-brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4.7 11.4-11 14C9.7 26.4 5 22 5 15V7l11-4Z" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="m11 16 3.2 3.2L21.5 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>safechat<span className="auth-brand-period">.</span></span></a>
        <div className="auth-story-copy">
          <span className="auth-eyebrow"><span className="auth-live-dot" /> PARENT SAFETY PORTAL</span>
          <h1>Care that<br />stays connected.</h1>
          <p>A clearer view of your child’s digital wellbeing, with thoughtful alerts when support may be needed.</p>
          <div className="parent-preview-card"><div className="parent-preview-top"><span className="parent-preview-icon">♡</span><span className="parent-preview-status">SAFETY OVERVIEW</span><span className="parent-preview-more">···</span></div><p>Small moments matter.</p><div className="parent-preview-line"><span className="parent-preview-check">✓</span><span><strong>Stay informed</strong><small>Understand important safety alerts</small></span></div><div className="parent-preview-line"><span className="parent-preview-check">✓</span><span><strong>Respond with care</strong><small>Support healthier conversations</small></span></div><div className="parent-preview-bottom"><span>Designed for awareness, not surveillance.</span></div></div>
        </div>
        <div className="auth-story-footer"><span>Support over scrutiny.</span><span>Privacy · Care · Trust</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-brand"><span className="auth-brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4.7 11.4-11 14C9.7 26.4 5 22 5 15V7l11-4Z" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="m11 16 3.2 3.2L21.5 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>safechat<span className="auth-brand-period">.</span></div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading"><span className="auth-step-label">{isRegister ? 'JOIN THE PARENT PORTAL' : 'PARENT ACCESS'}</span><h2>{isRegister ? 'Let’s get started.' : 'Welcome back.'}</h2><p>{isRegister ? 'Create your own parent account first. You can securely connect a student after signing in.' : 'Sign in to review safety updates and support your child.'}</p></div>
          <div className="auth-mode-switch" role="group" aria-label="Account action"><button type="button" className={!isRegister ? 'active' : ''} onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }} disabled={loading}>Sign in</button><button type="button" className={isRegister ? 'active' : ''} onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }} disabled={loading}>Create account</button></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field"><label htmlFor="parent-mobile-number">{isRegister ? "Your mobile number" : "Mobile number"}</label><input id="parent-mobile-number" type="tel" placeholder={isRegister ? "Enter your own mobile number" : "Enter your registered mobile number"} value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} autoComplete="tel" required disabled={loading} /></div>
            <div className="auth-field"><div className="auth-label-row"><label htmlFor="parent-password">Password</label><span className="auth-inline-note">{isRegister ? '8+ characters' : 'Keep it private'}</span></div><input id="parent-password" type="password" placeholder={isRegister ? 'Create a strong password' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required disabled={loading} /></div>
            {error && <div className="auth-notice error" role="alert">! <span>{error}</span></div>}
            {success && <div className="auth-notice success" role="status">✓ <span>{success}</span></div>}
            <button className="auth-submit auth-submit-parent" type="submit" disabled={loading}>{loading ? <><span className="auth-spinner" /> Please wait…</> : <>{isRegister ? 'Create parent account' : 'Open safety dashboard'} <span aria-hidden="true">↗</span></>}</button>
          </form>
          {isRegister && <p className="auth-field-hint parent-registration-hint">After creating your account, sign in and use <strong>Connect a student account</strong> on your dashboard. The student’s one-time code is available in their SafeChat Settings.</p>}
          <div className="auth-divider"><span>OR</span></div>
          <button type="button" className="auth-alternate-link auth-back-link" onClick={() => navigate('/')}><span className="auth-alternate-icon">←</span><span><strong>Back to SafeChat</strong><small>Choose another way to sign in</small></span><span className="auth-link-arrow">→</span></button>
          <p className="auth-legal">Safety works best when it starts with trust and conversation.</p>
        </div>
        <footer className="auth-panel-footer"><span>© {new Date().getFullYear()} SafeChat</span><span><span className="auth-footer-dot" /> Your wellbeing matters</span></footer>
      </section>
    </main>
  );
}

export default AdminLogin;
