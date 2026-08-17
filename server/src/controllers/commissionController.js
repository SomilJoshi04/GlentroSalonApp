const Commission = require('../models/Commission');
const PlatformFee = require('../models/PlatformFee');
const Vendor = require('../models/Vendor');
const { calculateCharges } = require('../services/commissionService');

const getCommissions = async (req, res, next) => {
  try {
    const commissions = await Commission.find().populate('vendor', 'name businessName email');
    res.json({ success: true, data: commissions });
  } catch (error) { next(error); }
};

const setCommission = async (req, res, next) => {
  try {
    const { vendor, percentage, notes } = req.body;
    let commission = await Commission.findOne({ vendor });
    if (commission) {
      commission.percentage = percentage;
      commission.notes = notes || '';
      await commission.save();
    } else {
      commission = await Commission.create({ vendor, percentage, notes });
    }
    // Also update vendor model
    await Vendor.findByIdAndUpdate(vendor, { commissionRate: percentage });
    res.json({ success: true, message: 'Commission set', data: commission });
  } catch (error) { next(error); }
};

const getPlatformFee = async (req, res, next) => {
  try {
    let fee = await PlatformFee.findOne({ isActive: true });
    if (!fee) {
      fee = await PlatformFee.create({ feePercentage: 5, cancellationFeePercentage: 25 });
    }
    res.json({ success: true, data: fee });
  } catch (error) { next(error); }
};

const updatePlatformFee = async (req, res, next) => {
  try {
    const { feePercentage, cancellationFeePercentage } = req.body;
    let fee = await PlatformFee.findOne({ isActive: true });
    if (fee) {
      if (feePercentage !== undefined) fee.feePercentage = feePercentage;
      if (cancellationFeePercentage !== undefined) fee.cancellationFeePercentage = cancellationFeePercentage;
      fee.updatedBy = req.user.id;
      await fee.save();
    } else {
      fee = await PlatformFee.create({
        feePercentage: feePercentage || 5,
        cancellationFeePercentage: cancellationFeePercentage || 25,
        updatedBy: req.user.id,
      });
    }
    res.json({ success: true, message: 'Platform fee updated', data: fee });
  } catch (error) { next(error); }
};

const calculateVendorCharges = async (req, res, next) => {
  try {
    const { vendorId, amount } = req.body;
    const charges = await calculateCharges(vendorId, amount);
    res.json({ success: true, data: charges });
  } catch (error) { next(error); }
};

module.exports = { getCommissions, setCommission, getPlatformFee, updatePlatformFee, calculateVendorCharges };
