/**
 * Booking Expiry Cron Job
 *
 * Runs every 15 minutes. Finds all PENDING bookings whose appointment
 * date+time has passed and auto-expires them.
 *
 * For ONLINE PAID bookings: triggers a full refund via paymentService.
 * For CASH / unpaid bookings: marks as EXPIRED with no fee.
 *
 * This prevents the edge case where a vendor sees a PENDING booking days
 * after the appointment date and accepts it (which would be invalid).
 */

const cron = require('node-cron');
const Booking = require('../models/Booking');
const { notifyBookingCancelled } = require('./notificationService');

/**
 * Core expiry logic — can also be called manually for testing.
 * @returns {Promise<{ expired: number, failed: number }>}
 */
const expireStaleBookings = async () => {
  const now = new Date();
  let expired = 0;
  let failed = 0;

  try {
    // Find all PENDING bookings where the booking date is strictly before today
    // (i.e., the entire appointment day has passed)
    // We use bookingDate < start-of-today to be safe — same-day slots are handled
    // by the existing real-time guard in createBooking.
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const stalePendingBookings = await Booking.find({
      status: 'PENDING',
      bookingDate: { $lt: startOfToday },
    }).populate('salon');

    if (stalePendingBookings.length === 0) return { expired: 0, failed: 0 };

    console.log(`[BookingExpiry] Found ${stalePendingBookings.length} stale PENDING booking(s) to expire.`);

    for (const booking of stalePendingBookings) {
      try {
        // ── Online PAID bookings: trigger refund ──────────────────────────
        if (booking.paymentStatus === 'PAID' && booking.paymentMethod === 'ONLINE') {
          try {
            const paymentService = require('./paymentService');
            await paymentService.initiateRefund({
              bookingId: booking._id.toString(),
              userId: booking.user.toString(),
              userRole: 'admin', // system-initiated, bypass user ownership check
              reason: 'Booking auto-expired: vendor did not respond before the appointment date.',
            });
            // paymentService.initiateRefund handles status update internally
            console.log(`[BookingExpiry] Refund initiated for paid booking ${booking._id}`);
          } catch (refundErr) {
            // If refund fails, still expire the booking but log the issue
            console.error(`[BookingExpiry] Refund failed for booking ${booking._id}: ${refundErr.message}`);
            booking.status = 'EXPIRED';
            booking.cancellationReason = 'Auto-expired: appointment date passed with no vendor response. Refund pending manual review.';
            await booking.save();
          }
        } else {
          // ── CASH or unpaid PENDING: simple expiry, no fee ───────────────
          booking.status = 'EXPIRED';
          booking.cancellationReason = 'Auto-expired: appointment date passed with no vendor response.';
          await booking.save();
        }

        // Notify user that their booking has been auto-expired
        try {
          await notifyBookingCancelled(booking, booking.user.toString(), 'user');
        } catch (notifyErr) {
          // Non-critical — log and continue
          console.warn(`[BookingExpiry] Notification failed for booking ${booking._id}: ${notifyErr.message}`);
        }

        expired++;
      } catch (err) {
        failed++;
        console.error(`[BookingExpiry] Failed to expire booking ${booking._id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[BookingExpiry] Cron job error: ${err.message}`);
  }

  if (expired > 0 || failed > 0) {
    console.log(`[BookingExpiry] Done. Expired: ${expired}, Failed: ${failed}`);
  }

  return { expired, failed };
};

/**
 * Start the booking expiry cron job.
 * Runs every 15 minutes.
 * Safe to call multiple times — returns existing task if already started.
 */
let cronTask = null;

const startBookingExpiryCron = () => {
  if (cronTask) return cronTask;

  // Run every 15 minutes: '0,15,30,45 * * * *'
  cronTask = cron.schedule('0,15,30,45 * * * *', async () => {
    console.log(`[BookingExpiry] Running stale booking expiry check at ${new Date().toISOString()}`);
    await expireStaleBookings();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // IST
  });

  console.log('✅ Booking expiry cron started (runs every 15 minutes, IST).');
  return cronTask;
};

/**
 * Stop the cron job (useful for graceful shutdown or testing).
 */
const stopBookingExpiryCron = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('🔴 Booking expiry cron stopped.');
  }
};

module.exports = { startBookingExpiryCron, stopBookingExpiryCron, expireStaleBookings };
