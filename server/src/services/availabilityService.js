const Staff = require('../models/Staff');
const BookingService = require('../models/BookingService');
const Booking = require('../models/Booking');
const SalonResource = require('../models/SalonResource');
const { generateAvailableSlots, isSlotAvailable, calculateEndTime } = require('../utils/calculateAvailability');
const { getLockedSlotsForStaff, getLockedSlotsForResource } = require('./slotLockService');

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
 * Get existing bookings for a resource on a specific date
 */
const getResourceBookingsForDate = async (resourceId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await BookingService.find({
    resource: resourceId,
  }).populate({
    path: 'booking',
    match: {
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['PENDING', 'CONFIRMED'] },
    },
  });

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
  const lockedSlots = await getLockedSlotsForStaff(staff.salon, staffId, date);
  const combinedBookings = [...existingBookings, ...lockedSlots];

  const slots = generateAvailableSlots({
    workStart: schedule.startTime,
    workEnd: schedule.endTime,
    existingBookings: combinedBookings,
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
  const lockedSlots = await getLockedSlotsForStaff(staff.salon, staffId, date);
  const combinedBookings = [...existingBookings, ...lockedSlots];

  return isSlotAvailable({
    startTime,
    duration,
    workStart: schedule.startTime,
    workEnd: schedule.endTime,
    existingBookings: combinedBookings,
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
    const lockedSlots = await getLockedSlotsForStaff(salonId, staff._id, date);
    const combinedBookings = [...existingBookings, ...lockedSlots];

    const available = isSlotAvailable({
      startTime,
      duration,
      workStart: schedule.startTime,
      workEnd: schedule.endTime,
      existingBookings: combinedBookings,
    });

    if (available) {
      return staff;
    }
  }

  return null; // No staff available
};

/**
 * Auto-assign an available resource for a service at a given time
 */
const autoAssignResource = async (salonId, resourceType, date, startTime, duration) => {
  const resourceList = await SalonResource.find({ salon: salonId, type: resourceType, status: 'ACTIVE' });

  for (const resource of resourceList) {
    const existingBookings = await getResourceBookingsForDate(resource._id, date);
    const lockedSlots = await getLockedSlotsForResource(salonId, resource._id, date);
    const combinedBookings = [...existingBookings, ...lockedSlots];

    const available = isSlotAvailable({
      startTime,
      duration,
      workStart: '00:00',
      workEnd: '23:59',
      existingBookings: combinedBookings,
    });

    if (available) {
      return resource;
    }
  }

  return null; // No resource available
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
  const resourceList = await SalonResource.find({ salon: salonId, status: 'ACTIVE' });
  
  const staffData = {};
  for (const staff of staffList) {
    const schedule = getStaffScheduleForDate(staff, date);
    if (schedule && schedule.isWorking) {
      const existingBookings = await getStaffBookingsForDate(staff._id, date);
      const lockedSlots = await getLockedSlotsForStaff(salonId, staff._id, date);
      staffData[staff._id.toString()] = {
        schedule,
        existingBookings: [...existingBookings, ...lockedSlots],
      };
    }
  }

  const resourceData = {};
  for (const resource of resourceList) {
    if (!resourceData[resource.type]) {
      resourceData[resource.type] = [];
    }
    const existingBookings = await getResourceBookingsForDate(resource._id, date);
    const lockedSlots = await getLockedSlotsForResource(salonId, resource._id, date);
    resourceData[resource.type].push({
      _id: resource._id,
      existingBookings: [...existingBookings, ...lockedSlots],
      schedule: { startTime: '00:00', endTime: '23:59' }
    });
  }

  const allPossibleSlots = [];
  const requestedDateStr = new Date(date).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = requestedDateStr === todayStr;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < 24; i++) {
    const h = i.toString().padStart(2, '0');
    
    if (!isToday || (i * 60) > currentMinutes) {
      allPossibleSlots.push(`${h}:00`);
    }
    
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
      
      const requiresStaff = service.requiresStaff !== false; // Default true
      const requiresResource = service.requiresResource === true; // Default false
      const resourceType = service.resourceType;
      
      let staffAvailable = false;
      let resourceAvailable = false;

      // Check Staff
      if (requiresStaff) {
        if (service.staffId) {
          const sData = staffData[service.staffId];
          if (sData && isSlotAvailable({
            startTime: currentSlot,
            duration,
            workStart: sData.schedule.startTime,
            workEnd: sData.schedule.endTime,
            existingBookings: sData.existingBookings
          })) {
            staffAvailable = true;
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
              staffAvailable = true;
              break;
            }
          }
        }
      } else {
        staffAvailable = true; // Not required
      }

      // Check Resource
      if (requiresResource && resourceType) {
        const units = resourceData[resourceType] || [];
        for (const unit of units) {
          if (isSlotAvailable({
            startTime: currentSlot,
            duration,
            workStart: unit.schedule.startTime,
            workEnd: unit.schedule.endTime,
            existingBookings: unit.existingBookings
          })) {
            resourceAvailable = true;
            break;
          }
        }
      } else {
        resourceAvailable = true; // Not required
      }

      if (staffAvailable && resourceAvailable) {
        serviceAssigned = true;
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
  autoAssignResource,
  getSalonAvailability,
  getComplexAvailability,
  getStaffBookingsForDate,
  getResourceBookingsForDate,
};
