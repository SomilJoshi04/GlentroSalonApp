const mongoose = require('mongoose');

const bookingIssueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    issueType: {
      type: String,
      required: true,
      enum: ['unconfirmed', 'payment', 'refund', 'reschedule', 'vendor_rejected', 'wrong_details', 'other'],
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookingIssue', bookingIssueSchema);
