const FAQ = require('../models/FAQ');

// @desc    Get all FAQs (Admin)
// @route   GET /api/faqs/admin
// @access  Private (Admin)
exports.getAllFAQs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find().sort('order createdAt');
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active FAQs (Public/User)
// @route   GET /api/faqs
// @access  Public
exports.getActiveFAQs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find({ isActive: true }).sort('order createdAt');
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new FAQ
// @route   POST /api/faqs
// @access  Private (Admin)
exports.createFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.create(req.body);
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
};

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private (Admin)
exports.updateFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    res.json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private (Admin)
exports.deleteFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
