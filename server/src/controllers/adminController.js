const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');
const BookingService = require('../models/BookingService');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Package = require('../models/Package');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const AccountRecoveryRequest = require('../models/AccountRecoveryRequest');
const Notification = require('../models/Notification');
const PaymentTransaction = require('../models/PaymentTransaction');
const { getIO } = require('../config/socket');
const { sanitizeVendorForAdmin } = require('../utils/kycUtils');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';
    let startDate = new Date();
    
    // Set startDate based on range
    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (range === '3m') startDate.setMonth(startDate.getMonth() - 3);
    else if (range === '6m') startDate.setMonth(startDate.getMonth() - 6);
    else if (range === '12m') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setDate(startDate.getDate() - 30); // fallback

    const dateFilter = { createdAt: { $gte: startDate } };

    const [
      totalUsers, totalVendors, totalSalons, 
      activeVendors, revenueData, bookingStats
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }), // Absolute count
      Vendor.countDocuments(),               // Absolute count
      Salon.countDocuments(),                // Absolute count
      Vendor.countDocuments({ isActive: true, isApproved: true }), // Absolute count

      // Payment aggregation for the date range
      PaymentTransaction.aggregate([
        { $match: { ...dateFilter, status: 'PAID' } },
        { $group: {
          _id: null,
          totalAdminRevenue: { $sum: '$pricing.adminRevenue' },
          totalCommission: { $sum: '$pricing.commissionAmount' },
          totalPlatformFee: { $sum: '$pricing.platformFee' },
          totalGrossOnline: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'ONLINE'] }, '$amount', 0] } },
          totalGrossCash: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'CASH'] }, '$amount', 0] } },
        }}
      ]),

      // Booking aggregation for the date range
      Booking.aggregate([
        { $match: dateFilter },
        { $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          pendingBookings: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        }}
      ])
    ]);

    const revenue = revenueData[0] || { totalAdminRevenue: 0, totalCommission: 0, totalPlatformFee: 0, totalGrossOnline: 0, totalGrossCash: 0 };
    const bookings = bookingStats[0] || { totalBookings: 0, completedBookings: 0, pendingBookings: 0 };

    res.json({
      success: true,
      data: {
        // Absolute counts (not affected by date range)
        totalUsers, 
        totalVendors, 
        totalSalons, 
        activeVendors,
        
        // Range-based metrics
        totalBookings: bookings.totalBookings,
        pendingBookings: bookings.pendingBookings,
        completedBookings: bookings.completedBookings,

        totalRevenue: revenue.totalAdminRevenue,
        totalCommission: revenue.totalCommission,
        totalPlatformFee: revenue.totalPlatformFee,
        
        totalGrossOnline: revenue.totalGrossOnline,
        totalGrossCash: revenue.totalGrossCash,
      },
    });
  } catch (error) { next(error); }
};

// @desc    Get recent bookings for admin
// @route   GET /api/admin/recent-bookings
// @access  Private/Admin
const getRecentBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('salon', 'name')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, data: bookings });
  } catch (error) { next(error); }
};

// @desc    Get booking stats by month for charts
// @route   GET /api/admin/booking-stats
// @access  Private/Admin
const getBookingStats = async (req, res, next) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$finalAmount' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const query = { role: 'user' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'active') query.accountStatus = { $nin: ['deleted', 'recovery_requested'] };
    if (status === 'deleted') query.accountStatus = 'deleted';
    if (status === 'recovery_requested') query.accountStatus = 'recovery_requested';
    // Backwards compatibility
    if (status === 'inactive') query.isActive = false;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get booking counts for these users
    const userIds = users.map(u => u._id);
    const bookingsCount = await Booking.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);

    const usersWithStats = users.map(user => {
      const bCount = bookingsCount.find(b => b._id.toString() === user._id.toString());
      return {
        ...user.toObject(),
        totalBookings: bCount ? bCount.count : 0
      };
    });

    res.json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: usersWithStats
    });
  } catch (error) { next(error); }
};

// @desc    Update user status (Activate/Deactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (isActive !== undefined) user.isActive = isActive;
    
    // Also update accountStatus manually if needed for admin deactivate
    if (isActive === false && user.accountStatus !== 'deleted') {
      // Actually Admin deactivate shouldn't mean "deleted" (soft delete), but let's keep it separate
      // Active/Inactive is separate from accountStatus
    }
    await user.save();

    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @desc    Get all vendors with pagination and filtering
