import { useState } from 'react';
import axios from 'axios';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  // Store what the user types in the form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Store error message if registration fails
  const [error, setError] = useState('');

  // Store success message after registration
  const [success, setSuccess] = useState('');

  // Store loading state — disable button while request is in progress
  const [loading, setLoading] = useState(false);

  // useNavigate lets us redirect after registration
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    // Prevent page refresh on form submit
    e.preventDefault();

    // Clear previous messages
    setError('');
    setSuccess('');

    // Basic frontend validation before hitting the API
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Send register request to backend
      const response = await api.post('/api/auth/register', {
      
        name,
        email,
        password
      });

      // Show success message
      setSuccess('Account created! Redirecting to login...');

      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      // Show error from backend
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* App title */}
        <h1 style={styles.title}>💬 ChatFlow</h1>
        <p style={styles.subtitle}>Create your account</p>

        {/* Error message */}
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}

        {/* Register form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Name field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Awais Abdullah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          </div>

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

          {/* Submit button */}
          <button
            type="submit"
            style={loading ? styles.buttonDisabled : styles.button}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

        </form>

        {/* Link to login page */}
        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in here
          </Link>
        </p>

      </div>
    </div>
  );
}

// Styles — same design as Login page for consistency
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
  success: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
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

export default Register;