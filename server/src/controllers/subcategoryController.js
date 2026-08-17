const Subcategory = require('../models/Subcategory');

const getSubcategories = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    const subcategories = await Subcategory.find(query).populate('category', 'name').sort({ name: 1 });
    res.json({ success: true, data: subcategories });
  } catch (error) { next(error); }
};

const getSubcategoryById = async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id).populate('category', 'name');
    if (!subcategory) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    res.json({ success: true, data: subcategory });
  } catch (error) { next(error); }
};

const createSubcategory = async (req, res, next) => {
  try {
    const subcategory = await Subcategory.create(req.body);
    res.status(201).json({ success: true, message: 'Subcategory created', data: subcategory });
  } catch (error) { next(error); }
};

const updateSubcategory = async (req, res, next) => {
  try {
    const subcategory = await Subcategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subcategory) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    res.json({ success: true, message: 'Subcategory updated', data: subcategory });
  } catch (error) { next(error); }
};

const deleteSubcategory = async (req, res, next) => {
  try {
    await Subcategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Subcategory deleted' });
  } catch (error) { next(error); }
};

const toggleSubcategoryStatus = async (req, res, next) => {
  try {
    const sub = await Subcategory.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    sub.isActive = !sub.isActive;
    await sub.save();
    res.json({ success: true, message: `Subcategory ${sub.isActive ? 'activated' : 'deactivated'}`, data: sub });
  } catch (error) { next(error); }
};

module.exports = { getSubcategories, getSubcategoryById, createSubcategory, updateSubcategory, deleteSubcategory, toggleSubcategoryStatus };
