import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

// Import all components
import Chat from './Chat';
import AdminDashboard from './AdminDashboard';
import Login from './Login';
import AdminLogin from './AdminLogin';
import RoleSelection from './RoleSelection';
import './App.css';

// Inner component to handle logic
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, []);

  const handleLogin = (adminStatus) => {
    setIsLoggedIn(true);
    setIsAdmin(adminStatus);

    // Redirect logic
    if (adminStatus) {
      navigate('/admin');
    } else {
      navigate('/chat');
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setShowLogoutConfirm(false);
    navigate('/');
  };

  return (
    <>
      {isLoggedIn && (
        <nav className="app-nav">
          {isAdmin && (
            <>
              <Link to="/chat">Chat</Link>
              <Link to="/admin">Admin Dashboard</Link>
            </>
          )}
          <a href="/" onClick={handleLogout} className="logout-btn">Logout</a>
        </nav>
      )}

      {showLogoutConfirm && (
        <div
          className="sc-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogoutConfirm(false);
          }}
        >
          <section
            className="sc-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <div className="sc-modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M10 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20H10M14 16l4-4-4-4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="sc-modal-copy">
              <span className="sc-modal-eyebrow">SAFECHAT ACCOUNT</span>
              <h2 id="logout-dialog-title">Ready to sign out?</h2>
              <p id="logout-dialog-description">You’ll be signed out of this device. You can log back in whenever you’re ready.</p>
            </div>
            <div className="sc-modal-actions">
              <button type="button" className="sc-modal-cancel" onClick={() => setShowLogoutConfirm(false)}>Stay signed in</button>
              <button type="button" className="sc-modal-confirm" onClick={confirmLogout}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20H10M14 16l4-4-4-4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      <Routes>
        {!isLoggedIn ? (
          <>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/admin-login" element={<AdminLogin onLoginSuccess={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/chat" />} />
            <Route path="*" element={<Navigate to={isAdmin ? '/admin' : '/chat'} />} />
          </>
        )}
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
