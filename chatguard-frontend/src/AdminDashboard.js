import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from './config';
import './AdminDashboard.css';

function AdminDashboard() {
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const token = localStorage.getItem('token');
  const myMobileNumber = localStorage.getItem('mobileNumber');

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data.message || 'Could not load alerts');
        if (active) {
          setFlaggedMessages(Array.isArray(data) ? data : []);
          setLoadError('');
        }
      } catch (error) {
        if (active) setLoadError(error.message || 'Could not load alerts');
      }
    }

    loadAlerts();
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('adminNotification', (alert) => {
      if (!active) return;
      setFlaggedMessages((previous) => {
        if (previous.some((item) => item.id === alert.id)) return previous;
        return [alert, ...previous];
      });
    });

    socket.on('connect_error', (error) => {
      if (active) setLoadError(error.message || 'Could not connect to alert service');
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [token]);

  const handleDismiss = (id) => {
    setFlaggedMessages((previous) => previous.filter((message) => message.id !== id));
  };

  const filteredMessages = flaggedMessages.filter((message) =>
    filter === 'all' ? true : message.type === filter
  );

  return (
    <div className="admin-dashboard-container">
      <header className="admin-header">
        <div className="header-content">
          <h1>🛡️ Parent Dashboard</h1>
          <p>Monitoring Account: <strong>{myMobileNumber}</strong></p>
        </div>
        <div className="header-stats">
          <span>Total Alerts: {flaggedMessages.length}</span>
        </div>
      </header>

      <div className="dashboard-controls">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Alerts</button>
        <button className={`filter-btn sent ${filter === 'sent' ? 'active' : ''}`} onClick={() => setFilter('sent')}>Sent (Toxic)</button>
        <button className={`filter-btn received ${filter === 'received' ? 'active' : ''}`} onClick={() => setFilter('received')}>Received (Toxic)</button>
      </div>

      {loadError && <p className="error-message" role="alert">{loadError}</p>}

      <div className="message-feed">
        {filteredMessages.length === 0 && (
          <div className="no-messages">
            <div className="icon">✅</div>
            <h3>All Clear</h3>
            <p>No {filter === 'all' ? '' : filter} flagged messages found.</p>
          </div>
        )}

        {filteredMessages.map((message) => (
          <div key={message.id} className={`flagged-message-card ${message.type}`}>
            <div className="card-header">
              <span className={`status-badge ${message.type}`}>
                {message.type === 'received' ? '⚠️ Received' : '🚫 Sent'}
              </span>
              <span className="timestamp">{new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div className="card-body">
              <p className="message-label">Content:</p>
              <p className="message-text">"{message.message}"</p>
            </div>
            <div className="card-footer">
              <div className="user-info">
                <span>Student involved: <strong>{message.sender}</strong></span>
                {message.recipient && <span>Recipient: <strong>{message.recipient}</strong></span>}
              </div>
              <button className="dismiss-btn" onClick={() => handleDismiss(message.id)} title="Dismiss alert">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
