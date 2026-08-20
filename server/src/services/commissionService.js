const Vendor = require('../models/Vendor');
const { calculateFinancialBreakdown } = require('../utils/calculateFees');

/**
 * Calculate charges for a booking based on vendor's plan
 */
const calculateCharges = async (vendorId, bookingAmount) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error('Vendor not found');

  return await calculateFinancialBreakdown(vendor, bookingAmount);
};

module.exports = { calculateCharges };
