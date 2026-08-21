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
const { getIO } = require('../config/socket');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalVendors, totalSalons, totalBookings,
      pendingBookings, completedBookings, totalServices, totalStaff,
      pendingPackages, activeVendors, revenueData, recentSignupUsers, chartData
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Vendor.countDocuments(),
      Salon.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'COMPLETED' }),
      Service.countDocuments(),
      Staff.countDocuments(),
      Package.countDocuments({ status: 'PENDING' }),
      Vendor.countDocuments({ isActive: true, isApproved: true }),
      Booking.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' }, totalCommission: { $sum: '$commission' }, totalPlatformFee: { $sum: '$platformFee' } } },
      ]),
      User.find({ role: 'user' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email phone createdAt avatar accountStatus'),
      Booking.aggregate([
        { $match: { status: 'COMPLETED', createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } } },
        {
          $group: {
            _id: { $month: "$createdAt" },
            revenue: { $sum: "$finalAmount" },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedChartData = chartData.map(item => ({
      name: months[item._id - 1],
      Revenue: item.revenue,
      Bookings: item.bookings
    }));

    const revenue = revenueData[0] || { totalRevenue: 0, totalCommission: 0, totalPlatformFee: 0 };

    res.json({
      success: true,
      data: {
        totalUsers, totalVendors, totalSalons, totalBookings,
        pendingBookings, completedBookings, totalServices, totalStaff,
        pendingPackages, activeVendors,
        totalRevenue: revenue.totalRevenue,
        totalCommission: revenue.totalCommission,
        totalPlatformFee: revenue.totalPlatformFee,
        recentSignupUsers,
        chartData: formattedChartData,
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

    // Populate salon and stats
    const vendorIds = vendors.map(v => v._id);
    const salons = await Salon.find({ vendor: { $in: vendorIds } }).select('vendor name address city location');
    const salonIds = salons.map(s => s._id);
    
    const bookingsCount = await Booking.aggregate([
      { $match: { salon: { $in: salonIds } } },
      { $group: { _id: '$salon', count: { $sum: 1 } } }
    ]);

    const vendorsWithStats = vendors.map(vendor => {
      const vSalon = salons.find(s => s.vendor.toString() === vendor._id.toString());
      let bCount = 0;
      if (vSalon) {
        const foundCount = bookingsCount.find(b => b._id.toString() === vSalon._id.toString());
        if (foundCount) bCount = foundCount.count;
      }
      return {
        ...vendor.toObject(),
        salon: vSalon || null,
        totalBookings: bCount
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

// @desc    Update vendor status (Approve/Suspend)
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
    if (isActive !== undefined) vendor.isActive = isActive;

    await vendor.save();

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

    res.json({
      success: true,
      data: {
        bookingTrend: bookingTrendAgg,
        bookingStatus: bookingStatusAgg,
        userGrowth: userGrowthAgg,
        vendorGrowth: vendorGrowthAgg,
        topSalons: topSalonsAgg,
        topServices: topServicesAgg
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
  getAnalytics
};
