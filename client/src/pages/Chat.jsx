import { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';
import api from '../utils/api';
import NewConversationModal from '../components/NewConversationModal';

// ─── Avatar component ─────────────────────────────────────────────────────────
const Avatar = ({ name, size = 36 }) => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: colors[index],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: '700', fontSize: size * 0.4,
      flexShrink: 0, letterSpacing: '-0.5px',
    }}>
      {name ? name[0].toUpperCase() : '?'}
    </div>
  );
};

// ─── Format timestamp ─────────────────────────────────────────────────────────
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { weekday: 'short' }) + ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Main Chat component ──────────────────────────────────────────────────────
function Chat() {
  const [conversations, setConversations]           = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages]                     = useState([]);
  const [newMessage, setNewMessage]                 = useState('');
  const [loading, setLoading]                       = useState(false);
  const [sidebarOpen, setSidebarOpen]               = useState(true);
  const [showNewConvModal, setShowNewConvModal]     = useState(false);
  const [typingUsers, setTypingUsers]               = useState([]);

  const user             = JSON.parse(localStorage.getItem('user'));
  const socketRef        = useSocket(); // returns the REF not the value
  const messagesEndRef   = useRef(null);
  const inputRef         = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConvRef    = useRef(null); // track active conversation in real time

  // Keep activeConvRef in sync with activeConversation state
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // ─── Load conversations on mount ──────────────────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, []);

 

