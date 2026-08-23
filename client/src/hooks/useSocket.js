import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Singleton — one socket instance shared across renders
let socketInstance = null;

const useSocket = () => {
  // Store in STATE so React re-renders when socket connects
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket only once
    if (!socketInstance) {
      socketInstance = io('https://chatflow-backend-lj6n.onrender.com', {
        auth: { token }
      });
    }

    // If already connected, set state immediately
    if (socketInstance.connected) {
      setSocket(socketInstance);
    }

    // When socket connects, update state — triggers React re-render
    socketInstance.on('connect', () => {
      console.log('😀 Socket connected:', socketInstance.id);
      setSocket(socketInstance);
    });

    socketInstance.on('disconnect', () => {
      console.log('☹️ Socket disconnected');
    });

    socketInstance.on('connect_error', (err) => {
      console.log('❌ Socket error:', err.message);
    });

    return () => {
      // Don't disconnect — keep singleton alive across re-renders
    };
  }, []);

  // Return socket VALUE (from state) — React re-renders when this changes
  return socket;
};

export default useSocket;