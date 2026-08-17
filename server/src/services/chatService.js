const Chat = require('../models/Chat');

/**
 * Get or create a chat between two participants
 */
const getOrCreateChat = async (participant1, participant2, chatType) => {
  // Check if chat already exists between these participants
  let chat = await Chat.findOne({
    chatType,
    'participants.userId': { $all: [participant1.userId, participant2.userId] },
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [participant1, participant2],
      chatType,
      messages: [],
    });
  }

  return chat;
};

/**
 * Send a message in a chat
 */
const sendMessage = async (chatId, senderId, senderRole, content, messageType = 'text') => {
  const message = {
    sender: senderId,
    senderRole,
    content,
    messageType,
    isRead: false,
  };

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { messages: message },
      lastMessage: {
        content: content.substring(0, 100),
        sender: senderId,
        timestamp: new Date(),
      },
    },
    { new: true }
  );

  if (!chat) throw new Error('Chat not found');

  // Return the last added message
  return chat.messages[chat.messages.length - 1];
};

/**
 * Get all chats for a user
 */
const getChats = async (userId, role) => {
  const chats = await Chat.find({
    'participants.userId': userId,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return chats;
};

/**
 * Get messages for a chat with pagination
 */
const getMessages = async (chatId, page = 1, limit = 50) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error('Chat not found');

  const totalMessages = chat.messages.length;
  const start = Math.max(0, totalMessages - page * limit);
  const end = totalMessages - (page - 1) * limit;

  return {
    messages: chat.messages.slice(start, end),
    totalMessages,
    page,
    totalPages: Math.ceil(totalMessages / limit),
  };
};

/**
 * Mark messages as read
 */
const markMessagesAsRead = async (chatId, userId) => {
  await Chat.updateMany(
    { _id: chatId },
    {
      $set: {
        'messages.$[msg].isRead': true,
      },
    },
    {
      arrayFilters: [{ 'msg.sender': { $ne: userId }, 'msg.isRead': false }],
    }
  );
};

module.exports = {
  getOrCreateChat,
  sendMessage,
  getChats,
  getMessages,
  markMessagesAsRead,
};
