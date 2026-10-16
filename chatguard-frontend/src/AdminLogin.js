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
        setError(data.message || 'Request failed. Please try again.');
        return;
      }

      if (isRegister) {
        setSuccess('Parent account registered. Please log in.');
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
      setError('Could not reach Safe-Chat. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper">
        <header className="login-header admin-header-theme">
          <h1>ChatGuard</h1>
          <p>{isRegister ? 'Parent Registration' : 'Parent Portal Login'}</p>
        </header>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="mobileNumber">Mobile Number</label>
            <input id="mobileNumber" type="tel" placeholder="Your login ID" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} autoComplete="tel" required disabled={loading} />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required disabled={loading} />
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          {success && <p className="success-message" role="status">{success}</p>}
          <button type="submit" className="login-button admin-button-theme" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Register Account' : 'Login'}
          </button>
          <button type="button" className="toggle-form" disabled={loading} onClick={() => { setIsRegister((value) => !value); setError(''); setSuccess(''); }}>
            {isRegister ? 'Already have an account? Login' : 'New parent? Register here'}
          </button>
          <button type="button" className="toggle-form" onClick={() => navigate('/')}>← Back to Role Selection</button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
