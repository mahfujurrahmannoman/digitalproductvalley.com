const Notification = require('../models/Notification');

const create = async (userId, type, title, message, link = null) => {
  return Notification.create({ user: userId, type, title, message, link });
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ user: userId, isRead: false });
};

const getRecent = async (userId, limit = 10) => {
  return Notification.find({ user: userId }).sort('-createdAt').limit(limit).lean();
};

const markAsRead = async (notificationId, userId) => {
  return Notification.updateOne({ _id: notificationId, user: userId }, { isRead: true });
};

const markAllAsRead = async (userId) => {
  return Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
};

module.exports = { create, getUnreadCount, getRecent, markAsRead, markAllAsRead };
