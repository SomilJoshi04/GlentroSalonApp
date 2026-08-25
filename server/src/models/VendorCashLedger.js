const mongoose = require('mongoose');

const vendorCashLedgerSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },

    grossAmountPaise: { type: Number, required: true, min: 0 },
    adminSharePaise: { type: Number, required: true, min: 0 },
    vendorNetSharePaise: { type: Number, required: true, min: 0 },

    cashStatus: {
      type: String,
      enum: ['UNSETTLED', 'PARTIALLY_SETTLED', 'SETTLED', 'REVERSED'],
      default: 'UNSETTLED',
      required: true,
    },

    settledAmountPaise: { type: Number, default: 0, min: 0 },
    remainingUnsettledAmountPaise: { type: Number, required: true, min: 0 },
    
    remainingVendorNetSharePaise: { type: Number, required: true, min: 0 },

    settlementAllocations: [
      {
        settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSettlement' },
        amountPaise: { type: Number, required: true, min: 0 },
        vendorSharePaise: { type: Number, required: true, min: 0 },
        allocatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

vendorCashLedgerSchema.index({ vendor: 1, cashStatus: 1, createdAt: 1 });
vendorCashLedgerSchema.index({ vendor: 1, booking: 1 });
vendorCashLedgerSchema.index({ booking: 1 });

module.exports = mongoose.model('VendorCashLedger', vendorCashLedgerSchema);
