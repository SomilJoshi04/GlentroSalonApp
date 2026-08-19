import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/userApi';
import { useNotifications } from '../../../../context/NotificationContext';
import Button from '../../../../components/common/Button';
import PageHeader from '../../../../components/common/PageHeader';
import { NotificationSkeleton } from '../../components/skeletons/NotificationSkeleton';

const typeIcons = {
  BOOKING_ACCEPTED: 'check_circle',
  BOOKING_REJECTED: 'cancel',
  BOOKING_CANCELLED: 'block',
  BOOKING_CREATED: 'calendar_month',
  default: 'notifications',
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { decrementCount, resetCount } = useNotifications();

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try { const res = await getNotifications({ limit: 50 }); setNotifications(res.data.data.notifications); } catch (e) {}
    setLoading(false);
  };

  const handleRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      decrementCount();
    } catch (e) {}
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetCount();
    } catch (e) {}
  };

  if (loading) return <NotificationSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in pt-6 md:pt-0 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <PageHeader title="Notifications" fallbackPath="/" />
          <h1 className="hidden md:block font-headline-xl text-[32px] font-bold text-on-surface">Notifications</h1>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="ghost" size="sm" onClick={handleReadAll}>Mark all read</Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">notifications</span>
          <h3 className="text-lg font-semibold">No notifications</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} onClick={() => !n.isRead && handleRead(n._id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                n.isRead ? 'bg-white border-gray-100' : 'bg-primary-50 border-primary-200 shadow-sm'}`}>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[24px] bg-soft-primary p-2 rounded-xl border border-primary/10 flex-shrink-0">
                  {typeIcons[n.type] || typeIcons.default}
                </span>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-text-primary">{n.title}</h4>
                  <p className="text-sm text-text-secondary mt-0.5">{n.message}</p>
                  <p className="text-xs text-text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
