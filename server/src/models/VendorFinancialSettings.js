const mongoose = require('mongoose');

const vendorFinancialSettingsSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      unique: true,
    },
    cashLimitEnabled: {
      type: Boolean,
      default: true,
    },
    cashHoldingLimitPaise: {
      type: Number,
      default: 100000, // ₹1,000 default
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who last updated this
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VendorFinancialSettings', vendorFinancialSettingsSchema);
