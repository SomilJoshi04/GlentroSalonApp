const Offer = require('../models/Offer');
const Salon = require('../models/Salon');
const { notifyOfferStatus, notifyAdminApprovalRequest } = require('../services/notificationService');

const createOffer = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.body.salon, vendor: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found or not authorized' });
    const offer = await Offer.create({ ...req.body, status: 'PENDING' });
    try { await notifyAdminApprovalRequest('offer', offer.title, req.user.name); } catch (e) {}
    res.status(201).json({ success: true, message: 'Offer created. Pending admin approval.', data: offer });
  } catch (error) { next(error); }
};

const getOffers = async (req, res, next) => {
  try {
    const { salon, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (salon) query.salon = salon;
    if (status) query.status = status;
    const offers = await Offer.find(query).populate('applicableServices', 'name price').populate('salon', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Offer.countDocuments(query);
    res.json({ success: true, data: { offers, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getVendorOffers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const salons = await Salon.find({ vendor: req.user.id });
    const salonIds = salons.map((s) => s._id);
    
    const query = { salon: { $in: salonIds } };
    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const offers = await Offer.find(query).sort({ createdAt: -1 }).populate('applicableServices', 'name price').populate('salon', 'name');
    res.json({ success: true, data: offers });
  } catch (error) { next(error); }
};

const approveOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('salon');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    offer.status = 'ACTIVE';
    offer.adminNote = req.body.adminNote || '';
    await offer.save();
    try { await notifyOfferStatus(offer, offer.salon.vendor, 'ACTIVE'); } catch (e) {}
    res.json({ success: true, message: 'Offer approved', data: offer });
  } catch (error) { next(error); }
};

const rejectOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('salon');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    offer.status = 'REJECTED';
    offer.adminNote = req.body.adminNote || '';
    await offer.save();
    try { await notifyOfferStatus(offer, offer.salon.vendor, 'REJECTED'); } catch (e) {}
    res.json({ success: true, message: 'Offer rejected', data: offer });
  } catch (error) { next(error); }
};

const updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('salon');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updated = await Offer.findByIdAndUpdate(req.params.id, { ...req.body, status: 'PENDING' }, { new: true });
    res.json({ success: true, message: 'Offer updated. Pending admin re-approval.', data: updated });
  } catch (error) { next(error); }
};

const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('salon');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Offer deleted' });
  } catch (error) { next(error); }
};

const toggleOfferStatus = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('salon');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    offer.isActive = !offer.isActive;
    await offer.save();
    res.json({ success: true, message: `Offer ${offer.isActive ? 'activated' : 'deactivated'}`, data: offer });
  } catch (error) { next(error); }
};

module.exports = { createOffer, getOffers, getVendorOffers, approveOffer, rejectOffer, updateOffer, deleteOffer, toggleOfferStatus };