// @route   GET /api/admin/vendors
// @access  Private/Admin
const getVendors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let query = {};

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'pending') query.isApproved = false;
    if (status === 'active') { query.isApproved = true; query.isActive = true; }
    if (status === 'inactive') { query.isApproved = true; query.isActive = false; }

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Populate ALL salons per vendor (not just the first one)
    const vendorIds = vendors.map(v => v._id);
    const salons = await Salon.find({ vendor: { $in: vendorIds } }).select('vendor name address city location status isActive isApproved');
    const salonIds = salons.map(s => s._id);
    
    const bookingsCount = await Booking.aggregate([
      { $match: { salon: { $in: salonIds } } },
      { $group: { _id: '$salon', count: { $sum: 1 } } }
    ]);

    const vendorsWithStats = vendors.map(vendor => {
      // Get ALL salons for this vendor
      const vendorSalons = salons.filter(s => s.vendor.toString() === vendor._id.toString());
      const vendorSalonIds = vendorSalons.map(s => s._id.toString());

      // Sum bookings across ALL vendor's salons
      let totalBookingsCount = 0;
      bookingsCount.forEach(b => {
        if (vendorSalonIds.includes(b._id.toString())) {
          totalBookingsCount += b.count;
        }
      });

      return {
        ...vendor.toObject(),
        salons: vendorSalons,
        salonCount: vendorSalons.length,
        totalBookings: totalBookingsCount
      };
    });

    res.json({
      success: true,
      count: vendors.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: vendorsWithStats
    });
  } catch (error) { next(error); }
};

// @desc    Get vendor detail with all salons (Admin)
// @route   GET /api/admin/vendors/:id
// @access  Private/Admin
const getVendorDetail = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const salons = await Salon.find({ vendor: vendor._id });
    const salonIds = salons.map(s => s._id);

    // Get aggregate stats
    const [bookingStats, staffCount, serviceCount] = await Promise.all([
      Booking.aggregate([
        { $match: { salon: { $in: salonIds } } },
        { $group: { _id: null, total: { $sum: 1 } } }
      ]),
      Staff.countDocuments({ salon: { $in: salonIds } }),
      Service.countDocuments({ salon: { $in: salonIds } }),
    ]);

    res.json({
      success: true,
      data: {
        vendor: sanitizeVendorForAdmin(vendor),
        salons,
        stats: {
          totalBookings: bookingStats[0]?.total || 0,
          totalStaff: staffCount,
          totalServices: serviceCount,
          totalSalons: salons.length,
        }
      }
    });
  } catch (error) { next(error); }
};

// @desc    Create vendor (Admin) — creates business owner, NOT a salon
// @route   POST /api/admin/vendors
// @access  Private/Admin
const createVendor = async (req, res, next) => {
  try {
    const {
      name, email, phone, password, businessName,
      businessType, businessDescription, businessEmail, businessContact,
      registeredAddress, city, state, country,
      commissionRate, kycStatus, accountStatus
    } = req.body;

    // Check for existing vendor
    const existing = await Vendor.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Vendor with this email already exists' });

    const vendorData = {
      name, email, phone, password: password || 'Temp@1234',
      businessName,
      businessType: businessType || '',
      businessDescription: businessDescription || '',
      businessEmail: businessEmail || '',
      businessContact: businessContact || '',
      registeredAddress: registeredAddress || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      commissionRate: commissionRate || 0,
      kycStatus: kycStatus || 'pending',
      accountStatus: accountStatus || 'active',
      isApproved: false,
    };

    const vendor = await Vendor.create(vendorData);
    res.status(201).json({ success: true, message: 'Vendor created successfully', data: vendor });
  } catch (error) { next(error); }
};

// @desc    Update vendor details (Admin)
// @route   PUT /api/admin/vendors/:id
// @access  Private/Admin
const updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    // Allow updating all vendor-level fields
    const allowedFields = [
      'name', 'phone', 'businessName', 'businessType', 'businessDescription',
      'businessEmail', 'businessContact', 'registeredAddress', 'city', 'state', 'country',
      'commissionRate', 'accountStatus'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    // Handle bank details
    if (req.body.bank) {
      Object.keys(req.body.bank).forEach(key => {
        updateData[`bank.${key}`] = req.body.bank[key];
      });
    }

    const updated = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Vendor updated', data: updated });
  } catch (error) { next(error); }
};

