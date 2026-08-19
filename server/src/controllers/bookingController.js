const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const Salon = require('../models/Salon');
const bookingService = require('../services/bookingService');
const { getSalonAvailability, getComplexAvailability } = require('../services/availabilityService');
const { notifyBookingCreated, notifyBookingAccepted, notifyBookingRejected, notifyBookingCancelled } = require('../services/notificationService');
const { getIO } = require('../config/socket');

// @desc    Create booking (User)
const createBooking = async (req, res, next) => {
  try {
    const { salon, services, bookingDate, startTime, couponCode, paymentMethod } = req.body;
    const result = await bookingService.createBooking({
      userId: req.user.id, salonId: salon, services, bookingDate, startTime, couponCode, paymentMethod
    });

    // Send notification to vendor
    try {
      await notifyBookingCreated(result.booking, result.vendorId);
      const io = getIO();
      io.to(`vendor:${result.vendorId}`).emit('booking:new', { booking: result.booking });
    } catch (e) { console.log('Notification error:', e.message); }

    res.status(201).json({ success: true, message: 'Booking created successfully', data: { booking: result.booking, services: result.services } });
  } catch (error) {
    if (error.message.includes('not available') || error.message.includes('not found')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get user's bookings
const getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { user: req.user.id };
    if (status) query.status = status;

    const bookings = await Booking.find(query).populate('salon', 'name address images phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Booking.countDocuments(query);

    res.json({ success: true, data: { bookings, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get salon bookings (Vendor)
const getSalonBookings = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.params.salonId, vendor: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found or not authorized' });

    const { status, date, page = 1, limit = 20 } = req.query;
    const query = { salon: req.params.salonId };
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      query.bookingDate = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
    }

    const bookings = await Booking.find(query).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Booking.countDocuments(query);

    res.json({ success: true, data: { bookings, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get booking detail
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('salon', 'name address phone vendor images').populate('user', 'name email phone').populate('coupon', 'code discountType discountValue');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const services = await BookingService.find({ booking: booking._id }).populate('service', 'name price duration category').populate('staff', 'name avatar');
    const review = await require('../models/Review').findOne({ booking: booking._id });

    res.json({ success: true, data: { booking, services, review } });
  } catch (error) { next(error); }
};

// @desc    Accept booking (Vendor)
const acceptBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.acceptBooking(req.params.id, req.user.id);
    try {
      await notifyBookingAccepted(booking);
      const io = getIO();
      io.to(`user:${booking.user}`).emit('booking:update', { eventType: 'ACCEPTED', booking });
    } catch (e) { console.log('Notification error:', e.message); }
    res.json({ success: true, message: 'Booking accepted', data: booking });
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('Cannot')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Reject booking (Vendor)
const rejectBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.rejectBooking(req.params.id, req.user.id, req.body.reason);
    try {
      await notifyBookingRejected(booking);
      const io = getIO();
      io.to(`user:${booking.user}`).emit('booking:update', { eventType: 'REJECTED', booking });
    } catch (e) { console.log('Notification error:', e.message); }
    res.json({ success: true, message: 'Booking rejected', data: booking });
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('Cannot')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Cancel booking (User)
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id, req.body.reason);
    try {
      const populatedBooking = await Booking.findById(booking._id).populate('salon');
      await notifyBookingCancelled(booking, populatedBooking.salon.vendor, 'vendor');
      const io = getIO();
      io.to(`vendor:${populatedBooking.salon.vendor}`).emit('booking:update', { eventType: 'CANCELLED', booking });
    } catch (e) { console.log('Notification error:', e.message); }
    res.json({ success: true, message: 'Booking cancelled', data: booking });
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('Cannot')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Complete booking (Vendor)
const completeBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.completeBooking(req.params.id, req.user.id);
    res.json({ success: true, message: 'Booking completed', data: booking });
  } catch (error) {
    if (error.message.includes('not authorized') || error.message.includes('Cannot')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get availability for salon
const getAvailability = async (req, res, next) => {
  try {
    if (req.method === 'POST' && req.body.services) {
      const { date, services } = req.body;
      if (!date || !services || !services.length) return res.status(400).json({ success: false, message: 'Date and services are required' });
      const availability = await getComplexAvailability(req.params.salonId, date, services);
      return res.json({ success: true, data: availability });
    }

    const { date, duration = 30 } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });
    const availability = await getSalonAvailability(req.params.salonId, date, parseInt(duration));
    res.json({ success: true, data: availability });
  } catch (error) { next(error); }
};

// @desc    Get all bookings (Admin)
const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const bookings = await Booking.find(query).populate('salon', 'name').populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Booking.countDocuments(query);

    res.json({ success: true, data: { bookings, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

module.exports = { createBooking, getMyBookings, getSalonBookings, getBookingById, acceptBooking, rejectBooking, cancelBooking, completeBooking, getAvailability, getAllBookings };
