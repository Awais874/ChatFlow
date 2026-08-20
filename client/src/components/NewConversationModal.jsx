import { useState } from 'react';
import api from '../utils/api';

// ─── Avatar component (same as in Chat.jsx) ──────────────────────────────────
const Avatar = ({ name, size = 36 }) => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: colors[index],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: '700', fontSize: size * 0.4, flexShrink: 0,
    }}>
      {name ? name[0].toUpperCase() : '?'}
    </div>
  );
};

function NewConversationModal({ onClose, onConversationCreated }) {
  // What the user is typing in the search box
  const [searchQuery, setSearchQuery] = useState('');

  // Search results from the API
  const [searchResults, setSearchResults] = useState([]);

  // Loading state while searching
  const [searching, setSearching] = useState(false);

  // Loading state while creating conversation
  const [creating, setCreating] = useState(false);

  // Error message if something goes wrong
  const [error, setError] = useState('');

  // ─── Search users as user types ──────────────────────────────────────────
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError('');

    // Don't search if query is too short
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(`/api/users/search?query=${value}`);
      setSearchResults(res.data.users);
    } catch (err) {
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  // ─── Start a conversation with selected user ──────────────────────────────
  const startConversation = async (selectedUser) => {
    setCreating(true);
    try {
      const res = await api.post('/api/conversations', {
        // Pass the selected user's ID as a participant
        // The logged in user's ID is added automatically on the server
        participants: [selectedUser._id],
        name: selectedUser.name,
        type: 'direct'
      });

      // Tell the parent (Chat.jsx) a new conversation was created
      // So it can refresh the sidebar and open the new chat
      onConversationCreated(res.data);
      onClose();

    } catch (err) {
      setError('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* ── Dark overlay behind modal ── */}
      <div onClick={onClose} style={s.overlay} />

      {/* ── Modal box ── */}
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <h3 style={s.title}>New Conversation</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Search input */}
        <div style={s.searchWrap}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={handleSearch}
            style={s.searchInput}
            autoFocus
          />
        </div>

        {/* Error message */}
        {error && <p style={s.error}>{error}</p>}

        {/* Results */}
        <div style={s.results}>

          {/* Hint before typing */}
          {searchQuery.length < 2 && (
            <p style={s.hint}>Type at least 2 characters to search</p>
          )}

          {/* Searching spinner */}
          {searching && (
            <p style={s.hint}>Searching...</p>
          )}

          {/* No results */}
          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p style={s.hint}>No users found for "{searchQuery}"</p>
          )}

          {/* User results */}
          {searchResults.map((user) => (
            <div
              key={user._id}
              onClick={() => !creating && startConversation(user)}
              style={s.userRow}
            >
              <Avatar name={user.name} size={40} />
              <div style={s.userMeta}>
                <p style={s.userName}>{user.name}</p>
                <p style={s.userEmail}>{user.email}</p>
              </div>
              <button style={s.chatBtn}>
                {creating ? '...' : 'Chat'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const s = {
  // Dark overlay — clicking it closes the modal
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  // Modal box — centered on screen
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '440px',
    zIndex: 101,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px',
    lineHeight: 1,
  },
  searchWrap: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    padding: '0 20px',
    marginTop: '8px',
  },
  results: {
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '8px',
  },
  hint: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '13px',
    padding: '24px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'background 0.15s',
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: '2px',
  },
  userEmail: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  chatBtn: {
    padding: '6px 14px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

export default NewConversationModal;