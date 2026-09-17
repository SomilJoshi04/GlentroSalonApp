const mongoose = require('mongoose');

const workingScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String, // e.g., "10:00"
      required: true,
    },
    endTime: {
      type: String, // e.g., "19:00"
      required: true,
    },
    isWorking: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: [true, 'Salon is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    specializations: [
      {
        type: String,
      },
    ],
    workingSchedule: {
      type: [workingScheduleSchema],
      default: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '19:00', isWorking: true },
        { dayOfWeek: 2, startTime: '10:00', endTime: '19:00', isWorking: true },
        { dayOfWeek: 3, startTime: '10:00', endTime: '19:00', isWorking: true },
        { dayOfWeek: 4, startTime: '10:00', endTime: '19:00', isWorking: true },
        { dayOfWeek: 5, startTime: '10:00', endTime: '19:00', isWorking: true },
        { dayOfWeek: 6, startTime: '10:00', endTime: '19:00', isWorking: true },
        { dayOfWeek: 0, startTime: '10:00', endTime: '19:00', isWorking: false },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Aggregated rating — updated by StaffReview.calcStaffRatings() after each review mutation.
    // Since Staff.salon is a single reference (one staff = one salon), this aggregate is
    // naturally salon-scoped. If multi-salon staff is ever added, this must be refactored
    // into a salonRatings Map. For now, this mirrors the Salon.ratings pattern exactly.
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

staffSchema.index({ salon: 1 });

module.exports = mongoose.model('Staff', staffSchema);
