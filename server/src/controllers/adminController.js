const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Package = require('../models/Package');
const Offer = require('../models/Offer');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalVendors, totalSalons, totalBookings,
      pendingBookings, completedBookings, totalServices, totalStaff,
      pendingPackages, pendingOffers, activeVendors, revenueData,
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
      Offer.countDocuments({ status: 'PENDING' }),
      Vendor.countDocuments({ isActive: true, isApproved: true }),
      Booking.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' }, totalCommission: { $sum: '$commission' }, totalPlatformFee: { $sum: '$platformFee' } } },
      ]),
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, totalCommission: 0, totalPlatformFee: 0 };

    res.json({
      success: true,
      data: {
        totalUsers, totalVendors, totalSalons, totalBookings,
        pendingBookings, completedBookings, totalServices, totalStaff,
        pendingPackages, pendingOffers, activeVendors,
        totalRevenue: revenue.totalRevenue,
        totalCommission: revenue.totalCommission,
        totalPlatformFee: revenue.totalPlatformFee,
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

    if (status === 'active') query.isActive = true;
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
    
    const bookingsCount = await Booking.aggregate([
      { $match: { vendor: { $in: vendorIds } } },
      { $group: { _id: '$vendor', count: { $sum: 1 } } }
    ]);

    const vendorsWithStats = vendors.map(vendor => {
      const vSalon = salons.find(s => s.vendor.toString() === vendor._id.toString());
      const bCount = bookingsCount.find(b => b._id.toString() === vendor._id.toString());
      return {
        ...vendor.toObject(),
        salon: vSalon || null,
        totalBookings: bCount ? bCount.count : 0
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
    const [vendors, packages, offers, bookings] = await Promise.all([
      Vendor.countDocuments({ isApproved: false }),
      Package.countDocuments({ status: 'PENDING' }),
      Offer.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'PENDING' })
    ]);

    res.json({
      success: true,
      data: { vendors, packages, offers, bookings }
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

module.exports = {
  getDashboardStats,
  getRecentBookings,
  getBookingStats,
  getUsers,
  getVendors,
  updateVendorStatus,
  getPendingCounts,
  getAllBookings,
  getCategories,
  getSubcategories,
  getServices
};
