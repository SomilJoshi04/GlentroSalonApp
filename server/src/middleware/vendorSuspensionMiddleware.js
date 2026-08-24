const Vendor = require('../models/Vendor');

/**
 * Middleware to check if a vendor is suspended for any reason.
 * Allows access to financial dashboard, settlements, support, profile.
 * Blocks business logic operations (managing services, bookings).
 */
const requireActiveVendor = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'vendor') {
      return res.status(401).json({ success: false, message: 'Not authorized as vendor' });
    }

    const vendor = await Vendor.findById(req.user.id).select('accountStatus suspensionReasons');
    
    if (!vendor) {
      return res.status(401).json({ success: false, message: 'Vendor not found' });
    }

    if (vendor.accountStatus === 'suspended') {
      const isCashSuspension = vendor.suspensionReasons.includes('CASH_LIMIT_EXCEEDED');
      
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        suspensionReasons: vendor.suspensionReasons,
        message: isCashSuspension 
          ? 'Your account is suspended due to exceeding the cash holding limit. Please complete the cash settlement to restore access.'
          : 'Your account is suspended. Please contact support.',
      });
    }

    next();
  } catch (error) {
    console.error('Vendor suspension middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error during authorization' });
  }
};

module.exports = { requireActiveVendor };
