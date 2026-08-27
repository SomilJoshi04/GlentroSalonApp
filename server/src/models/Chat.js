const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['user', 'vendor', 'admin'],
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'system'],
      default: 'text',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'vendor', 'admin'],
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message: 'Chat must have exactly 2 participants',
      },
    },
    chatType: {
      type: String,
      required: true,
      enum: ['user-vendor', 'user-admin'],
    },
    conversationType: {
      type: String,
      enum: ['salon', 'general'],
      default: 'salon',
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    messages: [messageSchema],
    lastMessage: {
      content: String,
      sender: mongoose.Schema.Types.ObjectId,
      timestamp: Date,
    },
    chatDisplayId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ chatType: 1 });

module.exports = mongoose.model('Chat', chatSchema);
