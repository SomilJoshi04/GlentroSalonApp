const Service = require('../models/Service');
const Salon = require('../models/Salon');

const getServices = async (req, res, next) => {
  try {
    const { salon, category, subcategory, gender, search, isActive, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (isActive !== undefined) {
      if (isActive !== 'all') query.isActive = isActive === 'true';
    } else {
      query.isActive = true; // Default for users
    }
    if (salon) query.salon = salon;
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (gender) query.gender = { $in: [gender, 'unisex'] };
    if (search) query.name = { $regex: search, $options: 'i' };

    const services = await Service.find(query).populate('category', 'name').populate('subcategory', 'name').populate('salon', 'name').sort({ name: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Service.countDocuments(query);

    res.json({ success: true, data: { services, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('category', 'name').populate('subcategory', 'name').populate('salon', 'name');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (error) { next(error); }
};

const createService = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ _id: req.body.salon, vendor: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found or not authorized' });
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, message: 'Service created', data: service });
  } catch (error) { next(error); }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('salon');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    if (service.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Service updated', data: updated });
  } catch (error) { next(error); }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('salon');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    if (req.user.role !== 'admin' && service.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) { next(error); }
};

const toggleServiceStatus = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('salon');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    if (req.user.role !== 'admin' && service.salon.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    service.isActive = !service.isActive;
    await service.save();
    res.json({ success: true, data: service });
  } catch (error) { next(error); }
};

module.exports = { getServices, getServiceById, createService, updateService, deleteService, toggleServiceStatus };
