const Notification = require('../models/Notification');

const getRecipientFilter = (req) => {
  if (req.user && req.user.role === 'admin') {
    return {
      $or: [{ recipient: req.user.id }, { recipientRole: 'admin' }],
    };
  }
  return { recipient: req.user.id };
};

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = getRecipientFilter(req);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.json({ success: true, data: { notifications, total, unreadCount, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...getRecipientFilter(req) };
    const notif = await Notification.findOneAndUpdate(filter, { isRead: true });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) { next(error); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const filter = { ...getRecipientFilter(req), isRead: false };
    await Notification.updateMany(filter, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const filter = { ...getRecipientFilter(req), isRead: false };
    const count = await Notification.countDocuments(filter);
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

const deleteNotification = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...getRecipientFilter(req) };
    const notif = await Notification.findOneAndDelete(filter);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    const filter = getRecipientFilter(req);
    await Notification.deleteMany(filter);
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) { next(error); }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
};
