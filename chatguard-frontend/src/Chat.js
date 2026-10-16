import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { io } from 'socket.io-client';
import { API_BASE_URL } from './config';

// Helper to get theme from storage
const getInitialTheme = () => localStorage.getItem('theme') || 'light';

function Chat() {
  const [currentMessage, setCurrentMessage] = useState('');
  const [allMessages, setAllMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatWith, setChatWith] = useState(null);
  
  // UI States
  const [theme, setTheme] = useState(getInitialTheme);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile responsiveness
  const [connectionState, setConnectionState] = useState('connecting');
  const [chatNotice, setChatNotice] = useState('');
  const [parentLinkCode, setParentLinkCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('safechat-notifications') === 'true');
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const [generatingLinkCode, setGeneratingLinkCode] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);
  const socketRef = useRef(null);
  const chatWithRef = useRef(null);
  const inputRef = useRef(null);

  const myUsername = localStorage.getItem('username');
  const myMobileNumber = localStorage.getItem('mobileNumber');
  chatWithRef.current = chatWith;
  notificationsEnabledRef.current = notificationsEnabled;

  useEffect(() => {
    localStorage.setItem('safechat-notifications', String(notificationsEnabled));
  }, [notificationsEnabled]);

  // --- THEME HANDLING ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- SOCKET SETUP ---
  useEffect(() => {
    // Connect with username query param
    socketRef.current = io(API_BASE_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      setConnectionState('connected');
      setChatNotice('');
    });
    socketRef.current.on('disconnect', () => setConnectionState('disconnected'));
    socketRef.current.on('connect_error', (error) => {
      setConnectionState('disconnected');
      setChatNotice(error.message || 'Could not connect to SafeChat. Check your connection.');
      console.error('SafeChat connection failed:', error.message);
    });

    socketRef.current.on('chatError', ({ message }) => {
      setChatNotice(message || 'Chat action failed. Please try again.');
    });

    socketRef.current.on('moderationUnavailable', ({ message }) => {
      setChatNotice(message || 'AI moderation is temporarily unavailable.');
    });

    socketRef.current.on('updateUserList', (users) => {
      const otherUsers = users.filter(user => user !== myUsername);
      setOnlineUsers(otherUsers);
    });

    socketRef.current.on('privateHistoryLoaded', ({ withUser, messages }) => {
      setAllMessages(prev => ({ ...prev, [withUser]: messages }));
    });

    socketRef.current.on('privateMessage', (message) => {
      const chatPartner = message.from === myUsername ? message.to : message.from;
      setAllMessages(prev => {
        const existing = prev[chatPartner] || [];
        if (message.id && existing.some(item => item.id === message.id)) return prev;
        return { ...prev, [chatPartner]: [...existing, message] };
      });
      if (message.from !== myUsername && notificationsEnabledRef.current && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`New message from ${message.from}`, { body: 'Open SafeChat to view your message.', tag: `safechat-${message.from}` });
        notification.onclick = () => { window.focus(); notification.close(); };
      }
      // Stop typing indicator if message received
      if (message.from === chatWithRef.current) setIsTyping(false);
    });

    // Typing event
    socketRef.current.on('userTyping', ({ from, isTyping }) => {
      if (from === chatWithRef.current) {
        setIsTyping(isTyping);
      }
    });

    // Blocked message event
    socketRef.current.on('messageBlocked', (blockedMessage) => {
      const activeChat = chatWithRef.current;
      if (!activeChat) return;
      setAllMessages(prev => ({
        ...prev,
        [activeChat]: [
          ...(prev[activeChat] || []),
          { ...blockedMessage, sender: 'system', timestamp: new Date().toISOString() }
        ]
      }));
    });

    // System notification event
    socketRef.current.on('systemNotification', (notification) => {
       const activeChat = chatWithRef.current;
       if (!activeChat) return;
       setAllMessages(prev => ({
        ...prev,
        [activeChat]: [
          ...(prev[activeChat] || []),
          { ...notification, sender: 'system-info', timestamp: new Date().toISOString() }
        ]
      }));
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketRef.current?.disconnect();
    };
  }, [myUsername]);


  // --- SCROLL & SEARCH ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll on new message
  useEffect(() => {
    scrollToBottom();
  }, [allMessages, chatWith, isTyping]);

  // Handle scroll visibility
  const handleScroll = () => {
    if (chatWindowRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatWindowRef.current;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
    }
  };

  // Handle User Search
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
  };


  // --- USER INTERACTION ---
  const handleUserClick = (user) => {
    setChatWith(user);
    setMessageSearch('');
    setChatNotice('');
    setIsTyping(false);
    socketRef.current?.emit('loadPrivateHistory', { user2: user });
    
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    
    // Auto-focus input
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const handleNotificationPreference = async (enabled) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }
    if (!('Notification' in window)) {
      setChatNotice('This browser does not support desktop notifications.');
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      setChatNotice('Desktop notifications enabled.');
    } else {
      setNotificationsEnabled(false);
      setChatNotice('Browser notification permission was not granted.');
    }
  };

  const generateParentLinkCode = async () => {
    setGeneratingLinkCode(true);
    setParentLinkCode('');
    setChatNotice('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/parent-link-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not create a parent link code.');
      setParentLinkCode(data.code);
    } catch (error) {
      setChatNotice(error.message || 'Could not create a parent link code.');
    } finally {
      setGeneratingLinkCode(false);
    }
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);

    if (chatWith) {
      socketRef.current?.emit('typing', { to: chatWith, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', { to: chatWith, isTyping: false });
      }, 2000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (currentMessage.trim() === '' || !chatWith) return;

    const newMessage = {
      id: `${socketRef.current.id}-${Date.now()}`,
      text: currentMessage,
      from: myUsername,
      to: chatWith,
      mobileNumber: myMobileNumber,
      timestamp: new Date().toISOString()
    };

    setChatNotice('');
    socketRef.current?.emit('privateMessage', newMessage);
    socketRef.current?.emit('typing', { to: chatWith, isTyping: false }); // Stop typing immediately
    setCurrentMessage('');
  };

  const copyMessage = async (text) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
      await navigator.clipboard.writeText(text);
      setChatNotice('Message copied to clipboard.');
    } catch {
      setChatNotice('Could not copy this message. Check browser clipboard permissions.');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentChatMessages = allMessages[chatWith] || [];
  const filteredChatMessages = currentChatMessages.filter((message) => !messageSearch.trim() || String(message.text || '').toLowerCase().includes(messageSearch.trim().toLowerCase()));
  const filteredUsers = onlineUsers.filter((user) => user.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  return (
    <div className="chatguard-app-layout">
      {settingsOpen && (
        <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
            <div className="settings-profile-avatar">{(myUsername || 'S').charAt(0).toUpperCase()}</div>
            <span className="settings-eyebrow">YOUR ACCOUNT</span>
            <h2 id="settings-title">Profile & settings</h2>
            <p className="settings-description">Manage your local SafeChat preferences.</p>
            <div className="settings-account-row"><span>Username</span><strong>{myUsername || 'Student'}</strong></div>
            <div className="settings-account-row"><span>Parent contact</span><strong>{myMobileNumber || 'Not available'}</strong></div>
            <div className="settings-preference">
              <span><strong>Desktop notifications</strong><small>Show new-message alerts while SafeChat is in the background.</small></span>
              <input type="checkbox" checked={notificationsEnabled} onChange={(event) => handleNotificationPreference(event.target.checked)} aria-label="Enable desktop notifications" />
            </div>
            <div className="settings-preference">
              <span><strong>Dark theme</strong><small>Use a darker appearance on this device.</small></span>
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} aria-label="Enable dark theme" />
            </div>
            <p className="settings-footnote">Preferences are stored on this device. Browser notifications require your permission.</p>
          </section>
        </div>
      )}
      {/* SIDEBAR */}
      <div className={`online-users-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">✓</div>
            <div><strong>SafeChat</strong><small>Safer conversations</small></div>
          </div>
          <div className="sidebar-top">
            <h3>Messages</h3>
            <div className="sidebar-header-actions">
              <button type="button" onClick={() => setSettingsOpen(true)} className="icon-btn" title="Profile and settings" aria-label="Open profile and settings">⚙</button>
              <button type="button" onClick={toggleTheme} className="icon-btn theme-btn" title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
          
          {/* SEARCH BAR */}
          <input 
            type="text" 
            placeholder="Search students..." 
            className="search-bar" 
            value={searchTerm}
            onChange={handleSearch}
            aria-label="Search online students"
          />
          <button type="button" className="parent-link-trigger" onClick={generateParentLinkCode} disabled={generatingLinkCode}>
            {generatingLinkCode ? 'Creating code…' : '＋ Link a parent'}
          </button>
          {parentLinkCode && <div className="parent-link-code-panel" role="status">
            <strong>Parent link code</strong>
            <code>{parentLinkCode}</code>
            <span>Share privately with your parent. Expires in 15 minutes and works once.</span>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(parentLinkCode); }}>Copy code</button>
          </div>}
        </div>
        
        <div className="users-list">
          <p className="sidebar-section-label">{searchTerm ? 'SEARCH RESULTS' : 'YOUR CONTACTS'}</p>
          {filteredUsers.length === 0 && (
            <div className="no-users">
              <div className="empty-contacts-icon">◎</div>
              <strong>{searchTerm ? 'No matches found' : 'No students online'}</strong>
              <span>{searchTerm ? 'Try a different username.' : 'When students come online, they’ll appear here.'}</span>
            </div>
          )}
          {filteredUsers.map((user) => (
            <button
              key={user}
              className={`user-button ${user === chatWith ? 'active' : ''}`}
              onClick={() => handleUserClick(user)}
            >
              <div className="avatar-circle">{user.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="username">{user}</span>
                <span className="status-text">Online</span>
                {allMessages[user]?.length > 0 && (
                  <span className="contact-preview" title={allMessages[user][allMessages[user].length - 1].text}>
                    {allMessages[user][allMessages[user].length - 1].from === myUsername ? 'You: ' : ''}
                    {allMessages[user][allMessages[user].length - 1].text}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* MAIN CHAT AREA */}
      <div className="chatguard-app">
        <header className="chatguard-header">
          {/* Mobile Menu Button */}
          <button type="button" className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label={isSidebarOpen ? "Close contacts sidebar" : "Open contacts sidebar"} aria-expanded={isSidebarOpen}>
            ☰
          </button>

          {chatWith ? (
            <div className="header-content">
              <div className="avatar-circle header-avatar">{chatWith.charAt(0).toUpperCase()}</div>
              <div className="header-text">
                <h1 className="header-title">{chatWith}</h1>
                <p className="header-subtitle">
                  {isTyping ? <span className="typing-text">Typing...</span> : 'Active now'}
                </p>
              </div>
            </div>
          ) : (
            <div className="header-content">
              <div className="header-brand-mark" aria-hidden="true">✓</div>
              <div className="header-text"><h1 className="header-title">SafeChat</h1><p className={`header-subtitle connection-${connectionState}`} role="status">{connectionState === 'connected' ? 'Connected securely' : connectionState === 'connecting' ? 'Connecting securely…' : 'Connection interrupted · Reconnecting…'}</p></div>
            </div>
          )}
        </header>

        {chatNotice && <div className="chat-notice" role="status"><span>{chatNotice}</span><button type="button" onClick={() => setChatNotice('')} aria-label="Dismiss notification">×</button></div>}
        {chatWith && (
          <div className="conversation-tools">
            <label className="conversation-search-label" htmlFor="conversation-search">Search loaded messages</label>
            <input id="conversation-search" type="search" value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Find a loaded message…" className="conversation-search" />
            {messageSearch && <span className="conversation-search-count">{filteredChatMessages.length} match{filteredChatMessages.length === 1 ? '' : 'es'}</span>}
          </div>
        )}
        <div 
          className="chat-window" 
          ref={chatWindowRef} 
          onScroll={handleScroll}
        >
          {!chatWith ? (
            <div className="welcome-placeholder">
              <div className="placeholder-icon">👋</div>
              <span className="welcome-eyebrow">WELCOME TO SAFECHAT</span>
              <h2>Good conversations start here, {myUsername}.</h2>
              <p>Select a student from your contacts to start a secure, real-time conversation.</p>
              <div className="welcome-points"><span>✓ Private conversations</span><span>✓ AI-powered safety checks</span></div>
            </div>
          ) : (
            <div className="message-list">
              {messageSearch && filteredChatMessages.length === 0 && (
                <div className="message-search-empty" role="status">No loaded messages match “{messageSearch}”.</div>
              )}
              {filteredChatMessages.map((msg, idx) => {
                // System Messages
                if (msg.sender === 'system' || msg.sender === 'system-info') {
                  return (
                    <div key={msg.id || idx} className="message-wrapper system-message-wrapper">
                      <div className="message-content">
                        <div className={`message-bubble ${msg.sender === 'system' ? 'system-message' : 'system-info-message'}`}>
                          <p className="message-text">{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // User Messages
                const isMyMessage = msg.from === myUsername;
                
                // Check for consecutive messages (for grouping styling if desired later)
                // const isSequence = idx > 0 && currentChatMessages[idx-1].from === msg.from;

                return (
                  <div key={msg.id || idx} className={`message-wrapper ${isMyMessage ? 'my-message-wrapper' : 'other-message-wrapper'}`}>
                    <div className="message-content">
                      {/* Flagged Message Handling */}
                      <div className={`message-bubble ${msg.isFlagged ? 'flagged-message' : ''}`}>
                        <p className="message-text">{msg.text}</p>
                        {msg.isFlagged && <span className="flag-warning">⚠️ AI Flagged</span>}
                        
                        <div className="message-meta">
                          <span>{formatTime(msg.timestamp)}</span>
                          {msg.moderationStatus === 'unavailable' && <span className="moderation-unavailable" title="AI moderation could not classify this message">Safety check unavailable</span>}
                          {msg.isFlagged && <span className="moderation-status-label">Flagged for review</span>}
                          {isMyMessage && <span className="read-receipt" aria-label="Saved by server" title="Sent">✓</span>}
                          <button type="button" className="message-copy-btn" onClick={() => copyMessage(msg.text || '')} aria-label="Copy message" title="Copy message">Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing Bubble */}
              {isTyping && (
                <div className="message-wrapper other-message-wrapper">
                   <div className="typing-indicator">
                     <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                   </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to Bottom Button */}
          {showScrollBtn && (
            <button type="button" className="scroll-bottom-btn" onClick={scrollToBottom} aria-label="Scroll to latest messages">
              ↓
            </button>
          )}

          <form className="message-input-form" onSubmit={handleSubmit}>
            {/* Placeholder buttons for future features */}
            <button type="button" className="icon-btn attachment-btn" title="File attachments are coming soon" aria-label="File attachments coming soon" disabled>📎</button>
            
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={handleInputChange}
              placeholder={chatWith ? `Message ${chatWith}...` : 'Select a user to chat'}
              className="message-input-field"
              disabled={!chatWith}
            />
            
            <button type="button" className="icon-btn emoji-btn" title="Emoji picker coming soon" aria-label="Emoji picker coming soon" disabled>😊</button>
            
            <button type="submit" className="send-button" disabled={!chatWith || !currentMessage.trim() || connectionState !== 'connected'}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;