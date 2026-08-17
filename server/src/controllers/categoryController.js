const Category = require('../models/Category');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

const getCategories = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    const categories = await Category.find(query).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
};

const createCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };
    if (req.file) {
      categoryData.image = await processAndStoreImage(req.file.buffer, 'category');
    }
    const category = await Category.create(categoryData);
    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) { next(error); }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = await processAndStoreImage(req.file.buffer, 'category');
    }

    const updated = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    // Safely delete old image if a new one was successfully saved and updated in DB
    if (req.file && category.image) {
      deleteImageSafe(category.image);
    }

    res.json({ success: true, message: 'Category updated', data: updated });
  } catch (error) { next(error); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    if (category.image) {
      deleteImageSafe(category.image);
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) { next(error); }
};

const toggleCategoryStatus = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    category.isActive = !category.isActive;
    await category.save();
    res.json({ success: true, message: `Category ${category.isActive ? 'activated' : 'deactivated'}`, data: category });
  } catch (error) { next(error); }
};

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, toggleCategoryStatus };
