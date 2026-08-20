const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Package = require('../models/Package');
const Category = require('../models/Category');
const AppSetting = require('../models/AppSetting');

const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

// Helper function to attach the minimum valid service price to a list of salons
const attachMinServicePrices = async (salons) => {
  if (!salons || salons.length === 0) return salons;

  const salonIds = salons.map(s => s._id);

  const minPrices = await Service.aggregate([
    { $match: { salon: { $in: salonIds }, isActive: true } },
    { $group: { _id: '$salon', minPrice: { $min: '$price' } } }
  ]);

  const priceMap = {};
  minPrices.forEach(p => {
    priceMap[p._id.toString()] = p.minPrice;
  });

  return salons.map(salon => {
    const salonObj = salon.toObject ? salon.toObject() : salon;
    salonObj.minServicePrice = priceMap[salon._id.toString()] || null;
    return salonObj;
  });
};

// @desc    Create salon (Vendor)
const createSalon = async (req, res, next) => {
  try {
    const salonData = { ...req.body, vendor: req.user.id };
    if (req.body.latitude && req.body.longitude) {
      salonData.location = { type: 'Point', coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)] };
    }
    
    if (req.file) {
      const filename = await processAndStoreImage(req.file.buffer, 'salon');
      salonData.images = [filename];
    }

    const salon = await Salon.create(salonData);
    res.status(201).json({ success: true, message: 'Salon created successfully', data: salon });
  } catch (error) { next(error); }
};

// @desc    Get all salons (public, with filters)
const getSalons = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, city, zone, gender, search, category } = req.query;
    const query = { isActive: true, isApproved: true };
    if (city) query.city = { $regex: city, $options: 'i' };
    if (zone) query.zone = { $regex: zone, $options: 'i' };
    if (gender) query.gender = { $in: [gender, 'unisex'] };
    
    if (search) {
      // Find matching categories
      const matchedCategories = await Category.find({ name: { $regex: search, $options: 'i' }, isActive: true }).select('_id');
      const matchedCategoryIds = matchedCategories.map(c => c._id);

      // Find matching services (by name OR by category)
      const serviceQuery = { isActive: true };
      if (matchedCategoryIds.length > 0) {
        serviceQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $in: matchedCategoryIds } }
        ];
      } else {
        serviceQuery.name = { $regex: search, $options: 'i' };
      }

      const matchedServices = await Service.find(serviceQuery).select('salon');
      
      const matchedSalonIds = matchedServices.map(s => s.salon);

      query.$or = [
        { name: { $regex: search, $options: 'i' } }, 
        { address: { $regex: search, $options: 'i' } },
        { _id: { $in: matchedSalonIds } }
      ];
    }

    if (category) {
      const categoryServices = await Service.find({ category, isActive: true }).select('salon');
      const catSalonIds = categoryServices.map(s => s.salon);
      
      if (query._id && query._id.$in) {
         // Intersect if _id filter already exists
         query._id.$in = query._id.$in.filter(id => catSalonIds.some(cId => cId.toString() === id.toString()));
      } else {
         query._id = { $in: catSalonIds };
      }
    }

    const salons = await Salon.find(query).sort({ createdAt: -1, 'ratings.average': -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const salonsWithPrices = await attachMinServicePrices(salons);
    const total = await Salon.countDocuments(query);

    res.json({ success: true, data: { salons: salonsWithPrices, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get nearby salons (geospatial)
const getNearbySalons = async (req, res, next) => {
  try {
    const { lat, lng, page = 1, limit = 20, category, search } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });

    // Fetch dynamic search radius from AppSetting (default to 50 KM)
    const radiusSetting = await AppSetting.findOne({ key: 'salonSearchRadius' }).lean();
    const radiusInKm = radiusSetting ? parseFloat(radiusSetting.value) : 50;
    const maxDistanceInMeters = radiusInKm * 1000;

    const query = {
      isActive: true,
      isApproved: true,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: maxDistanceInMeters,
        },
      },
    };

    if (search) {
      // Find matching categories
      const matchedCategories = await Category.find({ name: { $regex: search, $options: 'i' }, isActive: true }).select('_id');
      const matchedCategoryIds = matchedCategories.map(c => c._id);

      // Find matching services (by name OR by category)
      const serviceQuery = { isActive: true };
      if (matchedCategoryIds.length > 0) {
        serviceQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $in: matchedCategoryIds } }
        ];
      } else {
        serviceQuery.name = { $regex: search, $options: 'i' };
      }

      const matchedServices = await Service.find(serviceQuery).select('salon');
      const matchedSalonIds = matchedServices.map(s => s.salon);
      query.$or = [
        { name: { $regex: search, $options: 'i' } }, 
        { address: { $regex: search, $options: 'i' } },
        { _id: { $in: matchedSalonIds } }
      ];
    }

    if (category) {
      const categoryServices = await Service.find({ category, isActive: true }).select('salon');
      const catSalonIds = categoryServices.map(s => s.salon);
      query._id = { $in: catSalonIds };
    }

    const salons = await Salon.find(query).skip((page - 1) * limit).limit(parseInt(limit));
    const salonsWithPrices = await attachMinServicePrices(salons);

    res.json({ success: true, data: { salons: salonsWithPrices, page: parseInt(page) } });
  } catch (error) { next(error); }
};

