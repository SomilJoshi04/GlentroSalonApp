const Booking = require('../models/Booking');
const razorpay = require('../utils/razorpay');
const crypto = require('crypto');

exports.createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus === 'PAID') return res.status(400).json({ success: false, message: 'Booking already paid' });

    if (!razorpay) return res.status(500).json({ success: false, message: 'Razorpay not configured on server' });

    const options = {
      amount: Math.round(booking.finalAmount * 100), // amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_order_${booking._id}`,
    };

    const order = await razorpay.orders.create(options);

    // Save the order ID to the booking
    booking.razorpayOrderId = order.id;
    await booking.save();

    res.status(200).json({
      success: true,
      data: {
        order,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ success: false, message: 'Payment initiation failed', error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE',
      transactionId: razorpay_payment_id,
      status: 'CONFIRMED' // Mark confirmed upon successful payment
    }, { new: true });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
};
