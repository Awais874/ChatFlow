import axios from 'axios';

// Base URL for all API requests
const BASE_URL = 'http://localhost:5000';;

// Create axios instance with default config
// Every request made through this instance automatically includes the JWT token in the Authorization header
const api = axios.create({
  baseURL: BASE_URL,
});

// Request interceptor runs before every request Automatically attaches JWT token so we don't have to manually add it to every single API call
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor runs after every response If token is expired (401), automatically log user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;