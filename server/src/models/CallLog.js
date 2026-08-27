const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  callerRole: {
    type: String,
    enum: ['user', 'vendor'],
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  recipientRole: {
    type: String,
    enum: ['user', 'vendor'],
    required: true,
  },
  channelName: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['missed', 'rejected', 'active', 'completed', 'busy', 'failed'],
    default: 'missed',
  },
  durationSeconds: {
    type: Number,
    default: 0,
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
