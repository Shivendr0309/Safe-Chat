import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import { io } from 'socket.io-client';

// Helper to get theme from storage
const getInitialTheme = () => localStorage.getItem('theme') || 'light';

function Chat() {
  const [currentMessage, setCurrentMessage] = useState('');
  const [allMessages, setAllMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]); // For search
  const [chatWith, setChatWith] = useState(null);
  
  // UI States
  const [theme, setTheme] = useState(getInitialTheme);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile responsiveness
  const [typingTimeout, setTypingTimeout] = useState(null);

  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);
  const socketRef = useRef(null);
  const inputRef = useRef(null);

  const myUsername = localStorage.getItem('username');
  const myMobileNumber = localStorage.getItem('mobileNumber');

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
    socketRef.current = io('http://https://chatguard-backend.onrender.com', {
      query: { username: myUsername }
    });

    socketRef.current.on('updateUserList', (users) => {
      const otherUsers = users.filter(user => user !== myUsername);
      setOnlineUsers(otherUsers);
      setFilteredUsers(otherUsers); // Initialize filtered list
    });

    socketRef.current.on('privateHistoryLoaded', ({ withUser, messages }) => {
      setAllMessages(prev => ({ ...prev, [withUser]: messages }));
    });

    socketRef.current.on('privateMessage', (message) => {
      const chatPartner = message.from === myUsername ? message.to : message.from;
      setAllMessages(prev => ({
        ...prev,
        [chatPartner]: [...(prev[chatPartner] || []), message]
      }));
      // Stop typing indicator if message received
      if (message.from === chatWith) setIsTyping(false);
    });

    // Typing event
    socketRef.current.on('userTyping', ({ from, isTyping }) => {
      if (from === chatWith) {
        setIsTyping(isTyping);
      }
    });

    // Blocked message event
    socketRef.current.on('messageBlocked', (blockedMessage) => {
      if (!chatWith) return;
      setAllMessages(prev => ({
        ...prev,
        [chatWith]: [
          ...(prev[chatWith] || []),
          { ...blockedMessage, sender: 'system', timestamp: new Date().toISOString() }
        ]
      }));
    });

    // System notification event
    socketRef.current.on('systemNotification', (notification) => {
       if (!chatWith) return;
       setAllMessages(prev => ({
        ...prev,
        [chatWith]: [
          ...(prev[chatWith] || []),
          { ...notification, sender: 'system-info', timestamp: new Date().toISOString() }
        ]
      }));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [myUsername, chatWith]);


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
    setFilteredUsers(onlineUsers.filter(user => user.toLowerCase().includes(term)));
  };


  // --- USER INTERACTION ---
  const handleUserClick = (user) => {
    setChatWith(user);
    setIsTyping(false);
    socketRef.current.emit('loadPrivateHistory', { user1: myUsername, user2: user });
    
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    
    // Auto-focus input
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);

    if (chatWith) {
      socketRef.current.emit('typing', { to: chatWith, isTyping: true });

      if (typingTimeout) clearTimeout(typingTimeout);

      const timeout = setTimeout(() => {
        socketRef.current.emit('typing', { to: chatWith, isTyping: false });
      }, 2000);
      
      setTypingTimeout(timeout);
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

    socketRef.current.emit('privateMessage', newMessage);
    socketRef.current.emit('typing', { to: chatWith, isTyping: false }); // Stop typing immediately
    setCurrentMessage('');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentChatMessages = allMessages[chatWith] || [];

  return (
    <div className="chatguard-app-layout">
      {/* SIDEBAR */}
      <div className={`online-users-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-top">
            <h3>Messages</h3>
            <button onClick={toggleTheme} className="icon-btn theme-btn" title="Toggle Theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          
          {/* SEARCH BAR */}
          <input 
            type="text" 
            placeholder="Search users..." 
            className="search-bar" 
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="users-list">
          {filteredUsers.length === 0 && (
            <p className="no-users">No users found</p>
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
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* MAIN CHAT AREA */}
      <div className="chatguard-app">
        <header className="chatguard-header">
          {/* Mobile Menu Button */}
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
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
              <h1 className="header-title">ChatGuard</h1>
            </div>
          )}
        </header>

        <div 
          className="chat-window" 
          ref={chatWindowRef} 
          onScroll={handleScroll}
        >
          {!chatWith ? (
            <div className="welcome-placeholder">
              <div className="placeholder-icon">👋</div>
              <h2>Welcome, {myUsername}!</h2>
              <p>Select a student from the sidebar to start a secure chat.</p>
            </div>
          ) : (
            <div className="message-list">
              {currentChatMessages.map((msg, idx) => {
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
                          {isMyMessage && <span className="read-receipt">✓✓</span>}
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
            <button className="scroll-bottom-btn" onClick={scrollToBottom}>
              ↓
            </button>
          )}

          <form className="message-input-form" onSubmit={handleSubmit}>
            {/* Placeholder buttons for future features */}
            <button type="button" className="icon-btn attachment-btn" title="Attach File">📎</button>
            
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={handleInputChange}
              placeholder={chatWith ? `Message ${chatWith}...` : 'Select a user to chat'}
              className="message-input-field"
              disabled={!chatWith}
            />
            
            <button type="button" className="icon-btn emoji-btn" title="Add Emoji">😊</button>
            
            <button type="submit" className="send-button" disabled={!chatWith || !currentMessage.trim()}>
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