const mongoose = require('mongoose');

const bookingServiceSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null, // null means auto-assign or no staff selected
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    staffAutoAssigned: {
      type: Boolean,
      default: false,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalonResource',
      default: null,
    },
    resourceType: {
      type: String,
    },
    resourceSnapshot: {
      name: String,
    },
  },
  {
    timestamps: true,
  }
);

bookingServiceSchema.index({ booking: 1 });
bookingServiceSchema.index({ staff: 1, startTime: 1 });

module.exports = mongoose.model('BookingService', bookingServiceSchema);
