import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Custom hook - connects to Socket.io server with JWT token, Returns the socket instance so components can emit and listen
const useSocket = () => {

  // useRef keeps the socket instance across re-renders, without causing re-renders itself
  const socketRef = useRef(null);

  useEffect(() => {
    // Get token from localStorage. same one saved on loginn
    const token = localStorage.getItem('token');

    if (!token) {
      // No token means user is not logged in, Don't connect to socket
      return;
    }

    // Create socket connection with JWT token, Token goes in auth so server middleware can verify it
    socketRef.current = io('https://chatflow-backend-lj6n.onrender.com', {
      auth: { token }
    });

    // Log when connected
    socketRef.current.on('connect', () => {
      console.log('😀 Socket connected:', socketRef.current.id);
    });

    // Log when disconnected
    socketRef.current.on('disconnect', () => {
      console.log('☹️ Socket disconnected');
    });

    // Log connection errors
    socketRef.current.on('connect_error', (err) => {
      console.log(' Socket connection error:', err.message);
    });

    //  disconnect socket when component unmounts. Prevents memory leaks and duplicate connections
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty array , only runs once when component mounts

  
  return socketRef.current;
};

export default useSocket;