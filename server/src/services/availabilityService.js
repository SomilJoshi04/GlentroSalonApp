const Staff = require('../models/Staff');
const BookingService = require('../models/BookingService');
const Booking = require('../models/Booking');
const { generateAvailableSlots, isSlotAvailable, calculateEndTime } = require('../utils/calculateAvailability');

/**
 * Get staff working schedule for a specific date
 */
const getStaffScheduleForDate = (staff, date) => {
  const dayOfWeek = new Date(date).getDay(); // 0=Sun, 1=Mon, ...
  const schedule = staff.workingSchedule.find((s) => s.dayOfWeek === dayOfWeek);
  return schedule || null;
};

/**
 * Get existing bookings for a staff member on a specific date
 */
const getStaffBookingsForDate = async (staffId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await BookingService.find({
    staff: staffId,
  }).populate({
    path: 'booking',
    match: {
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['PENDING', 'CONFIRMED'] },
    },
  });

  // Filter out bookings where the populated booking is null (doesn't match date/status)
  return bookings
    .filter((bs) => bs.booking !== null)
    .map((bs) => ({
      startTime: bs.startTime,
      endTime: bs.endTime,
      bookingId: bs.booking._id,
    }));
};

/**
 * Get available time slots for a specific staff member on a date
 */
const getStaffAvailability = async (staffId, date, serviceDuration) => {
  const staff = await Staff.findById(staffId);
  if (!staff || !staff.isActive) {
    return { available: false, slots: [], reason: 'Staff not found or inactive' };
  }

  const schedule = getStaffScheduleForDate(staff, date);
  if (!schedule || !schedule.isWorking) {
    return { available: false, slots: [], reason: 'Staff not working on this day' };
  }

  const existingBookings = await getStaffBookingsForDate(staffId, date);

  const slots = generateAvailableSlots({
    workStart: schedule.startTime,
    workEnd: schedule.endTime,
    existingBookings,
    serviceDuration,
  });

  return {
    available: slots.length > 0,
    slots,
    staffName: staff.name,
    workStart: schedule.startTime,
    workEnd: schedule.endTime,
  };
};

/**
 * Check if a specific slot is available for a staff member
 */
const checkSlotAvailability = async (staffId, date, startTime, duration) => {
  const staff = await Staff.findById(staffId);
  if (!staff || !staff.isActive) return false;

  const schedule = getStaffScheduleForDate(staff, date);
  if (!schedule || !schedule.isWorking) return false;

  const existingBookings = await getStaffBookingsForDate(staffId, date);

  return isSlotAvailable({
    startTime,
    duration,
    workStart: schedule.startTime,
    workEnd: schedule.endTime,
    existingBookings,
  });
};

/**
 * Auto-assign an available staff for a service at a given time
 */
const autoAssignStaff = async (salonId, date, startTime, duration) => {
  const staffList = await Staff.find({ salon: salonId, isActive: true });

  for (const staff of staffList) {
    const schedule = getStaffScheduleForDate(staff, date);
    if (!schedule || !schedule.isWorking) continue;

    const existingBookings = await getStaffBookingsForDate(staff._id, date);

    const available = isSlotAvailable({
      startTime,
      duration,
      workStart: schedule.startTime,
      workEnd: schedule.endTime,
      existingBookings,
    });

    if (available) {
      return staff;
    }
  }

  return null; // No staff available
};

/**
 * Get available slots for a salon on a date, considering all staff
 */
const getSalonAvailability = async (salonId, date, serviceDuration) => {
  const staffList = await Staff.find({ salon: salonId, isActive: true });
  const staffAvailability = [];

  for (const staff of staffList) {
    const availability = await getStaffAvailability(staff._id, date, serviceDuration);
    staffAvailability.push({
      staff: {
        _id: staff._id,
        name: staff.name,
        avatar: staff.avatar,
      },
      ...availability,
    });
  }

  // Collect all unique slots across all staff
  const allSlots = new Set();
  staffAvailability.forEach((sa) => {
    sa.slots.forEach((slot) => allSlots.add(slot));
  });

  return {
    staffAvailability,
    allAvailableSlots: Array.from(allSlots).sort(),
  };
};

/**
 * Get complex sequential availability for multiple services with staff preferences
 */
const getComplexAvailability = async (salonId, date, services) => {
  const staffList = await Staff.find({ salon: salonId, isActive: true });
  
  const staffData = {};
  for (const staff of staffList) {
    const schedule = getStaffScheduleForDate(staff, date);
    if (schedule && schedule.isWorking) {
      const existingBookings = await getStaffBookingsForDate(staff._id, date);
      staffData[staff._id.toString()] = {
        schedule,
        existingBookings,
      };
    }
  }

  const allPossibleSlots = [];
  const requestedDateStr = new Date(date).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = requestedDateStr === todayStr;
  
  // Create current date using local time or standard if configured
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < 24; i++) {
    const h = i.toString().padStart(2, '0');
    
    // Check 00 minute slot
    if (!isToday || (i * 60) > currentMinutes) {
      allPossibleSlots.push(`${h}:00`);
    }
    
    // Check 30 minute slot
    if (!isToday || (i * 60 + 30) > currentMinutes) {
      allPossibleSlots.push(`${h}:30`);
    }
  }

  const validStartSlots = [];

  for (const startSlot of allPossibleSlots) {
    let currentSlot = startSlot;
    let sequenceValid = true;

    for (const service of services) {
      const duration = service.duration;
      let serviceAssigned = false;

      if (service.staffId) {
        const sData = staffData[service.staffId];
        if (sData && isSlotAvailable({
          startTime: currentSlot,
          duration,
          workStart: sData.schedule.startTime,
          workEnd: sData.schedule.endTime,
          existingBookings: sData.existingBookings
        })) {
          serviceAssigned = true;
        }
      } else {
        for (const [sId, sData] of Object.entries(staffData)) {
          if (isSlotAvailable({
            startTime: currentSlot,
            duration,
            workStart: sData.schedule.startTime,
            workEnd: sData.schedule.endTime,
            existingBookings: sData.existingBookings
          })) {
            serviceAssigned = true;
            break;
          }
        }
      }

      if (!serviceAssigned) {
        sequenceValid = false;
        break;
      }
      currentSlot = calculateEndTime(currentSlot, duration);
    }

    if (sequenceValid) validStartSlots.push(startSlot);
  }

  return { allAvailableSlots: validStartSlots };
};

module.exports = {
  getStaffAvailability,
  checkSlotAvailability,
  autoAssignStaff,
  getSalonAvailability,
  getComplexAvailability,
  getStaffBookingsForDate,
};
