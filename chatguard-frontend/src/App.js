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
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.clear();
      setIsLoggedIn(false);
      setIsAdmin(false);
      navigate('/'); // Send back to Role Selection
    }
  };

  return (
    <>
      {isLoggedIn && (
        <nav className="app-nav">
          {/* OPTION 3: Only show navigation links for Admin */}
          
          {/* If Admin, show link to Chat (to test it) and Dashboard */}
          {isAdmin && (
            <>
              <Link to="/chat">Chat</Link>
              <Link to="/admin">Admin Dashboard</Link>
            </>
          )}

          {/* If Student, they see NO navigation links (just Logout) 
              because they are already on the only page available to them. */}
          
          <a href="/" onClick={handleLogout} className="logout-btn">Logout</a>
        </nav>
      )}

      {/* --- ROUTES --- */}
      <Routes>
        {!isLoggedIn ? (
          // --- If NOT Logged In ---
          <>
            <Route path="/" element={<RoleSelection />} /> 
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/admin-login" element={<AdminLogin onLoginSuccess={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          // --- If Logged In ---
          <>
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/chat" />} />
            <Route path="*" element={<Navigate to={isAdmin ? "/admin" : "/chat"} />} />
          </>
        )}
      </Routes>
    </>
  );
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;