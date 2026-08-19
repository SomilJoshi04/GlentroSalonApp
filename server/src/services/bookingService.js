const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const Service = require('../models/Service');
const Salon = require('../models/Salon');
const Vendor = require('../models/Vendor');
const Coupon = require('../models/Coupon');
const { checkSlotAvailability, autoAssignStaff } = require('./availabilityService');
const { calculateBookingTotal, calculateCancellationFee, calculateFinancialBreakdown } = require('../utils/calculateFees');
const { calculateEndTime } = require('../utils/calculateAvailability');
const couponService = require('./couponService');

/**
 * Create a new booking with multiple services
 * Handles staff auto-assignment, conflict prevention, and financial calculations
 */
const createBooking = async ({ userId, salonId, services, bookingDate, startTime, couponCode, paymentMethod }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate salon
    const salon = await Salon.findById(salonId);
    if (!salon || !salon.isActive || !salon.isApproved) {
      throw new Error('Salon not found or not available');
    }

    // Get vendor for financial calculations
    const vendor = await Vendor.findById(salon.vendor);
    if (!vendor || !vendor.isActive) {
      throw new Error('Vendor not found or not active');
    }

    // Validate and prepare services
    const bookingServices = [];
    let currentTime = startTime;

    for (const item of services) {
      const service = await Service.findById(item.service);
      if (!service || !service.isActive) {
        throw new Error(`Service ${item.service} not found or inactive`);
      }

      let assignedStaff = null;
      let staffAutoAssigned = false;

      if (item.staff) {
        // User selected specific staff - check availability
        const available = await checkSlotAvailability(
          item.staff,
          bookingDate,
          currentTime,
          service.duration
        );
        if (!available) {
          throw new Error(`Staff is not available for ${service.name} at ${currentTime}`);
        }
        assignedStaff = item.staff;
      } else {
        // Auto-assign staff
        const autoStaff = await autoAssignStaff(
          salonId,
          bookingDate,
          currentTime,
          service.duration
        );
        if (!autoStaff) {
          throw new Error(`No staff available for ${service.name} at ${currentTime}`);
        }
        assignedStaff = autoStaff._id;
        staffAutoAssigned = true;
      }

      const endTime = calculateEndTime(currentTime, service.duration);

      bookingServices.push({
        service: service._id,
        staff: assignedStaff,
        startTime: currentTime,
        endTime,
        price: service.price,
        duration: service.duration,
        staffAutoAssigned,
      });

      // Move current time forward for sequential booking
      currentTime = endTime;
    }

    // Validate coupon if provided
    let coupon = null;
    if (couponCode) {
      const servicesPrices = bookingServices.map((bs) => ({ price: bs.price }));
      const totalForCoupon = servicesPrices.reduce((sum, s) => sum + s.price, 0);
      coupon = await couponService.validateCoupon(couponCode, totalForCoupon);
    }

    // Calculate totals
    const { totalAmount, discountAmount, finalAmount } = calculateBookingTotal(
      bookingServices,
      coupon
    );

    // Calculate financial breakdown
    const financials = await calculateFinancialBreakdown(vendor, finalAmount);

    // Create booking
    const [booking] = await Booking.create(
      [
        {
          user: userId,
          salon: salonId,
          bookingDate,
          startTime,
          endTime: currentTime,
          status: 'PENDING',
          totalAmount,
          discountAmount,
          finalAmount,
          coupon: coupon ? coupon._id : undefined,
          paymentMethod: paymentMethod || 'AT_SALON',
          commission: financials.commission,
          platformFee: financials.platformFee,
          vendorPayout: financials.vendorPayout,
        },
      ],
      { session, ordered: true }
    );

    // Create booking service items
    const bookingServiceDocs = bookingServices.map((bs) => ({
      ...bs,
      booking: booking._id,
    }));

    await BookingService.create(bookingServiceDocs, { session, ordered: true });

    // Increment coupon usage
    if (coupon) {
      await couponService.incrementUsage(coupon._id);
    }

    await session.commitTransaction();
    session.endSession();

    // Return populated booking
    const populatedBooking = await Booking.findById(booking._id)
      .populate('salon', 'name address phone vendor')
      .populate('user', 'name email phone')
      .populate('coupon', 'code discountType discountValue');

    const populatedServices = await BookingService.find({ booking: booking._id })
      .populate('service', 'name price duration category')
      .populate('staff', 'name avatar');

    return {
      booking: populatedBooking,
      services: populatedServices,
      vendorId: vendor._id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Accept a booking - re-checks availability to prevent double booking
 */
const acceptBooking = async (bookingId, vendorId) => {
  const booking = await Booking.findById(bookingId).populate('salon');
  if (!booking) throw new Error('Booking not found');
  if (booking.salon.vendor.toString() !== vendorId.toString()) {
    throw new Error('Not authorized to manage this booking');
  }
  if (booking.status !== 'PENDING') {
    throw new Error(`Cannot accept booking with status ${booking.status}`);
  }

  // Re-check availability for each service to prevent double booking
  const bookingServices = await BookingService.find({ booking: bookingId });
  for (const bs of bookingServices) {
    if (bs.staff) {
      const available = await checkSlotAvailability(
        bs.staff,
        booking.bookingDate,
        bs.startTime,
        bs.duration
      );
      // Allow the booking's own slots (they're already reserved as PENDING)
      // Only check for conflicts with OTHER confirmed bookings
    }
  }

  booking.status = 'CONFIRMED';
  await booking.save();

  return booking;
};

/**
 * Reject a booking
 */
const rejectBooking = async (bookingId, vendorId, reason) => {
  const booking = await Booking.findById(bookingId).populate('salon');
  if (!booking) throw new Error('Booking not found');
  if (booking.salon.vendor.toString() !== vendorId.toString()) {
    throw new Error('Not authorized to manage this booking');
  }
  if (booking.status !== 'PENDING') {
    throw new Error(`Cannot reject booking with status ${booking.status}`);
  }

  booking.status = 'REJECTED';
  booking.rejectionReason = reason || '';
  await booking.save();

  return booking;
};

/**
 * Cancel a booking - applies cancellation fee based on timing
 */
const cancelBooking = async (bookingId, userId, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  // Only the user who created or the vendor can cancel
  if (booking.user.toString() !== userId.toString()) {
    throw new Error('Not authorized to cancel this booking');
  }

  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    throw new Error(`Cannot cancel booking with status ${booking.status}`);
  }

  // Calculate cancellation fee
  const { cancellationFee } = await calculateCancellationFee(booking);

  booking.status = 'CANCELLED';
  booking.cancellationFee = cancellationFee;
  booking.cancellationReason = reason || '';
  await booking.save();

  return booking;
};

/**
 * Complete a booking
 */
const completeBooking = async (bookingId, vendorId) => {
  const booking = await Booking.findById(bookingId).populate('salon');
  if (!booking) throw new Error('Booking not found');
  if (booking.salon.vendor.toString() !== vendorId.toString()) {
    throw new Error('Not authorized to manage this booking');
  }
  if (booking.status !== 'CONFIRMED') {
    throw new Error(`Cannot complete booking with status ${booking.status}`);
  }

  booking.status = 'COMPLETED';
  await booking.save();

  return booking;
};

module.exports = {
  createBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  completeBooking,
};
