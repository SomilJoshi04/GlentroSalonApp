import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../../context/NotificationContext';
import { getNotifications, markAsRead, markAllAsRead } from '../services/adminApi';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  const { unreadCount, decrementCount, resetCount, latestNotification, clearLatest } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
    }
  }, [isOpen]);

  // Insert real-time notification into the list if dropdown is open
  useEffect(() => {
    if (latestNotification) {
      setNotifications(prev => {
        // Prevent duplicate appending if id matches
        if (prev.some(n => n._id === latestNotification._id)) return prev;
        return [latestNotification, ...prev].slice(0, 5);
      });
      clearLatest();
    }
  }, [latestNotification, clearLatest]);

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ page: 1, limit: 5 });
      if (res.data?.success) {
        setNotifications(res.data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (e, id, isRead) => {
    e.stopPropagation();
    if (isRead) return;
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      decrementCount();
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    if (unreadCount === 0) return;
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetCount();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.isRead) {
      try {
        await markAsRead(notif._id);
        decrementCount();
      } catch (err) {
        console.error(err);
      }
    }
    
    // Navigate based on type
    switch (notif.type) {
      case 'BOOKING_CREATED':
      case 'BOOKING_CANCELLED':
        navigate('/admin/bookings');
        break;
      case 'NEW_VENDOR_REQUEST':
        navigate('/admin/vendors');
        break;
      case 'PACKAGE_APPROVAL_REQUEST':
      case 'OFFER_APPROVAL_REQUEST':
        navigate('/admin/packages');
        break;
      default:
        navigate('/admin/notifications');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors flex items-center ${isOpen ? 'bg-surface-variant text-primary' : 'text-muted-text hover:bg-surface-variant'}`}
      >
        <span className="material-symbols-outlined text-[24px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-surface rounded-2xl shadow-xl border border-border overflow-hidden z-50 animate-fade-in origin-top-right">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-card">
            <h3 className="font-headline-sm text-[16px] text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[12px] font-medium text-primary hover:text-primary-600 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto hide-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="material-symbols-outlined text-[32px] text-muted-text/50 mb-2">notifications_off</span>
                <p className="font-label-md text-on-surface">All caught up!</p>
                <p className="text-[12px] text-muted-text mt-1">You have no new notifications.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(notif => (
                  <div 
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 cursor-pointer hover:bg-surface-variant transition-colors flex gap-3 ${!notif.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-muted-text'}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {notif.type?.includes('BOOKING') ? 'calendar_today' : 
                         notif.type?.includes('VENDOR') ? 'storefront' : 
                         notif.type?.includes('PACKAGE') || notif.type?.includes('OFFER') ? 'redeem' : 'notifications'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className={`text-[13px] line-clamp-1 ${!notif.isRead ? 'font-bold text-on-surface' : 'font-medium text-text-secondary'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-text whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }).replace('about ', '')}
                        </span>
                      </div>
                      <p className={`text-[12px] line-clamp-2 ${!notif.isRead ? 'text-text-secondary' : 'text-muted-text'}`}>
                        {notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <button 
                        onClick={(e) => handleMarkAsRead(e, notif._id, notif.isRead)}
                        className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 self-center"
                        title="Mark as read"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border bg-surface-card text-center">
            <button 
              onClick={() => { setIsOpen(false); navigate('/admin/notifications'); }}
              className="text-[13px] font-medium text-primary hover:text-primary-600 w-full py-1.5 transition-colors"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
