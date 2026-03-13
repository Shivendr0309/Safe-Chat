import React, { useState } from 'react';
import './Login.css';

// Simple Toast Notification Component (Internal)
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div className={`toast-notification ${type}`}>
      <span>{message}</span>
      <button onClick={onClose} className="toast-close">×</button>
    </div>
  );
};

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading spinner

    // --- SCENARIO 1: STUDENT REGISTRATION ---
    if (isRegister) {
      try {
        const response = await fetch('http://https://chatguard-backend.onrender.com/api/register-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, name, mobileNumber, password })
        });
        const data = await response.text();
        
        if (!response.ok) {
          showToast(data, 'error');
        } else {
          showToast('Registration successful! Please login.', 'success');
          setIsRegister(false); // Switch to login view
          // Clear form
          setUsername('');
          setPassword('');
          setName('');
          setMobileNumber('');
        }
      } catch (err) {
        showToast('Network error. Is server running?', 'error');
      } finally {
        setLoading(false); // Stop loading
      }
      return;
    }

    // --- SCENARIO 2: STUDENT LOGIN ---
    try {
      const response = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }) 
      });

      const data = await response.text();
      
      if (!response.ok) {
        showToast(data, 'error');
      } else {
        const jsonData = JSON.parse(data);
        // Save session data
        localStorage.setItem('token', jsonData.token);
        localStorage.setItem('username', jsonData.username);
        localStorage.setItem('mobileNumber', jsonData.mobileNumber);
        localStorage.setItem('isAdmin', jsonData.isAdmin);
        
        onLoginSuccess(jsonData.isAdmin); // Redirect
      }
    } catch (err) {
      showToast('Network error. Is server running?', 'error');
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="login-page-container">
      {/* Toast Notification Container */}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: '' })} 
      />

      <div className="login-form-wrapper">
        <header className="login-header">
          <h1>ChatGuard</h1>
          <p>{isRegister ? 'Student Registration' : 'Student Login'}</p>
        </header>
        
        <form className="login-form" onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label htmlFor="username">Student Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isRegister && (
            <>
              <div className="input-group">
                <label htmlFor="name">Student's Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label htmlFor="mobileNumber">Parent's Mobile Number</label>
                <input
                  id="mobileNumber"
                  type="text"
                  placeholder="Links to parent account"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? <span className="spinner"></span> : (isRegister ? 'Register Account' : 'Login')}
          </button>
          
          <p className="toggle-form" onClick={() => !loading && setIsRegister(!isRegister)}>
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;