// @desc    Update KYC status (Admin — verify/reject)
// @route   PATCH /api/admin/vendors/:id/kyc
// @access  Private/Admin
const updateKycStatus = async (req, res, next) => {
  try {
    const { kycStatus, kycRejectReason } = req.body;
    if (!['pending', 'submitted', 'verified', 'rejected'].includes(kycStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid KYC status' });
    }

    const updateData = { kycStatus };
    if (kycStatus === 'rejected' && kycRejectReason) {
      updateData.kycRejectReason = kycRejectReason;
    } else {
      updateData.kycRejectReason = '';
    }

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    res.json({ success: true, message: `KYC status updated to ${kycStatus}`, data: vendor });
  } catch (error) { next(error); }
};

// @desc    Update vendor status (Approve/Suspend) — cascades to salons
// @route   PUT /api/admin/vendors/:id/status
// @access  Private/Admin
const updateVendorStatus = async (req, res, next) => {
  try {
    const { isApproved, isActive } = req.body;
    
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (isApproved !== undefined) vendor.isApproved = isApproved;
    if (isActive !== undefined) {
      vendor.isActive = isActive;
      vendor.accountStatus = isActive ? 'active' : 'suspended';
    }

    await vendor.save();

    // When vendor is suspended, suspend all their salons
    if (isActive === false) {
      await Salon.updateMany({ vendor: vendor._id }, { isActive: false, status: 'suspended' });
    }

    res.json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

// @desc    Get pending counts for sidebar badges
// @route   GET /api/admin/pending-counts
// @access  Private/Admin
const getPendingCounts = async (req, res, next) => {
  try {
    const [vendors, packages, bookings] = await Promise.all([
      Vendor.countDocuments({ isApproved: false }),
      Package.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'PENDING' })
    ]);

    res.json({
      success: true,
      data: { vendors, packages, bookings }
    });
  } catch (error) { next(error); }
};

// @desc    Get all bookings with advanced filtering and pagination
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, vendorId, search, startDate, endDate } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status.toUpperCase();
    }

    if (vendorId) {
      const vendorSalons = await Salon.find({ vendor: vendorId }).select('_id');
      query.salon = { $in: vendorSalons.map(s => s._id) };
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Search by booking ID (short id if implemented, or exact match)
    if (search) {
      // Need to find users or vendors matching search, or exact booking ID
      // For simplicity, search user name/email
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);

      query.$or = [
        { user: { $in: userIds } }
      ];

      // If search is a valid ObjectId, search by ID
      if (mongoose.isValidObjectId(search)) {
        query.$or.push({ _id: search });
      }
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('user', 'name email avatar')
      .populate({
        path: 'salon',
        select: 'name location city address vendor',
        populate: { path: 'vendor', select: 'name businessName email' }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Fetch related services for the returned bookings
    const BookingService = require('../models/BookingService');
    const bookingIds = bookings.map(b => b._id);
    const bookingServices = await BookingService.find({ booking: { $in: bookingIds } })
      .populate('service', 'name price')
      .populate('staff', 'name');

    const formattedBookings = bookings.map(booking => {
      const bObj = booking.toObject();
      bObj.services = bookingServices.filter(bs => bs.booking.toString() === booking._id.toString());
      // For convenience in frontend, pull vendor out of salon if present
      if (bObj.salon && bObj.salon.vendor) {
        bObj.vendor = bObj.salon.vendor;
      }
      return bObj;
    });

    res.json({
      success: true,
      count: formattedBookings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: formattedBookings
    });
  } catch (error) { next(error); }
};

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Private/Admin
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

// @desc    Get all subcategories
// @route   GET /api/admin/subcategories
// @access  Private/Admin
const getSubcategories = async (req, res, next) => {
  try {
    const subcategories = await Subcategory.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subcategories });
  } catch (error) { next(error); }
};

// @desc    Get all services with filtering and pagination
// @route   GET /api/admin/services
// @access  Private/Admin
const getServices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';

    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Service.countDocuments(query);
    const services = await Service.find(query)
      .populate('salon', 'name city location')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      count: services.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: services
    });
  } catch (error) { next(error); }
};

// ── Vendor Cash Control ────────────────────────────────────────────────────────
const { getVendorFinancials } = require('../services/vendorCashService');
const VendorFinancialSettings = require('../models/VendorFinancialSettings');

