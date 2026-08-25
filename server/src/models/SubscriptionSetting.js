const mongoose = require('mongoose');

const subscriptionSettingSchema = new mongoose.Schema(
  {
    // A single document to store global settings
    singletonObj: {
      type: String,
      default: 'SINGLETON',
      unique: true,
    },
    systemEnabled: {
      type: Boolean,
      default: true,
    },
    freeTrialEnabled: {
      type: Boolean,
      default: true,
    },
    trialDurationDays: {
      type: Number,
      default: 14,
      min: 1,
    },
    allowTrialOnce: {
      type: Boolean,
      default: true,
    },
    gracePeriodDays: {
      type: Number,
      default: 3,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionSetting', subscriptionSettingSchema);
