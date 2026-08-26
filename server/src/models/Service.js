const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory',
      required: [true, 'Subcategory is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex'],
      required: [true, 'Gender is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    pricePaise: {
      type: Number,
      min: [0, 'Price in paise cannot be negative'],
    },
    discountedPricePaise: {
      type: Number,
      min: [0, 'Discounted price in paise cannot be negative'],
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    requiresStaff: {
      type: Boolean,
      default: true,
    },
    requiresResource: {
      type: Boolean,
      default: false,
    },
    resourceType: {
      type: String,
      enum: ['JACUZZI'],
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ salon: 1, category: 1 });
serviceSchema.index({ salon: 1, gender: 1 });

module.exports = mongoose.model('Service', serviceSchema);
