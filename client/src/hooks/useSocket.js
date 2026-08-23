import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io('https://chatflow-backend-lj6n.onrender.com', {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('😀 Socket connected:', socketRef.current.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('☹️ Socket disconnected');
    });

    socketRef.current.on('connect_error', (err) => {
      console.log('❌ Socket error:', err.message);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Return the REF OBJECT — not ref.current
  // This ensures components always read the latest socket value
  return socketRef;
};

export default useSocket;