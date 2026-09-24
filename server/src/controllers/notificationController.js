const Notification = require('../models/Notification');

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const recipientId = req.user.id;
    const notifications = await Notification.find({ recipient: recipientId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Notification.countDocuments({ recipient: recipientId });
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });

    res.json({ success: true, data: { notifications, total, unreadCount, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { isRead: true });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) { next(error); }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
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
