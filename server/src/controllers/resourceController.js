const SalonResource = require('../models/SalonResource');
const Salon = require('../models/Salon');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

// @desc    Get resources for a specific salon
// @route   GET /api/vendor/salon/:salonId/resources
// @access  Private (Vendor)
const getResources = async (req, res, next) => {
  try {
    const { salonId } = req.params;

    // Verify vendor owns this salon
    const salon = await Salon.findOne({ _id: salonId, vendor: req.user.id });
    if (!salon) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this salon' });
    }

    const resources = await SalonResource.find({ salon: salonId, vendor: req.user.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: resources,
      jacuzziEnabled: salon.jacuzziEnabled,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new resource
// @route   POST /api/vendor/salon/:salonId/resources
// @access  Private (Vendor)
const createResource = async (req, res, next) => {
  try {
    const { salonId } = req.params;
    const { name, type, status } = req.body;

    const salon = await Salon.findOne({ _id: salonId, vendor: req.user.id });
    if (!salon) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this salon' });
    }

    let imageFilename = '';
    if (req.file) {
      imageFilename = await processAndStoreImage(req.file.buffer, 'resource');
    }

    const resource = await SalonResource.create({
      salon: salonId,
      vendor: req.user.id,
      name,
      type,
      status: status || 'ACTIVE',
      image: imageFilename,
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a resource
// @route   PUT /api/vendor/resources/:id
// @access  Private (Vendor)
const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, status } = req.body;

    let resource = await SalonResource.findById(id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Verify ownership
    if (resource.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this resource' });
    }

    resource.name = name || resource.name;
    if (type) resource.type = type;
    if (status) resource.status = status;

    if (req.file) {
      const newImage = await processAndStoreImage(req.file.buffer, 'resource');
      if (resource.image) deleteImageSafe(resource.image);
      resource.image = newImage;
    }

    await resource.save();

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Deactivate a resource
// @route   DELETE /api/vendor/resources/:id
// @access  Private (Vendor)
const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resource = await SalonResource.findById(id);

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    if (resource.vendor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this resource' });
    }

    // Soft delete / set to inactive rather than hard delete if it has bookings.
    // For now, simple removal. Wait, prompt says: "Prefer soft deactivation."
    resource.status = 'INACTIVE';
    await resource.save();

    res.json({ success: true, message: 'Resource deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getResources,
  createResource,
  updateResource,
  deleteResource,
};
