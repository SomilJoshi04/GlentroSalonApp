const Staff = require('../models/Staff');
const Salon = require('../models/Salon');
const { getStaffAvailability } = require('../services/availabilityService');

// @desc    Add staff (Vendor)
const addStaff = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.body.salon, vendor: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found or not authorized' });

    const staff = await Staff.create(req.body);
    res.status(201).json({ success: true, message: 'Staff added', data: staff });
  } catch (error) { next(error); }
};

// @desc    Get salon staff
const getSalonStaff = async (req, res, next) => {
  try {
    const { search, isActive, page, limit } = req.query;
    const query = { salon: req.params.salonId };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Staff.countDocuments(query);
      const staff = await Staff.find(query).skip(skip).limit(parseInt(limit));
      return res.json({
        success: true,
        data: {
          staff,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    const staff = await Staff.find(query);
    res.json({ success: true, data: staff });
  } catch (error) { next(error); }
};

// @desc    Update staff
const updateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('salon');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    if (staff.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Staff updated', data: updated });
  } catch (error) { next(error); }
};

// @desc    Toggle staff active status
const toggleStaffStatus = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('salon');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    if (staff.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    staff.isActive = !staff.isActive;
    await staff.save();
    res.json({ success: true, message: `Staff ${staff.isActive ? 'activated' : 'deactivated'}`, data: staff });
  } catch (error) { next(error); }
};

// @desc    Update staff working schedule
const updateSchedule = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('salon');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    if (staff.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    staff.workingSchedule = req.body.workingSchedule;
    await staff.save();
    res.json({ success: true, message: 'Schedule updated', data: staff });
  } catch (error) { next(error); }
};

// @desc    Get staff availability for a date
const getAvailability = async (req, res, next) => {
  try {
    const { date, duration = 30 } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const availability = await getStaffAvailability(req.params.id, date, parseInt(duration));
    res.json({ success: true, data: availability });
  } catch (error) { next(error); }
};

// @desc    Delete staff
const deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('salon');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    if (staff.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Staff deleted' });
  } catch (error) { next(error); }
};

module.exports = { addStaff, getSalonStaff, updateStaff, toggleStaffStatus, updateSchedule, getAvailability, deleteStaff };
