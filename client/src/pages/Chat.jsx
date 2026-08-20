import { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';
import api from '../utils/api';


// Shows the first letter of a name as a colored circle
const Avatar = ({ name, size = 36 }) => {
  // Generate a consistent color from the name string, So the same person always gets the same color
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  const bg = colors[index];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: '700',
      fontSize: size * 0.4,
      flexShrink: 0,
      letterSpacing: '-0.5px',
    }}>
      {name ? name[0].toUpperCase() : '?'}
    </div>
  );
};

// Format timestamp
// Shows "2:39 PM" for today's messages and Shows "Mon 2:39 PM" for older messages
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { weekday: 'short' }) + ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Main Chat component 
function Chat() {
  const [conversations, setConversations]     = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages]               = useState([]);
  const [newMessage, setNewMessage]           = useState('');
  const [loading, setLoading]                 = useState(false);
  const [sidebarOpen, setSidebarOpen]         = useState(true);

  // Get logged in user from localStorage
  const user = JSON.parse(localStorage.getItem('user'));

  // Socket connection — JWT verified on the server side
  const socket = useSocket();

  // Ref to auto-scroll to latest message
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations on mount 
  useEffect(() => {
    fetchConversations();
  }, []);

  //  Listen for incoming real-time messages 
  useEffect(() => {
    if (!socket) return;

    socket.on('newMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Remove the listener when component re-renders
    // Prevents stacking duplicate listeners
    return () => socket.off('newMessage');
  }, [socket]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch all conversations for this user
  const fetchConversations = async () => {
    try {
      const res = await api.get('/api/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  //  Open a conversation — join its socket room + load history
  const openConversation = async (conv) => {
    setActiveConversation(conv);
    setMessages([]);
    setLoading(true);

    // Tell the server we are joining this conversation's room
    // So we receive real-time broadcasts for it
    if (socket) socket.emit('joinRoom', conv._id);

    try {
      const res = await api.get(`/api/conversations/${conv._id}/messages`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
      // Focus input after opening conversation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Send a message 
  const sendMessage = () => {
    const text = newMessage.trim();
    if (!text || !activeConversation || !socket) return;

    // Emit to server — server saves + broadcasts to room
    socket.emit('sendMessage', {
      conversationId: activeConversation._id,
      text,
    });

    setNewMessage('');
    inputRef.current?.focus();
  };

  // Send on Enter, new line on Shift+Enter 
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Logout — clear token and redirect
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // ─── Check if a message was sent by the logged in user ───────────────────
  const isOwnMessage = (msg) =>
    msg.senderId === user?.id || msg.senderId?._id === user?.id;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>

      {/* ══════════════════════════════════════════
          TOP NAVBAR
      ══════════════════════════════════════════ */}
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          {/* Hamburger — toggles sidebar on small screens */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={s.iconBtn}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <span style={s.brand}>💬 ChatFlow</span>
        </div>

        <div style={s.navRight}>
          <Avatar name={user?.name} size={32} />
          <span style={s.navName}>{user?.name}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════════ */}
      <div style={s.body}>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside style={s.sidebar}>
            <div style={s.sidebarHeader}>
              <span style={s.sidebarTitle}>Messages</span>
              <span style={s.convCount}>{conversations.length}</span>
            </div>

            <div style={s.convList}>
              {conversations.length === 0 && (
                <div style={s.emptyState}>
                  <p style={s.emptyIcon}>💬</p>
                  <p style={s.emptyText}>No conversations yet</p>
                  <p style={s.emptyHint}>Create one via Postman to get started</p>
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
                    {/* Conversation avatar — uses first letter of name */}
                    <Avatar name={conv.name || 'D'} size={44} />

                    <div style={s.convMeta}>
                      <div style={s.convTop}>
                        <span style={s.convName}>{conv.name || 'Direct Message'}</span>
                      </div>
                      <span style={s.convLastMsg}>
                        {conv.lastMessage || 'No messages yet'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* ── CHAT WINDOW ── */}
        <main style={s.chatArea}>

          {/* Empty state — no conversation selected */}
          {!activeConversation ? (
            <div style={s.welcomeScreen}>
              <p style={s.welcomeIcon}>💬</p>
              <h2 style={s.welcomeTitle}>Welcome to ChatFlow</h2>
              <p style={s.welcomeText}>Select a conversation from the sidebar to start chatting</p>
            </div>
          ) : (
            <>
              {/* ── CHAT HEADER ── */}
              <div style={s.chatHeader}>
                <Avatar name={activeConversation.name || 'D'} size={40} />
                <div style={s.chatHeaderMeta}>
                  <span style={s.chatHeaderName}>
                    {activeConversation.name || 'Direct Message'}
                  </span>
                  <span style={s.chatHeaderSub}>
                    {activeConversation.participants?.length || 0} participants
                  </span>
                </div>
              </div>

              {/* ── MESSAGES LIST ── */}
              <div style={s.messagesList}>

                {/* Loading skeleton */}
                {loading && (
                  <div style={s.loadingWrap}>
                    <div style={s.loadingDot} />
                    <div style={s.loadingDot} />
                    <div style={s.loadingDot} />
                  </div>
                )}

                {/* Empty conversation */}
                {!loading && messages.length === 0 && (
                  <div style={s.noMessages}>
                    <p>No messages yet — say hello! 👋</p>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, index) => {
                  const own = isOwnMessage(msg);
                  const senderName = msg.senderId?.name || 'Unknown';

                  // Show sender name only when it changes from the previous message
                  // Cleaner than showing name on every single bubble
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
                      {/* Avatar on the left for other people's messages */}
                      {!own && (
                        <div style={s.msgAvatar}>
                          {showName && <Avatar name={senderName} size={30} />}
                          {!showName && <div style={{ width: 30 }} />}
                        </div>
                      )}

                      <div style={{ maxWidth: '62%' }}>
                        {/* Sender name — only shown when sender changes */}
                        {showName && (
                          <p style={s.senderLabel}>{senderName}</p>
                        )}

                        {/* Message bubble */}
                        <div style={{
                          ...s.bubble,
                          backgroundColor: own ? '#6366f1' : '#f1f5f9',
                          color: own ? '#ffffff' : '#1e293b',
                          borderRadius: own
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                        }}>
                          <p style={s.bubbleText}>{msg.text}</p>
                        </div>

                        {/* Timestamp below bubble */}
                        <p style={{
                          ...s.bubbleTime,
                          textAlign: own ? 'right' : 'left',
                        }}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Invisible anchor — scrolled into view on new message */}
                <div ref={messagesEndRef} />
              </div>

              {/* ── MESSAGE INPUT ── */}
              <div style={s.inputBar}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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
                  title="Send message"
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Styles
const s = {
  // Root container — full viewport height
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    height: '60px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    zIndex: 10,
    flexShrink: 0,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brand: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: '-0.3px',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  navName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
  },
  logoutBtn: {
    padding: '7px 14px',
    backgroundColor: '#fff',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  // ── Body layout ──
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },

  // ── Sidebar ──
  sidebar: {
    width: '300px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  convCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#ede9fe',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '2px',
    transition: 'background 0.15s',
  },
  convMeta: {
    flex: 1,
    minWidth: 0,
  },
  convTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3px',
  },
  convName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  convLastMsg: {
    fontSize: '13px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '4px',
  },
  emptyHint: {
    fontSize: '12px',
    color: '#94a3b8',
  },

 
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },

  // Welcome screen
  welcomeScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#94a3b8',
  },
  welcomeIcon: {
    fontSize: '48px',
  },
  welcomeTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#475569',
  },
  welcomeText: {
    fontSize: '14px',
    color: '#94a3b8',
  },

  // Chat header
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    flexShrink: 0,
  },
  chatHeaderMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  chatHeaderName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
  },
  chatHeaderSub: {
    fontSize: '12px',
    color: '#94a3b8',
  },

  // Messages list
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
  },

  // Loading dots
  loadingWrap: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    padding: '20px',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#cbd5e1',
    animation: 'pulse 1s infinite',
  },

  // No messages
  noMessages: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },

  // Message row
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  msgAvatar: {
    flexShrink: 0,
    alignSelf: 'flex-end',
  },

  // Sender label
  senderLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '4px',
    paddingLeft: '4px',
  },

  // Bubble
  bubble: {
    padding: '10px 14px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  bubbleText: {
    fontSize: '14px',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  bubbleTime: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
    paddingLeft: '4px',
    paddingRight: '4px',
  },

  // Input bar
  inputBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
};

export default Chat;
