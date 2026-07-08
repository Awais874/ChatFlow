const { io } = require('socket.io-client');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTQ2MjhmZTM4OTg5ZjU3NTEyYzg5YTgiLCJpYXQiOjE3ODMyNzAwODcsImV4cCI6MTc4Mzg3NDg4N30.CA5sNZTSydEwAFBlaWnEqSJ-K4oz28uIWporm5Mjh8U';

const conversationId = '6a4df4034ef2746dcdbc83fb';

const socket = io('http://localhost:5000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✅ Socket connected, ID:', socket.id);

  // Step 1: Join the conversation room
  socket.emit('joinRoom', conversationId);
  console.log('Joined room:', conversationId);

  // Step 2: Send a message after 1 second
  setTimeout(() => {
    console.log('Sending message...');
    socket.emit('sendMessage', {
      conversationId,
      text: 'Hello ChatFlow! First real message 🚀'
    });
  }, 1000);
});

// Step 3: Listen for new messages
socket.on('newMessage', (message) => {
  console.log('📨 New message received:');
  console.log('   Text:', message.text);
  console.log('   From:', message.senderId);
  console.log('   At:', message.createdAt);
});

socket.on('error', (err) => {
  console.log('❌ Error:', err.message);
});

socket.on('connect_error', (err) => {
  console.log('❌ Connection failed:', err.message);
});