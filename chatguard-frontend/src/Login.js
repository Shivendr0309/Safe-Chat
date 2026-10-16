import React, { useState } from 'react';
import { API_BASE_URL } from './config';
import './Login.css';

function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast-notification ${type}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="toast-close" aria-label="Close notification">×</button>
    </div>
  );
}

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type) => setToast({ message, type });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setToast({ message: '', type: '' });

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
        showToast(data.message || 'Request failed. Please try again.', 'error');
        return;
      }

      if (isRegister) {
        showToast('Registration successful. Please log in.', 'success');
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
      showToast('Could not reach Safe-Chat. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <div className="login-form-wrapper">
        <header className="login-header">
          <h1>ChatGuard</h1>
          <p>{isRegister ? 'Student Registration' : 'Student Login'}</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Student Username</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" minLength={3} maxLength={30} required disabled={loading} />
          </div>
          {isRegister && (
            <>
              <div className="input-group">
                <label htmlFor="name">Student's Full Name</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} required disabled={loading} />
              </div>
              <div className="input-group">
                <label htmlFor="mobileNumber">Parent's Mobile Number</label>
                <input id="mobileNumber" type="tel" placeholder="Links to parent account" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} autoComplete="tel" required disabled={loading} />
              </div>
            </>
          )}
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required disabled={loading} />
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Register Account' : 'Login'}
          </button>
          <button type="button" className="toggle-form" disabled={loading} onClick={() => { setIsRegister((value) => !value); setToast({ message: '', type: '' }); }}>
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