// @desc    Get all vendors with their cash limit status
// @route   GET /api/admin/vendor-cash-control
// @access  Private/Admin
const getVendorCashControl = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const total = await Vendor.countDocuments();
    const vendors = await Vendor.find()
      .select('name businessName email phone accountStatus suspensionReasons isActive isApproved')
      .skip((page - 1) * limit)
      .limit(limit);

    const vendorCashStats = await Promise.all(
      vendors.map(async (vendor) => {
        const financials = await getVendorFinancials(vendor._id);
        return {
          ...vendor.toObject(),
          cashFinancials: financials,
        };
      })
    );

    res.json({
      success: true,
      count: vendorCashStats.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: vendorCashStats,
    });
  } catch (error) { next(error); }
};

// @desc    Update a vendor's cash limit
// @route   PUT /api/admin/vendor-cash-control/:id
// @access  Private/Admin
const updateVendorCashLimit = async (req, res, next) => {
  try {
    const { cashLimitEnabled, cashHoldingLimitPaise } = req.body;
    const vendorId = req.params.id;

    const settings = await VendorFinancialSettings.findOneAndUpdate(
      { vendor: vendorId },
      {
        cashLimitEnabled,
        cashHoldingLimitPaise,
        updatedBy: req.user.id,
      },
      { new: true, upsert: true }
    );
    
    // Recalculate suspension if needed
    const { syncVendorCashSuspension } = require('../services/vendorCashService');
    await syncVendorCashSuspension(vendorId);

    res.json({ success: true, data: settings, message: 'Vendor cash limit updated' });
  } catch (error) { next(error); }
};

// ── Account Recovery Requests ──────────────────────────────────────────────────
// @desc    Get all account recovery requests
// @route   GET /api/admin/account-recovery
// @access  Private/Admin
const getAccountRecoveryRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || 'pending';
    const search = req.query.search || '';

    let query = { status };
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const total = await AccountRecoveryRequest.countDocuments(query);
    const requests = await AccountRecoveryRequest.find(query)
      .populate('userId', 'name email phone accountStatus deleteAccount')
      .populate('reviewedBy', 'name')
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Also get pending count for badges
    const pendingCount = await AccountRecoveryRequest.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      count: requests.length,
      total,
      pendingCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: requests
    });
  } catch (error) { next(error); }
};

// @desc    Get single recovery request
// @route   GET /api/admin/account-recovery/:id
// @access  Private/Admin
const getAccountRecoveryRequestById = async (req, res, next) => {
  try {
    const request = await AccountRecoveryRequest.findById(req.params.id)
      .populate('userId', 'name email phone accountStatus deleteAccount recoverAccount')
      .populate('reviewedBy', 'name');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Recovery request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) { next(error); }
};

