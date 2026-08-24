const VendorLedger = require('../models/VendorLedger');
const VendorFinancialSettings = require('../models/VendorFinancialSettings');
const CashSettlement = require('../models/CashSettlement');
const Vendor = require('../models/Vendor');
const Salon = require('../models/Salon');

const mongoose = require('mongoose');

/**
 * Get authoritative cash held by vendor based on physical cash collected minus cash paid to platform.
 */
const getCashHeld = async (vendorId) => {
  const ledgers = await VendorLedger.find({ vendor: vendorId });
  
  let totalCashReceived = 0;
  let totalCashRefunded = 0;
  let totalCashSettled = 0;

  for (const entry of ledgers) {
    const amtPaise = entry.amountPaise != null ? entry.amountPaise : Math.round((entry.amount || 0) * 100);
    
    if (entry.entryType === 'CASH_RECEIVED') {
      totalCashReceived += amtPaise;
    } else if (entry.entryType === 'REFUND_REVERSAL' && entry.paymentMethod === 'CASH') {
      totalCashRefunded += amtPaise;
    } else if (entry.entryType === 'CASH_SETTLEMENT_PAID') {
      totalCashSettled += amtPaise;
    }
  }

  const cashHeld = totalCashReceived - totalCashRefunded - totalCashSettled;
  return Math.max(0, cashHeld);
};

/**
 * Get the effective cash holding limit for the vendor.
 */
const getCashLimit = async (vendorId) => {
  const settings = await VendorFinancialSettings.findOne({ vendor: vendorId });
  if (settings && !settings.cashLimitEnabled) {
    return Infinity; // Limit disabled
  }
  
  if (settings && settings.cashHoldingLimitPaise !== undefined) {
    return settings.cashHoldingLimitPaise;
  }

  // Fallback default limit (e.g., ₹1000)
  return 100000;
};

/**
 * Recalculates and updates the vendor's suspension status for CASH_LIMIT_EXCEEDED
 */
const syncVendorCashSuspension = async (vendorId) => {
  const cashHeldPaise = await getCashHeld(vendorId);
  const cashLimitPaise = await getCashLimit(vendorId);
  const isExceeded = cashLimitPaise !== Infinity && cashHeldPaise > cashLimitPaise;

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) return;

  const hasSuspension = vendor.suspensionReasons.includes('CASH_LIMIT_EXCEEDED');

  let updated = false;
  if (isExceeded && !hasSuspension) {
    vendor.suspensionReasons.push('CASH_LIMIT_EXCEEDED');
    updated = true;
    
    // Deactivate only currently active salons
    await Salon.updateMany(
      { vendor: vendorId, isActive: true }, 
      { $set: { isActive: false, suspendedByCashLimit: true } }
    );
  } else if (!isExceeded && hasSuspension) {
    vendor.suspensionReasons = vendor.suspensionReasons.filter((r) => r !== 'CASH_LIMIT_EXCEEDED');
    updated = true;
    
    // Reactivate only salons that were suspended by the cash limit
    await Salon.updateMany(
      { vendor: vendorId, suspendedByCashLimit: true }, 
      { $set: { isActive: true, suspendedByCashLimit: false } }
    );
  }

  if (updated) {
    // Update accountStatus derived from suspension reasons
    if (vendor.suspensionReasons.length > 0) {
      vendor.accountStatus = 'suspended';
    } else if (vendor.accountStatus === 'suspended') {
      // Revert to active if no other suspensions exist
      vendor.accountStatus = 'active'; 
    }
    await vendor.save();
  }
};

/**
 * Returns comprehensive cash financials for a vendor.
 */
const getVendorFinancials = async (vendorId) => {
  const cashHeldPaise = await getCashHeld(vendorId);
  const cashHoldingLimitPaise = await getCashLimit(vendorId);

  let excessCashPaise = 0;
  if (cashHoldingLimitPaise !== Infinity) {
    excessCashPaise = Math.max(0, cashHeldPaise - cashHoldingLimitPaise);
  }

  // Get active pending settlement amount to avoid double charging
  const pendingSettlements = await CashSettlement.find({
    vendor: vendorId,
    status: 'PENDING',
  });
  
  const pendingSettlementPaise = pendingSettlements.reduce((sum, s) => sum + s.amountPaise, 0);

  return {
    cashHoldingLimitPaise: cashHoldingLimitPaise === Infinity ? null : cashHoldingLimitPaise,
    cashHeldPaise,
    excessCashPaise,
    settlementRequiredPaise: excessCashPaise,
    pendingSettlementPaise,
    settlementRemainingPaise: Math.max(0, excessCashPaise - pendingSettlementPaise),
    cashLimitExceeded: cashHoldingLimitPaise !== Infinity && cashHeldPaise > cashHoldingLimitPaise,
  };
};

module.exports = {
  getCashHeld,
  getCashLimit,
  syncVendorCashSuspension,
  getVendorFinancials,
};
