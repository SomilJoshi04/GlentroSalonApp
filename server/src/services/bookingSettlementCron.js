const cron = require('node-cron');
const Booking = require('../models/Booking');
const VendorWallet = require('../models/VendorWallet');
const VendorLedger = require('../models/VendorLedger');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/emailService');

/**
 * The Auto-Settlement Trap
 * Runs daily at 1:00 AM.
 * Finds CONFIRMED bookings where the appointment passed 24 hours ago.
 * Marks them AUTO_SETTLED and deducts commission as penalty.
 */
const startBookingSettlementCron = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('[CRON] Running Auto-Settlement Trap...');
    try {
      const now = new Date();
      // 24 hours ago
      const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find CONFIRMED bookings where bookingDate is before cutoffTime
      const staleBookings = await Booking.find({
        status: 'CONFIRMED',
        bookingDate: { $lt: cutoffTime },
      }).populate('salon user');

      if (staleBookings.length === 0) {
        console.log('[CRON] No stale confirmed bookings found.');
        return;
      }

      console.log(`[CRON] Found ${staleBookings.length} bookings for auto-settlement.`);

      for (const booking of staleBookings) {
        const vendorId = booking.salon.vendor;

        // Calculate commission to deduct (Assuming commission & platformFee exist on booking)
        const commissionAmt = (booking.commission || 0) + (booking.platformFee || 0);
        const commissionPaise = Math.round(commissionAmt * 100);

        if (commissionPaise > 0) {
          // Add to pending dues (recoveryOutstanding)
          await VendorWallet.addDuesAndCheckSuspension(vendorId, commissionPaise);

          // Add ledger entry
          await VendorLedger.create({
            vendor: vendorId,
            salon: booking.salon._id,
            booking: booking._id,
            entryType: 'WALLET_RECOVERY',
            amount: commissionAmt,
            amountPaise: commissionPaise,
            direction: 'DEBIT',
            description: `Auto-settlement commission for unattended Booking #${booking._id}`,
          });
        }

        // Update booking status
        booking.status = 'AUTO_SETTLED';
        await booking.save();

        // Notify Vendor
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif;">
              <h2 style="color: #D32F2F;">Booking Auto-Settled (Action Missed)</h2>
              <p>Your booking <b>#${booking._id}</b> was not updated 24 hours after the appointment time.</p>
              <p>As per platform policy, the system has automatically marked it as Settled and deducted the commission (₹${commissionAmt}) from your wallet.</p>
              <p>If this was a No-Show, please ensure you mark it on time in the future.</p>
            </div>
          `;
          const Vendor = require('../models/Vendor');
          const vendor = await Vendor.findById(vendorId);
          if (vendor) {
            await sendEmail({
              to: vendor.email,
              subject: 'Booking Auto-Settled Penalty',
              html: emailHtml,
            });
            
            // Create In-App Notification
            await Notification.create({
              recipient: vendorId,
              recipientModel: 'Vendor',
              recipientRole: 'vendor',
              type: 'SYSTEM',
              title: 'Booking Auto-Settled (Action Missed)',
              message: `Your booking #${booking._id} was automatically settled after 24 hours of inactivity. Commission of ₹${commissionAmt} was added to your pending dues.`,
              data: { bookingId: booking._id }
            });
          }
        } catch (emailErr) {
          console.error('[CRON] Failed to send penalty email:', emailErr.message);
        }
      }

      console.log(`[CRON] Successfully auto-settled ${staleBookings.length} bookings.`);
    } catch (error) {
      console.error('[CRON] Error in Auto-Settlement:', error);
    }
  });
};

module.exports = startBookingSettlementCron;
