import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api/axiosInstance';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const { socket } = useSocket();
  const { isAuthenticated } = useAuth();

  // Fetch unread count on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.data.count);
      } catch (err) { /* ignore */ }
    };
    fetchCount();
  }, [isAuthenticated]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setUnreadCount((prev) => prev + 1);
      setLatestNotification(notification);
    };

    socket.on('notification:new', handleNewNotification);
    return () => socket.off('notification:new', handleNewNotification);
  }, [socket]);

  const decrementCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearLatest = useCallback(() => {
    setLatestNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, latestNotification, decrementCount, resetCount, clearLatest }}>
      {children}
    </NotificationContext.Provider>
  );
};
