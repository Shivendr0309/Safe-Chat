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

  const filteredMessages = flaggedMessages.filter((message) => {
    const matchesDirection = filter === 'all' || message.type === filter;
    const searchable = [message.message, message.sender, message.recipient].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = searchable.includes(alertSearch.trim().toLowerCase());
    const timestamp = new Date(message.timestamp);
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return matchesDirection && matchesSearch && (!start || timestamp >= start) && (!end || timestamp <= end);
  });
  const receivedCount = flaggedMessages.filter((message) => message.type === 'received').length;
  const sentCount = flaggedMessages.filter((message) => message.type === 'sent').length;

  const filters = [
    { id: 'all', label: 'All alerts', count: flaggedMessages.length },
    { id: 'sent', label: 'Sent by student', count: sentCount },
    { id: 'received', label: 'Received by student', count: receivedCount },
  ];

  return (
    <main className="admin-dashboard-container">
      <section className="admin-welcome">
        <div className="welcome-copy">
          <div className="dashboard-eyebrow"><span className="eyebrow-dot" /> FAMILY SAFETY CENTER</div>
          <h1>Parent dashboard<span>.</span></h1>
          <p>Stay informed about conversations that may need your attention.</p>
          <div className="monitoring-account">
            <span className="account-avatar" aria-hidden="true">{(myMobileNumber || 'P').slice(-1)}</span>
            <span><small>Monitoring account</small><strong>{myMobileNumber || 'Parent account'}</strong></span>
            <span className="secure-label"><span /> Protected</span>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="shield-illustration">
            <svg viewBox="0 0 64 72" role="img" aria-label=""><path d="M32 4 54 12v18c0 16-9 28-22 37C19 58 10 46 10 30V12L32 4Z" fill="currentColor" opacity=".14"/><path d="M32 8 50 15v15c0 13-7 24-18 32C21 54 14 43 14 30V15L32 8Z" fill="currentColor"/><path d="m23 34 6 6 13-14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✦</span>
          <div className="art-caption"><span className="art-caption-icon">✓</span><span><strong>Your family, in focus</strong><small>Safety insights in one place</small></span></div>
        </div>
        <div className="alerts-total"><span className="total-icon">↗</span><span><small>Total flagged alerts</small><strong>{flaggedMessages.length}</strong></span></div>
      </section>

      <section className="alerts-section">
        <div className="section-heading">
          <div><div className="dashboard-eyebrow">ACTIVITY OVERVIEW</div><h2>Conversation alerts</h2><p>Review flagged messages and their context.</p></div>
          <div className="live-indicator"><span /> Live monitoring</div>
        </div>

        <div className="alert-summary-grid">
          <div className={`summary-card ${filter === 'all' ? 'summary-selected' : ''}`}><span className="summary-icon summary-purple">◈</span><span><small>All alerts</small><strong>{flaggedMessages.length}</strong></span></div>
          <div className={`summary-card ${filter === 'sent' ? 'summary-selected' : ''}`}><span className="summary-icon summary-red">↗</span><span><small>Sent by student</small><strong>{sentCount}</strong></span></div>
          <div className={`summary-card ${filter === 'received' ? 'summary-selected' : ''}`}><span className="summary-icon summary-amber">↙</span><span><small>Received by student</small><strong>{receivedCount}</strong></span></div>
        </div>

        <div className="alert-list-heading">
          <div className="filter-tabs" role="tablist" aria-label="Filter conversation alerts">
            {filters.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id}
                className={`filter-btn ${filter === item.id ? 'active' : ''}`}
                onClick={() => setFilter(item.id)}>
                {item.label}<span>{item.count}</span>
              </button>
            ))}
          </div>
          <span className="results-count">{filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'}</span>
        </div>

        <div className="alert-search-tools">
          <label className="alert-search-label" htmlFor="alert-search">Search alerts</label>
          <input id="alert-search" type="search" value={alertSearch} onChange={(event) => setAlertSearch(event.target.value)} placeholder="Search message or username…" />
          <label htmlFor="alert-date-from">From</label>
          <input id="alert-date-from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
          <label htmlFor="alert-date-to">To</label>
          <input id="alert-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
          {(alertSearch || dateFrom || dateTo) && <button type="button" onClick={() => { setAlertSearch(''); setDateFrom(''); setDateTo(''); }}>Clear filters</button>}
        </div>

        {loadError && <p className="error-message" role="alert">{loadError}</p>}

        <div className="message-feed">
          {filteredMessages.length === 0 && (
            <div className="no-messages">
              <div className="empty-art">
                <div className="empty-halo" />
                <div className="empty-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <span className="empty-spark empty-spark-a">✦</span><span className="empty-spark empty-spark-b">✧</span>
              </div>
              <span className="empty-kicker">YOU'RE ALL CAUGHT UP</span>
              <h3>{alertSearch || dateFrom || dateTo ? 'No matching alerts' : filter === 'all' ? 'A little peace of mind.' : filter === 'sent' ? 'No sent alerts' : 'No received alerts'}</h3>
              <p>{alertSearch || dateFrom || dateTo ? 'Try changing your search or date range.' : filter === 'all' ? 'There are no flagged conversations to review right now. We’ll show new alerts here when they arrive.' : `No flagged messages ${filter === 'sent' ? 'sent by' : 'received by'} the student have been found.`}</p>
              <div className="empty-status"><span /> Monitoring is active</div>
            </div>
          )}

          {filteredMessages.map((message) => (
            <article key={message.id} className={`flagged-message-card ${message.type}`}>
              <div className="card-header">
                <span className={`status-badge ${message.type}`}><span />{message.type === 'received' ? 'Received by student' : 'Sent by student'}</span>
                <span className="timestamp">{new Date(message.timestamp).toLocaleString()}</span>
              </div>
              <div className="card-body">
                <p className="message-label">Flagged message</p>
                <p className="message-text">{message.message}</p>
              </div>
              <div className="card-footer">
                <div className="user-info">
                  <span><small>Sender</small><strong>{message.sender}</strong></span>
                  {message.recipient && <span><small>Recipient</small><strong>{message.recipient}</strong></span>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="privacy-note"><span>♧</span> Alerts are private and visible only to the linked parent account.</p>
      </section>
    </main>
  );
}

export default AdminDashboard;
