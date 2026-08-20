import React, { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } from '../services/vendorApi';
import { useNotifications } from '../../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import VendorPageLayout from '../../../components/vendor/layout/VendorPageLayout';
import VendorPageHeader from '../../../components/vendor/layout/VendorPageHeader';
import VendorTableContainer from '../../../components/vendor/layout/VendorTableContainer';
import VendorPagination from '../../../components/vendor/layout/VendorPagination';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const { unreadCount, decrementCount, resetCount } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const fetchNotifications = async (pageNum) => {
    try {
      setLoading(true);
      const res = await getNotifications({ page: pageNum, limit: 20 });
      if (res.data?.success) {
        setNotifications(res.data.data.notifications);
        setTotalPages(res.data.data.totalPages);
        setTotal(res.data.data.total || 0);
      }
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      decrementCount();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetCount();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      try {
        await clearAllNotifications();
        setNotifications([]);
        setTotal(0);
        resetCount();
        toast.success('All notifications cleared');
      } catch (error) {
        toast.error('Failed to clear notifications');
      }
    }
  };

  const getIcon = (type) => {
    if (!type) return 'notifications';
    if (type.includes('BOOKING')) return 'calendar_today';
    if (type.includes('VENDOR')) return 'storefront';
    if (type.includes('PACKAGE') || type.includes('OFFER')) return 'redeem';
    return 'notifications';
  };

  return (
    <VendorPageLayout>
      <VendorPageHeader 
        title={
          <div className="flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-[14px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
        }
        description="Manage system alerts and updates."
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-colors shrink-0 ${
                unreadCount > 0 
                  ? 'bg-surface-variant hover:bg-surface-variant-hover text-primary' 
                  : 'bg-surface-variant/50 text-muted-text cursor-not-allowed opacity-50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">done_all</span>
              Mark All as Read
            </button>
            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-error/10 text-error border border-error/20 hover:border-error/40 font-medium rounded-xl transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                Clear All
              </button>
            )}
          </div>
        }
      />
      
      <VendorTableContainer>
        {loading && notifications.length === 0 ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4 text-muted-text">
              <span className="material-symbols-outlined text-[32px]">notifications_off</span>
            </div>
            <h3 className="font-headline-sm text-[18px] text-on-surface mb-2">No Notifications</h3>
            <p className="font-body-sm text-muted-text max-w-md">
              You currently have no system alerts. When new events occur, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div 
                key={notif._id} 
                onClick={() => handleMarkAsRead(notif._id, notif.isRead)}
                className={`p-6 flex flex-col sm:flex-row sm:items-start gap-4 transition-colors cursor-pointer ${
                  !notif.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-variant'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  !notif.isRead ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-muted-text'
                }`}>
                  <span className="material-symbols-outlined">{getIcon(notif.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                    <h4 className={`text-[15px] ${!notif.isRead ? 'font-bold text-on-surface' : 'font-medium text-text-secondary'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[12px] text-muted-text whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-[14px] ${!notif.isRead ? 'text-text-secondary' : 'text-muted-text'}`}>
                    {notif.message}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="shrink-0 self-start sm:self-center">
                    <div className="w-3 h-3 rounded-full bg-primary" title="Unread" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </VendorTableContainer>

      {notifications.length > 0 && (
        <VendorPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={20}
          onPageChange={setPage}
        />
      )}
    </VendorPageLayout>
  );
};

export default NotificationsPage;
