const Vendor = require('../models/Vendor');
const Salon = require('../models/Salon');

// @desc    Get all vendors (Admin)
const getVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isApproved, isActive } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { businessName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const vendors = await Vendor.find(query).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Vendor.countDocuments(query);

    res.json({ success: true, data: { vendors, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get vendor by ID
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const salons = await Salon.find({ vendor: vendor._id });
    res.json({ success: true, data: { vendor, salons } });
  } catch (error) { next(error); }
};

const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

// @desc    Update vendor profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, businessName } = req.body;
    let newImage = null;

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    let oldImage = vendor.avatar;

    if (req.file) {
      newImage = await processAndStoreImage(req.file.buffer, 'vendor');
    }

    const updateData = { name, phone, businessName };
    if (newImage) {
      updateData.avatar = newImage;
    } else if (req.body.avatar === '') {
      updateData.avatar = '';
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(req.user.id, updateData, { new: true, runValidators: true }).select('-password');
    
    // Cleanup old image
    if ((newImage || req.body.avatar === '') && oldImage && !oldImage.startsWith('data:')) {
      deleteImageSafe(oldImage);
    }

    res.json({ success: true, message: 'Profile updated', data: updatedVendor });
  } catch (error) { next(error); }
};

// @desc    Approve vendor (Admin)
const approveVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    // Also approve their salons
    await Salon.updateMany({ vendor: vendor._id }, { isApproved: true });
    res.json({ success: true, message: 'Vendor approved', data: vendor });
  } catch (error) { next(error); }
};

// @desc    Reject vendor (Admin)
const rejectVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { isApproved: false }, { new: true }).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor rejected', data: vendor });
  } catch (error) { next(error); }
};

// @desc    Toggle vendor active status (Admin)
const toggleVendorStatus = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.isActive = !vendor.isActive;
    await vendor.save();
    res.json({ success: true, message: `Vendor ${vendor.isActive ? 'activated' : 'deactivated'}`, data: vendor });
  } catch (error) { next(error); }
};

// @desc    Update FCM token
const updateFcmToken = async (req, res, next) => {
  try {
    await Vendor.findByIdAndUpdate(req.user.id, { fcmToken: req.body.fcmToken });
    res.json({ success: true, message: 'FCM token updated' });
  } catch (error) { next(error); }
};

module.exports = { getVendors, getVendorById, updateProfile, approveVendor, rejectVendor, toggleVendorStatus, updateFcmToken };
