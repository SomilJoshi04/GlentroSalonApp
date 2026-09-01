const Vendor = require('../models/Vendor');
const Salon = require('../models/Salon');
const { sanitizeVendorForPublic, sanitizeVendorForVendor, sanitizeVendorForAdmin } = require('../utils/kycUtils');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

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

// @desc    Get vendor by ID (Admin gets full data, Vendor gets own masked data, others get public)
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const salons = await Salon.find({ vendor: vendor._id });

    let sanitizedVendor;
    if (req.user.role === 'admin') {
      sanitizedVendor = sanitizeVendorForAdmin(vendor);
    } else if (req.user.role === 'vendor' && req.user.id.toString() === vendor._id.toString()) {
      sanitizedVendor = sanitizeVendorForVendor(vendor);
    } else {
      sanitizedVendor = sanitizeVendorForPublic(vendor);
    }

    res.json({ success: true, data: { vendor: sanitizedVendor, salons } });
  } catch (error) { next(error); }
};

// @desc    Get vendor's own profile (masked sensitive data)
// @route   GET /api/vendors/me
const getOwnProfile = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user.id).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const salons = await Salon.find({ vendor: vendor._id }).select('name city status isActive isApproved');
    const sanitized = sanitizeVendorForVendor(vendor);
    res.json({ success: true, data: { vendor: sanitized, salons } });
  } catch (error) { next(error); }
};

// @desc    Update vendor profile (personal + business info)
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email, businessName, businessType, businessDescription, businessEmail, businessContact, registeredAddress, city, state, country } = req.body;
    let newImage = null;

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    let oldImage = vendor.avatar;

    if (req.file) {
      newImage = await processAndStoreImage(req.file.buffer, 'vendor');
    }

    const updateData = {};
    // Personal fields
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (businessName !== undefined) updateData.businessName = businessName;
    // Business fields
    if (businessType !== undefined) updateData.businessType = businessType;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (businessEmail !== undefined) updateData.businessEmail = businessEmail;
    if (businessContact !== undefined) updateData.businessContact = businessContact;
    if (registeredAddress !== undefined) updateData.registeredAddress = registeredAddress;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;

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

    res.json({ success: true, message: 'Profile updated', data: sanitizeVendorForVendor(updatedVendor) });
  } catch (error) { next(error); }
};

// @desc    Submit/update KYC documents (Vendor)
// @route   PUT /api/vendors/kyc
const updateKyc = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const { aadhaarNumber, panNumber } = req.body;
    const updateData = {};

    if (aadhaarNumber) updateData['kyc.aadhaarNumber'] = aadhaarNumber;
    if (panNumber) updateData['kyc.panNumber'] = panNumber;

    // Handle KYC document uploads
    if (req.files) {
      if (req.files.aadhaarFront && req.files.aadhaarFront[0]) {
        const filename = await processAndStoreImage(req.files.aadhaarFront[0].buffer, 'kyc');
        if (vendor.kyc?.aadhaarFront) deleteImageSafe(vendor.kyc.aadhaarFront);
        updateData['kyc.aadhaarFront'] = filename;
      }
      if (req.files.aadhaarBack && req.files.aadhaarBack[0]) {
        const filename = await processAndStoreImage(req.files.aadhaarBack[0].buffer, 'kyc');
        if (vendor.kyc?.aadhaarBack) deleteImageSafe(vendor.kyc.aadhaarBack);
        updateData['kyc.aadhaarBack'] = filename;
      }
      if (req.files.panCard && req.files.panCard[0]) {
        const filename = await processAndStoreImage(req.files.panCard[0].buffer, 'kyc');
        if (vendor.kyc?.panCard) deleteImageSafe(vendor.kyc.panCard);
        updateData['kyc.panCard'] = filename;
      }
    }

    // Set KYC status to submitted if documents are being uploaded
    if (Object.keys(updateData).length > 0) {
      if (vendor.kycStatus === 'pending' || vendor.kycStatus === 'rejected') {
        updateData.kycStatus = 'submitted';
      }
    }

    const updated = await Vendor.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.json({ success: true, message: 'KYC documents updated', data: sanitizeVendorForVendor(updated) });
  } catch (error) { next(error); }
};

// @desc    Update bank/payout details (Vendor)
// @route   PUT /api/vendors/bank
const updateBankDetails = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const { accountHolderName, accountNumber, confirmAccountNumber, ifscCode, bankName, bankBranch, upiId } = req.body;

    // Validate account number confirmation
    if (accountNumber && confirmAccountNumber && accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ success: false, message: 'Account numbers do not match' });
    }

    const updateData = {};
    if (accountHolderName !== undefined) updateData['bank.accountHolderName'] = accountHolderName;
    if (accountNumber !== undefined) updateData['bank.accountNumber'] = accountNumber;
    if (ifscCode !== undefined) updateData['bank.ifscCode'] = ifscCode;
    if (bankName !== undefined) updateData['bank.bankName'] = bankName;
    if (bankBranch !== undefined) updateData['bank.bankBranch'] = bankBranch;
    if (upiId !== undefined) updateData['bank.upiId'] = upiId;

    const updated = await Vendor.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.json({ success: true, message: 'Bank details updated', data: sanitizeVendorForVendor(updated) });
  } catch (error) { next(error); }
};

// @desc    Serve KYC document (authenticated access only)
// @route   GET /api/vendors/documents/:field
const getKycDocument = async (req, res, next) => {
  try {
    const { field } = req.params;
    const allowedFields = ['aadhaarFront', 'aadhaarBack', 'panCard'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    let vendor;
    if (req.user.role === 'admin') {
      // Admin can access any vendor's documents via query param
      const vendorId = req.query.vendorId;
      if (!vendorId) return res.status(400).json({ success: false, message: 'vendorId is required' });
      vendor = await Vendor.findById(vendorId);
    } else if (req.user.role === 'vendor') {
      // Vendor can only access their own documents
      vendor = await Vendor.findById(req.user.id);
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const filePath = vendor.kyc?.[field];
    if (!filePath) return res.status(404).json({ success: false, message: 'Document not found' });

    // Resolve and serve the file
    const path = require('path');
    const fs = require('fs');
    const fullPath = path.join(__dirname, '..', '..', 'uploads', filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Document file not found' });
    }

    res.sendFile(fullPath);
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

// @desc    Toggle vendor active status (Admin) — also cascades to salons
const toggleVendorStatus = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.isActive = !vendor.isActive;
    vendor.accountStatus = vendor.isActive ? 'active' : 'suspended';
    await vendor.save();

    // When vendor is suspended, deactivate all their salons
    if (!vendor.isActive) {
      await Salon.updateMany({ vendor: vendor._id }, { isActive: false, status: 'suspended' });
    }

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

module.exports = { getVendors, getVendorById, getOwnProfile, updateProfile, updateKyc, updateBankDetails, getKycDocument, approveVendor, rejectVendor, toggleVendorStatus, updateFcmToken };