// @desc    Approve recovery request
// @route   PATCH /api/admin/account-recovery/:id/approve
// @access  Private/Admin
const approveAccountRecovery = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await AccountRecoveryRequest.findById(req.params.id).session(session);
    
    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Recovery request not found' });
    }

    if (request.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    const user = await User.findById(request.userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.accountStatus !== 'recovery_requested') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'User is not in recovery requested state' });
    }

    // Update User
    user.accountStatus = 'active';
    user.recoverAccount = {
      requestedAt: null,
      reason: null,
      recoveredAt: new Date(),
      recoveredBy: req.user.id
    };
    await user.save({ session });

    // Update Request
    request.status = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user.id;
    await request.save({ session });

    // Create Notification
    const notification = await Notification.create([{
      recipient: user._id,
      recipientModel: 'User',
      recipientRole: 'user',
      type: 'ACCOUNT_RECOVERED',
      title: 'Account Recovered',
      message: 'Your GlentroSalon account has been recovered successfully. You can now log in again.',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Send real-time notification to user if connected
    const io = getIO();
    if (io) {
      io.to(user._id.toString()).emit('notification', notification[0]);
    }

    res.json({ success: true, message: 'Account recovered successfully.', data: request });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Reject recovery request
// @route   PATCH /api/admin/account-recovery/:id/reject
// @access  Private/Admin
const rejectAccountRecovery = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { adminNote } = req.body;
    
    if (!adminNote) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const request = await AccountRecoveryRequest.findById(req.params.id).session(session);
    
    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Recovery request not found' });
    }

    if (request.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    const user = await User.findById(request.userId).session(session);
    
    if (user && user.accountStatus === 'recovery_requested') {
      // Revert to deleted
      user.accountStatus = 'deleted';
      user.recoverAccount.requestedAt = null;
      user.recoverAccount.reason = null;
      await user.save({ session });
    }

    // Update Request
    request.status = 'rejected';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user.id;
    request.adminNote = adminNote;
    await request.save({ session });

    // Create Notification
    if (user) {
      const notification = await Notification.create([{
        recipient: user._id,
        recipientModel: 'User',
        recipientRole: 'user',
        type: 'RECOVERY_REJECTED',
        title: 'Recovery Request Rejected',
        message: 'Your account recovery request was not approved. Please contact support for assistance.',
      }], { session });
      
      const io = getIO();
      if (io) {
        io.to(user._id.toString()).emit('notification', notification[0]);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Recovery request rejected.', data: request });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// @desc    Get comprehensive analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';
    let startDate = new Date();
    
    // Set startDate based on range
    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (range === '3m') startDate.setMonth(startDate.getMonth() - 3);
    else if (range === '6m') startDate.setMonth(startDate.getMonth() - 6);
    else if (range === '12m') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setDate(startDate.getDate() - 30); // fallback

    // Grouping format based on range
    let groupByFormat;
    if (range === '7d' || range === '30d') {
      groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else {
      groupByFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    }

    // 1. Booking Overview & Revenue Overview (Trend)
    const bookingTrendAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: groupByFormat,
          totalBookings: { $sum: 1 },
          completedBookings: { 
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } 
          },
          revenue: { 
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$finalAmount", 0] } 
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 2. Booking Status Distribution
    const bookingStatusAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. User Growth
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDate }, role: 'user', accountStatus: { $ne: 'deleted' } } },
      {
        $group: {
          _id: groupByFormat,
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 4. Vendor Growth
    const vendorGrowthAgg = await Vendor.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ["$isApproved", false] }, then: "Pending" },
                { case: { $and: [{ $eq: ["$isApproved", true] }, { $eq: ["$isActive", true] }] }, then: "Active" },
                { case: { $and: [{ $eq: ["$isApproved", true] }, { $eq: ["$isActive", false] }] }, then: "Inactive" }
              ],
              default: "Other"
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 5. Top Salons
    const topSalonsAgg = await Booking.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$salon",
          revenue: { $sum: "$finalAmount" },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'salons',
          localField: '_id',
          foreignField: '_id',
          as: 'salonDoc'
        }
      },
      { $unwind: "$salonDoc" },
      {
        $project: {
          name: "$salonDoc.name",
          revenue: 1,
          bookings: 1
        }
      }
    ]);

    // 6. Top Services
    const topServicesAgg = await BookingService.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingDoc'
        }
      },
      { $unwind: '$bookingDoc' },
      { $match: { 'bookingDoc.status': 'COMPLETED', 'bookingDoc.createdAt': { $gte: startDate } } },
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDoc'
        }
      },
      { $unwind: '$serviceDoc' },
      {
        $project: {
          name: '$serviceDoc.name',
          count: 1
        }
      }
    ]);
    // 7. Revenue Overview (from PaymentTransaction)
    const revenueOverviewAgg = await PaymentTransaction.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'PAID' } },
      {
        $group: {
          _id: groupByFormat,
          platformFee: { $sum: '$pricing.platformFee' },
          adminCommission: { $sum: '$pricing.commissionAmount' },
          grossBookingValue: { $sum: '$amount' }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 8. Payment Method Overview
    const paymentMethodAgg = await PaymentTransaction.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          volume: { $sum: "$amount" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bookingTrend: bookingTrendAgg,
        bookingStatus: bookingStatusAgg,
        userGrowth: userGrowthAgg,
        vendorGrowth: vendorGrowthAgg,
        topSalons: topSalonsAgg,
        topServices: topServicesAgg,
        revenueOverview: revenueOverviewAgg,
        paymentMethods: paymentMethodAgg
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentBookings,
  getBookingStats,
  getUsers,
  updateUserStatus,
  getVendors,
  getVendorDetail,
  createVendor,
  updateVendor,
  updateKycStatus,
  updateVendorStatus,
  getPendingCounts,
  getAllBookings,
  getAccountRecoveryRequests,
  getAccountRecoveryRequestById,
  approveAccountRecovery,
  rejectAccountRecovery,
  getCategories,
  getSubcategories,
  getServices,
  getAnalytics,
  getVendorCashControl,
  updateVendorCashLimit
};
