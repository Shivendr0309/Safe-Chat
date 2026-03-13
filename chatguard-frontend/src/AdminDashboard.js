import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './AdminDashboard.css';

const socket = io('http://localhost:4000');

function AdminDashboard() {
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'sent', 'received'
  const myMobileNumber = localStorage.getItem('mobileNumber');

  useEffect(() => {
    socket.on('adminNotification', (flaggedMessage) => {
      console.log('Admin received new flagged message:', flaggedMessage);
      if (flaggedMessage.mobileNumber === myMobileNumber) {
        setFlaggedMessages((prev) => [flaggedMessage, ...prev]);
      }
    });
    return () => { socket.off('adminNotification'); };
  }, [myMobileNumber]);

  // Dismiss handler (Locally removes from view)
  const handleDismiss = (indexToRemove) => {
    setFlaggedMessages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Filter logic
  const filteredMessages = flaggedMessages.filter(msg => {
    if (filter === 'all') return true;
    return msg.type === filter;
  });

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

      {/* Filter Controls */}
      <div className="dashboard-controls">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
          onClick={() => setFilter('all')}
        >
          All Alerts
        </button>
        <button 
          className={`filter-btn sent ${filter === 'sent' ? 'active' : ''}`} 
          onClick={() => setFilter('sent')}
        >
          Sent (Toxic)
        </button>
        <button 
          className={`filter-btn received ${filter === 'received' ? 'active' : ''}`} 
          onClick={() => setFilter('received')}
        >
          Received (Toxic)
        </button>
      </div>

      <div className="message-feed">
        {filteredMessages.length === 0 && (
          <div className="no-messages">
            <div className="icon">✅</div>
            <h3>All Clear</h3>
            <p>No {filter === 'all' ? '' : filter} flagged messages found.</p>
          </div>
        )}

        {filteredMessages.map((msg, index) => (
          <div key={index} className={`flagged-message-card ${msg.type}`}>
            <div className="card-header">
              <span className={`status-badge ${msg.type}`}>
                {msg.type === 'received' ? '⚠️ Received' : '🚫 Sent'}
              </span>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleString()}
              </span>
            </div>
            
            <div className="card-body">
              <p className="message-label">Content:</p>
              <p className="message-text">"{msg.message}"</p>
            </div>
            
            <div className="card-footer">
              <div className="user-info">
                <span>Student Involved: <strong>{msg.sender}</strong></span>
              </div>
              <button 
                className="dismiss-btn"
                onClick={() => handleDismiss(index)}
                title="Dismiss Alert"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;