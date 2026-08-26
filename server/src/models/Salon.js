const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    zone: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    openingTime: {
      type: String,
      default: '09:00',
    },
    closingTime: {
      type: String,
      default: '21:00',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex'],
      default: 'unisex',
    },
    amenities: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    // Granular status — synced with isActive + isApproved for backward compat
    status: {
      type: String,
      enum: ['pending_approval', 'active', 'inactive', 'suspended'],
      default: 'pending_approval',
    },
    suspendedByCashLimit: {
      type: Boolean,
      default: false,
    },
    jacuzziEnabled: {
      type: Boolean,
      default: false,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries
salonSchema.index({ location: '2dsphere' });
salonSchema.index({ city: 1, zone: 1 });
salonSchema.index({ vendor: 1 });

module.exports = mongoose.model('Salon', salonSchema);
