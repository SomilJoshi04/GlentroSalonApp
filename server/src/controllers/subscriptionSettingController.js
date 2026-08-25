const SubscriptionSetting = require('../models/SubscriptionSetting');

// Get Settings (Initialization happens here if it doesn't exist)
const getSettings = async (req, res, next) => {
  try {
    let settings = await SubscriptionSetting.findOne({ singletonObj: 'SINGLETON' });
    if (!settings) {
      settings = await SubscriptionSetting.create({ singletonObj: 'SINGLETON' });
    }
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// Update Settings
const updateSettings = async (req, res, next) => {
  try {
    const { systemEnabled, freeTrialEnabled, trialDurationDays, allowTrialOnce, gracePeriodDays } = req.body;
    let settings = await SubscriptionSetting.findOneAndUpdate(
      { singletonObj: 'SINGLETON' },
      {
        systemEnabled,
        freeTrialEnabled,
        trialDurationDays,
        allowTrialOnce,
        gracePeriodDays,
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({
      success: true,
      message: 'Subscription settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
