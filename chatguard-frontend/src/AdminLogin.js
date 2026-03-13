import React, { useState } from 'react';
import './AdminLogin.css'; // Uses the red-themed CSS
import { useNavigate } from 'react-router-dom';

function AdminLogin({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false); // Toggle
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // --- SCENARIO 1: PARENT/ADMIN REGISTRATION ---
    if (isRegister) {
      try {
        const response = await fetch('http://localhost:4000/api/register-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileNumber, password })
        });
        const data = await response.text();
        if (!response.ok) {
          setError(data); // e.g., "Mobile number already registered"
        } else {
          setSuccess('Registration successful! Please login.');
          setIsRegister(false); // Switch to login form
          setMobileNumber('');
          setPassword('');
        }
      } catch (err) {
        setError('Network error. Is the server running?');
      }
      return; // Stop here
    }

    // --- SCENARIO 2: PARENT/ADMIN LOGIN ---
    try {
      const response = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send mobileNumber for our "smart" login route
        body: JSON.stringify({ mobileNumber, password })
      });

      const data = await response.text();
      if (!response.ok) {
        setError(data); // e.g., "Admin/Parent account not found"
        return;
      }

      const jsonData = JSON.parse(data);

      // Check if the server confirmed this is an admin
      if (!jsonData.isAdmin) {
        setError('Login failed. This portal is for admins only.');
        return;
      }
      
      // Save all data
      localStorage.setItem('token', jsonData.token);
      localStorage.setItem('mobileNumber', jsonData.mobileNumber); // <-- KEY for dashboard
      localStorage.setItem('isAdmin', jsonData.isAdmin);
      
      onLoginSuccess(jsonData.isAdmin); // Tell App.js to redirect

    } catch (err) {
      setError('Network error. Is the server running?');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper">
        <header className="login-header admin-header-theme">
          <h1>ChatGuard</h1>
          <p>{isRegister ? 'Admin/Parent Registration' : 'Admin Portal Login'}</p>
        </header>
        
        <form className="login-form" onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label htmlFor="mobileNumber">Mobile Number</label>
            <input
              id="mobileNumber"
              type="text"
              placeholder="Your login ID"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          
          <button type="submit" className="login-button admin-button-theme">
            {isRegister ? 'Register Account' : 'Login'}
          </button>
          
          <p className="toggle-form" onClick={() => setIsRegister(!isRegister)}>
            {isRegister
              ? 'Already have an account? Login'
              : "New Admin/Parent? Register here"}
          </p>
          
          <p className="toggle-form" onClick={() => navigate('/')}>
            ← Back to Role Selection
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;