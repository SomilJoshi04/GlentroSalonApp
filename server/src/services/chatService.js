const Chat = require('../models/Chat');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Salon = require('../models/Salon');

/**
 * Helper to populate user and vendor details for a chat
 */
const populateChatDetails = async (chat) => {
  if (!chat) return null;
  const chatObj = chat.toObject ? chat.toObject() : chat;

  // Generate chatDisplayId if it doesn't exist
  if (!chatObj.chatDisplayId) {
    const displayId = 'CHAT-' + chatObj._id.toString().slice(-6).toUpperCase();
    chatObj.chatDisplayId = displayId;
    await Chat.findByIdAndUpdate(chatObj._id, { chatDisplayId: displayId });
  }

  // Populate userDetails & vendorDetails in participants
  for (let p of chatObj.participants) {
    const pId = p.userId;
    if (p.role === 'user') {
      const u = await User.findById(pId).select('name avatar').lean();
      p.userDetails = u ? { name: u.name, avatar: u.avatar } : { name: 'Customer Unavailable', avatar: '' };
    } else if (p.role === 'vendor') {
      const v = await Vendor.findById(pId).select('businessName name avatar').lean();
      p.vendorDetails = v ? { name: v.businessName || v.name, avatar: v.avatar } : { name: 'Salon Unavailable', avatar: '' };
    }
  }

  // Populate salonDetails
  if (chatObj.salon) {
    const s = await Salon.findById(chatObj.salon).select('name address').lean();
    chatObj.salonDetails = s ? { name: s.name, _id: s._id, address: s.address } : null;
  }

  return chatObj;
};

/**
 * Get or create a chat between two participants
 */
const getOrCreateChat = async (participant1, participant2, chatType, salonId) => {
  // Check if chat already exists between these participants
  const query = {
    chatType,
    'participants.userId': { $all: [participant1.userId, participant2.userId] },
  };

  if (salonId) {
    query.salon = salonId;
    query.conversationType = 'salon';
  } else {
    query.conversationType = 'general';
  }

  let chat = await Chat.findOne(query);

  if (!chat) {
    const displayId = 'CHAT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const chatData = {
      participants: [participant1, participant2],
      chatType,
      messages: [],
      chatDisplayId: displayId,
      conversationType: salonId ? 'salon' : 'general',
    };
    if (salonId) {
      chatData.salon = salonId;
    }
    chat = await Chat.create(chatData);
  }

  return populateChatDetails(chat);
};

const { getIO } = require('../config/socket');

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

  const savedMessage = chat.messages[chat.messages.length - 1];

  // Broadcast to specific chat room and participants' global rooms
  try {
    const io = getIO();
    const payload = {
      chatId,
      ...savedMessage.toObject()
    };
    
    // Emit to active chat viewers
    io.to(`chat:${chatId}`).emit('chat:message', payload);
    
    // Emit to participants' global inboxes
    chat.participants.forEach(p => {
      io.to(`${p.role}:${p.userId}`).emit('chat:message', payload);
    });

    // If this is a user-admin chat, also emit to all admins
    if (chat.chatType === 'user-admin') {
      io.to('admin').emit('chat:message', payload);
    }
  } catch (err) {
    console.error('Socket emission failed in sendMessage:', err);
  }

  // Return the last added message
  return savedMessage;
};

/**
 * Get all chats for a user
 */
const getChats = async (userId, role) => {
  let query = { isActive: true };
  
  if (role === 'admin') {
    query.$or = [
      { chatType: 'user-admin' },
      { 'participants.userId': userId }
    ];
  } else {
    query['participants.userId'] = userId;
  }
  
  const chats = await Chat.find(query).sort({ updatedAt: -1 });

  const populatedChats = [];
  for (let chat of chats) {
    populatedChats.push(await populateChatDetails(chat));
  }
  return populatedChats;
};

/**
 * Get messages for a chat with pagination
 */
const getMessages = async (chatId, page = 1, limit = 50) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error('Chat not found');

  const populatedChat = await populateChatDetails(chat);

  const totalMessages = chat.messages.length;
  const start = Math.max(0, totalMessages - page * limit);
  const end = totalMessages - (page - 1) * limit;

  return {
    chat: populatedChat,
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
