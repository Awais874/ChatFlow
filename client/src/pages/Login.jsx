import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

function Login() {
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Store error message if login fails
  const [error, setError] = useState('');

  // Store loading state and  disable button while request is in progress
  const [loading, setLoading] = useState(false);

  // useNavigate lets us redirect programmatically after login
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    // Prevent page refresh on form submit (default browser behavior)
    e.preventDefault();

    setError('');

    // Show loading state
    setLoading(true);

    try {
      // Send login request to our Express backend
      
        const response = await api.post('/api/auth/login', {
        email,
        password
      });

      // Save the JWT token to localStorage, This is what isAuthenticated() checks in App.jsx
      localStorage.setItem('token', response.data.token);

      // Save basic user info so we can display name etc. later
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect to chat page
      navigate('/');

    } catch (err) {
      // Show the error message from the backend
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      //  hide loading state when request finishes
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* App title */}
        <h1 style={styles.title}>💬 ChatFlow</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {/* Show error message if login fails */}
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Email field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="awais@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Password field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Submit button — disabled while loading */}
          <button
            type="submit"
            style={loading ? styles.buttonDisabled : styles.button}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        {/* Link to register page */}
        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register here
          </Link>
        </p>

      </div>
    </div>
  );
}


const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f0f2f5'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    fontSize: '28px',
    marginBottom: '8px',
    color: '#1a1a1a'
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '24px'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '15px',
    outline: 'none'
  },
  button: {
    padding: '12px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px'
  },
  buttonDisabled: {
    padding: '12px',
    backgroundColor: '#93c5fd',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'not-allowed',
    marginTop: '8px'
  },
  switchText: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '14px'
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500'
  }
};

export default Login;