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
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      setIsLoggedIn(false);
      setIsAdmin(false);
      navigate('/');
    }
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
