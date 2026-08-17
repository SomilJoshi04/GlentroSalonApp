import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/userApi';
import { useNotifications } from '../../../../context/NotificationContext';
import Button from '../../../../components/common/Button';
import Loader from '../../../../components/common/Loader';

const typeIcons = {
  BOOKING_ACCEPTED: '✅',
  BOOKING_REJECTED: '❌',
  BOOKING_CANCELLED: '🚫',
  BOOKING_CREATED: '📅',
  default: '🔔',
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

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <Button variant="ghost" size="sm" onClick={handleReadAll}>Mark all read</Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold">No notifications</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} onClick={() => !n.isRead && handleRead(n._id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                n.isRead ? 'bg-white border-gray-100' : 'bg-primary-50 border-primary-200 shadow-sm'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeIcons[n.type] || typeIcons.default}</span>
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
