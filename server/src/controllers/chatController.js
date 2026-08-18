const chatService = require('../services/chatService');

const initiateChat = async (req, res, next) => {
  try {
    let { recipientId, recipientRole, chatType, salonId } = req.body;
    
    if (chatType === 'user-admin' && recipientRole === 'admin' && !recipientId) {
      const admin = await require('../models/User').findOne({ role: 'admin' });
      if (!admin) {
        return res.status(404).json({ success: false, message: 'No admin available' });
      }
      recipientId = admin._id;
    }

    const participant1 = { userId: req.user.id, role: req.user.role };
    const participant2 = { userId: recipientId, role: recipientRole };
    const chat = await chatService.getOrCreateChat(participant1, participant2, chatType, salonId);
    res.json({ success: true, data: chat });
  } catch (error) { next(error); }
};

const getChats = async (req, res, next) => {
  try {
    const chats = await chatService.getChats(req.user.id, req.user.role);
    res.json({ success: true, data: chats });
  } catch (error) { next(error); }
};

const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await chatService.getMessages(req.params.chatId, parseInt(page), parseInt(limit));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

const sendMessage = async (req, res, next) => {
  try {
    const { content, messageType } = req.body;
    const message = await chatService.sendMessage(req.params.chatId, req.user.id, req.user.role, content, messageType);
    res.status(201).json({ success: true, data: message });
  } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
  try {
    await chatService.markMessagesAsRead(req.params.chatId, req.user.id);
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) { next(error); }
};

module.exports = { initiateChat, getChats, getMessages, sendMessage, markAsRead };
