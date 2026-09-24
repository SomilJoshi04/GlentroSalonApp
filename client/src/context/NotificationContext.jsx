import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import api from '../services/api/axiosInstance';
import { useAuth } from './AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '../config/firebase';
import toast from 'react-hot-toast';

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
  const { user, vendor, userToken, vendorToken } = useAuth();

  // Fetch unread count on mount
  useEffect(() => {
    if (!userToken && !vendorToken) return;
    const fetchCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.data.count);
      } catch (err) { /* ignore */ }
    };
    fetchCount();
  }, [userToken, vendorToken]);

  // Request FCM token and register with backend when authenticated
  useEffect(() => {
    if (!userToken && !vendorToken) return;

    let isMounted = true;
    const registerFcm = async () => {
      try {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken && isMounted) {
          const endpoint = vendorToken ? '/vendors/fcm-token' : '/users/fcm-token';
          await api.put(endpoint, { fcmToken });
        }
      } catch (err) {
        console.warn('FCM token registration warning:', err.message);
      }
    };

    const timer = setTimeout(registerFcm, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [userToken, vendorToken]);

  // Listen for foreground FCM notifications
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Notification';
      const message = payload.notification?.body || payload.data?.message || '';

      setUnreadCount((prev) => prev + 1);
      setLatestNotification({
        title,
        message,
        data: payload.data || {},
        createdAt: new Date().toISOString(),
      });

      toast(
        (t) => (
          <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => toast.dismiss(t.id)}>
            <span className="font-semibold text-sm text-slate-900">{title}</span>
            <span className="text-xs text-slate-600 line-clamp-2">{message}</span>
          </div>
        ),
        { icon: '🔔', duration: 4000 }
      );
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Listen for real-time notifications via Socket.IO
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