// @desc    Get salons by city
const getSalonsByCity = async (req, res, next) => {
  try {
    const { city } = req.params;
    const { zone, page = 1, limit = 20, category, search } = req.query;
    const query = { isActive: true, isApproved: true, city: { $regex: city, $options: 'i' } };
    if (zone) query.zone = { $regex: zone, $options: 'i' };
    
    if (search) {
      // Find matching categories
      const matchedCategories = await Category.find({ name: { $regex: search, $options: 'i' }, isActive: true }).select('_id');
      const matchedCategoryIds = matchedCategories.map(c => c._id);

      // Find matching services (by name OR by category)
      const serviceQuery = { isActive: true };
      if (matchedCategoryIds.length > 0) {
        serviceQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $in: matchedCategoryIds } }
        ];
      } else {
        serviceQuery.name = { $regex: search, $options: 'i' };
      }

      const matchedServices = await Service.find(serviceQuery).select('salon');
      const matchedSalonIds = matchedServices.map(s => s.salon);
      query.$or = [
        { name: { $regex: search, $options: 'i' } }, 
        { address: { $regex: search, $options: 'i' } },
        { _id: { $in: matchedSalonIds } }
      ];
    }

    if (category) {
      const categoryServices = await Service.find({ category, isActive: true }).select('salon');
      const catSalonIds = categoryServices.map(s => s.salon);
      query._id = { $in: catSalonIds };
    }

    const salons = await Salon.find(query).sort({ 'ratings.average': -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const salonsWithPrices = await attachMinServicePrices(salons);
    const total = await Salon.countDocuments(query);

    res.json({ success: true, data: { salons: salonsWithPrices, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get salon details with services, staff, packages, offers
const getSalonById = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id).populate('vendor', 'name businessName phone email');
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    const services = await Service.find({ salon: salon._id, isActive: true }).populate('category', 'name').populate('subcategory', 'name');
    const staff = await Staff.find({ salon: salon._id, isActive: true });
    const packages = await Package.find({ salon: salon._id, status: 'ACTIVE', isActive: true }).populate('services');

    res.json({ success: true, data: { salon, services, staff, packages } });
  } catch (error) { next(error); }
};

// @desc    Update salon (Vendor)
const updateSalon = async (req, res, next) => {
  try {
    let salon;
    if (req.user.role === 'admin') {
      salon = await Salon.findById(req.params.id);
    } else {
      salon = await Salon.findOne({ _id: req.params.id, vendor: req.user.id });
    }
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found or not authorized' });

    const updateData = { ...req.body };
    if (req.body.latitude && req.body.longitude) {
      updateData.location = { type: 'Point', coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)] };
    }

    if (req.file) {
      const filename = await processAndStoreImage(req.file.buffer, 'salon');
      const oldImages = salon.images;
      updateData.images = [filename];
      
      if (oldImages && oldImages.length > 0) {
        oldImages.forEach(img => {
          if (!img.startsWith('data:')) deleteImageSafe(img);
        });
      }
    }

    const updated = await Salon.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, message: 'Salon updated', data: updated });
  } catch (error) { next(error); }
};

// @desc    Get vendor's salons
const getVendorSalons = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    let query = Salon.find({ vendor: req.user.id }).sort({ createdAt: -1 });
    
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
      const salons = await query;
      const salonsWithPrices = await attachMinServicePrices(salons);
      const total = await Salon.countDocuments({ vendor: req.user.id });
      res.json({ success: true, data: { salons: salonsWithPrices, total, page: pageNum, totalPages: Math.ceil(total / limitNum) } });
    } else {
      const salons = await query;
      const salonsWithPrices = await attachMinServicePrices(salons);
      res.json({ success: true, data: salonsWithPrices });
    }
  } catch (error) { next(error); }
};

// @desc    Get all salons (Admin)
const getAllSalons = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isApproved } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';

    const salons = await Salon.find(query).populate('vendor', 'name businessName').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const salonsWithPrices = await attachMinServicePrices(salons);
    const total = await Salon.countDocuments(query);

    res.json({ success: true, data: { salons: salonsWithPrices, total, page: parseInt(page), totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// @desc    Get distinct cities
const getCities = async (req, res, next) => {
  try {
    const cities = await Salon.distinct('city', { isActive: true, isApproved: true });
    res.json({ success: true, data: cities });
  } catch (error) { next(error); }
};

// @desc    Get zones for a city
const getZones = async (req, res, next) => {
  try {
    const zones = await Salon.distinct('zone', { city: { $regex: req.params.city, $options: 'i' }, isActive: true, isApproved: true });
    res.json({ success: true, data: zones.filter(Boolean) });
  } catch (error) { next(error); }
};

module.exports = { createSalon, getSalons, getNearbySalons, getSalonsByCity, getSalonById, updateSalon, getVendorSalons, getAllSalons, getCities, getZones };
