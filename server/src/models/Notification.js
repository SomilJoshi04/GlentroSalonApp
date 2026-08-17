const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['User', 'Vendor'],
    },
    recipientRole: {
      type: String,
      required: true,
      enum: ['user', 'vendor', 'admin'],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'BOOKING_CREATED',
        'BOOKING_ACCEPTED',
        'BOOKING_REJECTED',
        'BOOKING_CANCELLED',
        'BOOKING_COMPLETED',
        'BOOKING_STATUS_UPDATE',
        'PACKAGE_APPROVED',
        'PACKAGE_REJECTED',
        'OFFER_APPROVED',
        'OFFER_REJECTED',
        'NEW_VENDOR_REQUEST',
        'PACKAGE_APPROVAL_REQUEST',
        'OFFER_APPROVAL_REQUEST',
        'CHAT_MESSAGE',
        'SYSTEM',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
