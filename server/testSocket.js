const { io } = require('socket.io-client');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTQ2MjhmZTM4OTg5ZjU3NTEyYzg5YTgiLCJpYXQiOjE3ODMyNzAwODcsImV4cCI6MTc4Mzg3NDg4N30.CA5sNZTSydEwAFBlaWnEqSJ-K4oz28uIWporm5Mjh8U';

const socket = io('http://localhost:5000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✅ Socket connected, ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.log('❌ Connection failed:', err.message);
});