useEffect(() => {
    // Wait for socket to be ready then attach listeners
    const attachListeners = () => {
      const socket = socketRef.current;
      if (!socket) return;

      // Remove any existing listeners first to prevent duplicates
      socket.off('newMessage');
      socket.off('userTyping');
      socket.off('userStoppedTyping');

      // New message from server
      socket.on('newMessage', (message) => {
        setMessages((prev) => [...prev, message]);
      });

      // Someone started typing
      socket.on('userTyping', ({ userId }) => {
        console.log('Received typing from:', userId);
        setTypingUsers((prev) => {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        });
      });

      // Someone stopped typing
      socket.on('userStoppedTyping', ({ userId }) => {
        setTypingUsers((prev) => prev.filter((id) => id !== userId));
      });
    };

    // Try immediately
    attachListeners();

    // Also attach when socket connects (handles async connection)
    const socket = socketRef.current;
    if (socket) {
      socket.on('connect', attachListeners);
    }

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.off('newMessage');
        socket.off('userTyping');
        socket.off('userStoppedTyping');
        socket.off('connect', attachListeners);
      }
    };
  }, [socketRef]);








  // ─── Auto scroll to bottom on new message ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Fetch all conversations for this user ────────────────────────────────
  const fetchConversations = async () => {
    try {
      const res = await api.get('/api/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // ─── Open a conversation — join socket room + load history ────────────────
  const openConversation = async (conv) => {
    setActiveConversation(conv);
    setMessages([]);
    setTypingUsers([]);
    setLoading(true);

    // Use socketRef.current so we always get the latest socket
    const socket = socketRef.current;
    if (socket) {
      socket.emit('joinRoom', conv._id);
      console.log('Joined room:', conv._id);
    } else {
      console.log('Socket not ready yet');
    }

    try {
      const res = await api.get(`/api/conversations/${conv._id}/messages`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ─── Send a message ───────────────────────────────────────────────────────
  const sendMessage = () => {
    const text = newMessage.trim();
    const socket = socketRef.current;
    if (!text || !activeConversation || !socket) return;

    socket.emit('sendMessage', {
      conversationId: activeConversation._id,
      text,
    });

    // Stop typing indicator when message is sent
    socket.emit('stopTyping', activeConversation._id);
    clearTimeout(typingTimeoutRef.current);

    setNewMessage('');
    inputRef.current?.focus();
  };

  // ─── Handle input change + emit typing events ─────────────────────────────
  const handleChange = (e) => {
    setNewMessage(e.target.value);

    const socket = socketRef.current;
    if (!socket || !activeConvRef.current) return;

    // Tell server this user is typing
    socket.emit('typing', activeConvRef.current._id);

    // Clear previous timeout and reset
    clearTimeout(typingTimeoutRef.current);

    // After 2 seconds of no typing — emit stopTyping
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', activeConvRef.current._id);
    }, 2000);
  };

  // ─── Enter to send, Shift+Enter for new line ──────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // ─── Check if message belongs to logged in user ───────────────────────────
  const isOwnMessage = (msg) =>
    msg.senderId === user?.id || msg.senderId?._id === user?.id;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* ── NAVBAR ── */}
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={s.iconBtn}>☰</button>
          <span style={s.brand}>💬 ChatFlow</span>
        </div>
        <div style={s.navRight}>
          <Avatar name={user?.name} size={32} />
          <span style={s.navName}>{user?.name}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>Sign out</button>
        </div>
      </nav>

      <div style={s.body}>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside style={s.sidebar}>
            <div style={s.sidebarHeader}>
              <span style={s.sidebarTitle}>Messages</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={s.convCount}>{conversations.length}</span>
                <button onClick={() => setShowNewConvModal(true)} style={s.newChatBtn}>✏️</button>
              </div>
            </div>

            <div style={s.convList}>
              {conversations.length === 0 && (
                <div style={s.emptyState}>
                  <p style={s.emptyIcon}>💬</p>
                  <p style={s.emptyText}>No conversations yet</p>
                  <p style={s.emptyHint}>Click ✏️ above to start a new chat</p>
                </div>
              )}

              {conversations.map((conv) => {
                const isActive = activeConversation?._id === conv._id;
                return (
                  <div
                    key={conv._id}
                    onClick={() => openConversation(conv)}
                    style={{
                      ...s.convItem,
                      backgroundColor: isActive ? '#ede9fe' : 'transparent',
                      borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    }}
                  >
                    <Avatar name={conv.name || 'D'} size={44} />
                    <div style={s.convMeta}>
                      <span style={s.convName}>{conv.name || 'Direct Message'}</span>
                      <span style={s.convLastMsg}>{conv.lastMessage || 'No messages yet'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* ── CHAT WINDOW ── */}
        <main style={s.chatArea}>
          {!activeConversation ? (
            <div style={s.welcomeScreen}>
              <p style={s.welcomeIcon}>💬</p>
              <h2 style={s.welcomeTitle}>Welcome to ChatFlow</h2>
              <p style={s.welcomeText}>Select a conversation or start a new one</p>
              <button onClick={() => setShowNewConvModal(true)} style={s.welcomeBtn}>
                ✏️ New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* ── CHAT HEADER ── */}
              <div style={s.chatHeader}>
                <Avatar name={activeConversation.name || 'D'} size={40} />
                <div style={s.chatHeaderMeta}>
                  <span style={s.chatHeaderName}>{activeConversation.name || 'Direct Message'}</span>
                  <span style={s.chatHeaderSub}>
                    {activeConversation.participants?.length || 0} participants
                  </span>
                </div>
              </div>

              {/* ── MESSAGES ── */}
              <div style={s.messagesList}>

                {loading && (
                  <div style={s.loadingWrap}>
                    <div style={s.loadingDot} />
                    <div style={s.loadingDot} />
                    <div style={s.loadingDot} />
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div style={s.noMessages}><p>No messages yet — say hello! 👋</p></div>
                )}

                {messages.map((msg, index) => {
                  const own = isOwnMessage(msg);
                  const senderName = msg.senderId?.name || 'Unknown';
                  const prevMsg = messages[index - 1];
                  const prevSenderId = prevMsg?.senderId?._id || prevMsg?.senderId;
                  const currSenderId = msg.senderId?._id || msg.senderId;
                  const showName = !own && prevSenderId !== currSenderId;

                  return (
                    <div
                      key={msg._id}
                      style={{
                        ...s.msgRow,
                        justifyContent: own ? 'flex-end' : 'flex-start',
                        marginTop: showName ? '16px' : '4px',
                      }}
                    >
                      {!own && (
                        <div style={s.msgAvatar}>
                          {showName ? <Avatar name={senderName} size={30} /> : <div style={{ width: 30 }} />}
                        </div>
                      )}
                      <div style={{ maxWidth: '62%' }}>
                        {showName && <p style={s.senderLabel}>{senderName}</p>}
                        <div style={{
                          ...s.bubble,
                          backgroundColor: own ? '#6366f1' : '#f1f5f9',
                          color: own ? '#ffffff' : '#1e293b',
                          borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}>
                          <p style={s.bubbleText}>{msg.text}</p>
                        </div>
                        <p style={{ ...s.bubbleTime, textAlign: own ? 'right' : 'left' }}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* ── TYPING INDICATOR ── */}
                {typingUsers.length > 0 && (
                  <div style={s.typingIndicator}>
                    <div style={s.typingDots}>
                      <span style={{ ...s.dot, animationDelay: '0ms' }} />
                      <span style={{ ...s.dot, animationDelay: '150ms' }} />
                      <span style={{ ...s.dot, animationDelay: '300ms' }} />
                    </div>
                    <span style={s.typingText}>Someone is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── INPUT ── */}
              <div style={s.inputBar}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  value={newMessage}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  style={s.textarea}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  style={{
                    ...s.sendBtn,
                    backgroundColor: newMessage.trim() ? '#6366f1' : '#e2e8f0',
                    color: newMessage.trim() ? '#ffffff' : '#94a3b8',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── NEW CONVERSATION MODAL ── */}
      {showNewConvModal && (
        <NewConversationModal
          onClose={() => setShowNewConvModal(false)}
          onConversationCreated={(newConv) => {
            setConversations((prev) => [newConv, ...prev]);
            openConversation(newConv);
          }}
        />
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  navbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 20px', height: '60px', backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    zIndex: 10, flexShrink: 0,
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  brand: { fontSize: '18px', fontWeight: '700', color: '#6366f1', letterSpacing: '-0.3px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  navName: { fontSize: '14px', fontWeight: '500', color: '#475569' },
  iconBtn: {
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
    color: '#64748b', padding: '4px 8px', borderRadius: '6px', lineHeight: 1,
  },
  logoutBtn: {
    padding: '7px 14px', backgroundColor: '#fff', color: '#ef4444',
    border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px',
    fontWeight: '500', cursor: 'pointer',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: '300px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 16px 12px', borderBottom: '1px solid #f1f5f9',
  },
  sidebarTitle: { fontSize: '16px', fontWeight: '700', color: '#0f172a' },
  convCount: {
    fontSize: '12px', fontWeight: '600', color: '#6366f1',
    backgroundColor: '#ede9fe', padding: '2px 8px', borderRadius: '12px',
  },
  newChatBtn: {
    background: 'none', border: 'none', fontSize: '18px',
    cursor: 'pointer', padding: '2px', lineHeight: 1,
  },
  convList: { flex: 1, overflowY: 'auto', padding: '8px' },
  convItem: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
    borderRadius: '10px', cursor: 'pointer', marginBottom: '2px',
  },
  convMeta: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' },
  convName: { fontSize: '14px', fontWeight: '600', color: '#0f172a' },
  convLastMsg: {
    fontSize: '13px', color: '#94a3b8',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon: { fontSize: '36px', marginBottom: '12px' },
  emptyText: { fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '4px' },
  emptyHint: { fontSize: '12px', color: '#94a3b8' },
  chatArea: {
    flex: 1, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', backgroundColor: '#f8fafc',
  },
  welcomeScreen: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '12px',
  },
  welcomeIcon: { fontSize: '48px' },
  welcomeTitle: { fontSize: '20px', fontWeight: '700', color: '#475569' },
  welcomeText: { fontSize: '14px', color: '#94a3b8' },
  welcomeBtn: {
    marginTop: '8px', padding: '10px 20px', backgroundColor: '#6366f1',
    color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  chatHeader: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
    backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexShrink: 0,
  },
  chatHeaderMeta: { display: 'flex', flexDirection: 'column', gap: '2px' },
  chatHeaderName: { fontSize: '15px', fontWeight: '700', color: '#0f172a' },
  chatHeaderSub: { fontSize: '12px', color: '#94a3b8' },
  messagesList: {
    flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column',
  },
  loadingWrap: { display: 'flex', gap: '6px', justifyContent: 'center', padding: '20px' },
  loadingDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbd5e1' },
  noMessages: {
    flex: 1, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#94a3b8', fontSize: '14px',
  },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  msgAvatar: { flexShrink: 0, alignSelf: 'flex-end' },
  senderLabel: { fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', paddingLeft: '4px' },
  bubble: { padding: '10px 14px', lineHeight: '1.5', wordBreak: 'break-word' },
  bubbleText: { fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' },
  bubbleTime: { fontSize: '11px', color: '#94a3b8', marginTop: '4px', paddingLeft: '4px', paddingRight: '4px' },
  inputBar: {
    display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '14px 20px',
    backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0,
  },
  textarea: {
    flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
    fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit',
    lineHeight: '1.5', backgroundColor: '#f8fafc', color: '#0f172a',
    maxHeight: '120px', overflowY: 'auto',
  },
  sendBtn: {
    width: '42px', height: '42px', borderRadius: '12px', border: 'none',
    fontSize: '18px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  typingIndicator: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 4px', marginTop: '4px',
  },
  typingDots: { display: 'flex', gap: '4px', alignItems: 'center' },
  dot: {
    width: '6px', height: '6px', borderRadius: '50%',
    backgroundColor: '#94a3b8', display: 'inline-block',
    animation: 'bounce 1.2s ease-in-out infinite',
  },
  typingText: { fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' },
};

export default Chat;
