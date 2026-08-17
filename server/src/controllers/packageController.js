const Package = require('../models/Package');
const Salon = require('../models/Salon');
const { notifyPackageStatus, notifyAdminApprovalRequest } = require('../services/notificationService');

const createPackage = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.body.salon, vendor: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found or not authorized' });
    const pkg = await Package.create({ ...req.body, status: 'PENDING' });
    try { await notifyAdminApprovalRequest('package', pkg.name, req.user.name); } catch (e) {}
    res.status(201).json({ success: true, message: 'Package created. Pending admin approval.', data: pkg });
  } catch (error) { next(error); }
};

const getPackages = async (req, res, next) => {
  try {
    const { salon, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (salon) query.salon = salon;
    if (status) query.status = status;
    const packages = await Package.find(query).populate('services', 'name price duration').populate('salon', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Package.countDocuments(query);
    res.json({ success: true, data: { packages, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getVendorPackages = async (req, res, next) => {
  try {
    const salons = await Salon.find({ vendor: req.user.id });
    const salonIds = salons.map((s) => s._id);
    const packages = await Package.find({ salon: { $in: salonIds } }).populate('services', 'name price duration').populate('salon', 'name');
    res.json({ success: true, data: packages });
  } catch (error) { next(error); }
};

const approvePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id).populate('salon');
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    pkg.status = 'ACTIVE';
    pkg.adminNote = req.body.adminNote || '';
    await pkg.save();
    try { await notifyPackageStatus(pkg, pkg.salon.vendor, 'ACTIVE'); } catch (e) {}
    res.json({ success: true, message: 'Package approved', data: pkg });
  } catch (error) { next(error); }
};

const rejectPackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id).populate('salon');
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    pkg.status = 'REJECTED';
    pkg.adminNote = req.body.adminNote || '';
    await pkg.save();
    try { await notifyPackageStatus(pkg, pkg.salon.vendor, 'REJECTED'); } catch (e) {}
    res.json({ success: true, message: 'Package rejected', data: pkg });
  } catch (error) { next(error); }
};

const updatePackage = async (req, res, next) => {
  try {
    const pkg = await Package.findById(req.params.id).populate('salon');
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    if (pkg.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updated = await Package.findByIdAndUpdate(req.params.id, { ...req.body, status: 'PENDING' }, { new: true });
    res.json({ success: true, message: 'Package updated. Pending admin re-approval.', data: updated });
  } catch (error) { next(error); }
};

const deletePackage = async (req, res, next) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Package deleted' });
  } catch (error) { next(error); }
};

module.exports = { createPackage, getPackages, getVendorPackages, approvePackage, rejectPackage, updatePackage, deletePackage };
