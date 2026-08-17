const { body } = require('express-validator');

/**
 * Validation chains for various entities
 */

const registerUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const registerVendorValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
];

const subcategoryValidation = [
  body('name').trim().notEmpty().withMessage('Subcategory name is required'),
  body('category').notEmpty().withMessage('Category ID is required').isMongoId().withMessage('Invalid category ID'),
];

const serviceValidation = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('salon').notEmpty().withMessage('Salon ID is required').isMongoId().withMessage('Invalid salon ID'),
  body('category').notEmpty().withMessage('Category ID is required').isMongoId().withMessage('Invalid category ID'),
  body('subcategory').notEmpty().withMessage('Subcategory ID is required').isMongoId().withMessage('Invalid subcategory ID'),
  body('gender').isIn(['male', 'female', 'unisex']).withMessage('Gender must be male, female, or unisex'),
  body('price').isNumeric().withMessage('Price must be a number').custom((val) => val > 0).withMessage('Price must be greater than 0'),
  body('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
];

const staffValidation = [
  body('name').trim().notEmpty().withMessage('Staff name is required'),
  body('salon').notEmpty().withMessage('Salon ID is required').isMongoId().withMessage('Invalid salon ID'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

const salonValidation = [
  body('name').trim().notEmpty().withMessage('Salon name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
];

const bookingValidation = [
  body('salon').notEmpty().withMessage('Salon ID is required').isMongoId().withMessage('Invalid salon ID'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('services.*.service').notEmpty().withMessage('Service ID is required').isMongoId().withMessage('Invalid service ID'),
  body('bookingDate').isISO8601().withMessage('Valid booking date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
];

const couponValidation = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('discountType').isIn(['percentage', 'flat']).withMessage('Discount type must be percentage or flat'),
  body('discountValue').isNumeric().withMessage('Discount value must be a number').custom((val) => val > 0).withMessage('Discount value must be greater than 0'),
  body('validFrom').isISO8601().withMessage('Valid start date is required'),
  body('validTo').isISO8601().withMessage('Valid end date is required'),
];

const packageValidation = [
  body('name').trim().notEmpty().withMessage('Package name is required'),
  body('salon').notEmpty().withMessage('Salon ID is required').isMongoId().withMessage('Invalid salon ID'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('totalPrice').isNumeric().withMessage('Total price is required'),
  body('discountedPrice').isNumeric().withMessage('Discounted price is required'),
];

const offerValidation = [
  body('title').trim().notEmpty().withMessage('Offer title is required'),
  body('salon').notEmpty().withMessage('Salon ID is required').isMongoId().withMessage('Invalid salon ID'),
  body('discountType').isIn(['percentage', 'flat']).withMessage('Discount type must be percentage or flat'),
  body('discountValue').isNumeric().withMessage('Discount value is required'),
  body('validFrom').isISO8601().withMessage('Valid start date is required'),
  body('validTo').isISO8601().withMessage('Valid end date is required'),
];

module.exports = {
  registerUserValidation,
  registerVendorValidation,
  loginValidation,
  categoryValidation,
  subcategoryValidation,
  serviceValidation,
  staffValidation,
  salonValidation,
  bookingValidation,
  couponValidation,
  packageValidation,
  offerValidation,
};
