/**
 * Availability Calculation Utilities
 * 
 * Core algorithm for generating available time slots based on
 * staff working hours, existing bookings, and service durations.
 */

/**
 * Convert time string "HH:MM" to minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes from midnight back to "HH:MM" format
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Check if two time ranges overlap
 * @param {number} start1 - Start of range 1 in minutes
 * @param {number} end1 - End of range 1 in minutes
 * @param {number} start2 - Start of range 2 in minutes
 * @param {number} end2 - End of range 2 in minutes
 * @returns {boolean}
 */
const isOverlapping = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

/**
 * Generate available time slots for a staff member on a given date
 * 
 * @param {Object} params
 * @param {string} params.workStart - Staff work start time "HH:MM"
 * @param {string} params.workEnd - Staff work end time "HH:MM"
 * @param {Array} params.existingBookings - Array of { startTime: "HH:MM", endTime: "HH:MM" }
 * @param {number} params.serviceDuration - Service duration in minutes
 * @param {number} params.slotInterval - Slot interval in minutes (default 15)
 * @returns {Array} Array of available slot start times as "HH:MM"
 */
const generateAvailableSlots = ({
  workStart,
  workEnd,
  existingBookings = [],
  serviceDuration,
  slotInterval = 15,
}) => {
  const workStartMin = timeToMinutes(workStart);
  const workEndMin = timeToMinutes(workEnd);
  const availableSlots = [];

  // Convert existing bookings to minutes
  const bookingsInMinutes = existingBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  // Generate all possible slot start times at the given interval
  for (let slotStart = workStartMin; slotStart + serviceDuration <= workEndMin; slotStart += slotInterval) {
    const slotEnd = slotStart + serviceDuration;

    // Check if this slot overlaps with any existing booking
    const hasConflict = bookingsInMinutes.some((booking) =>
      isOverlapping(slotStart, slotEnd, booking.start, booking.end)
    );

    if (!hasConflict) {
      availableSlots.push(minutesToTime(slotStart));
    }
  }

  return availableSlots;
};

/**
 * Check if a specific time slot is available for a staff member
 * 
 * @param {Object} params
 * @param {string} params.startTime - Desired start time "HH:MM"
 * @param {number} params.duration - Service duration in minutes
 * @param {string} params.workStart - Staff work start time
 * @param {string} params.workEnd - Staff work end time
 * @param {Array} params.existingBookings - Existing bookings array
 * @returns {boolean}
 */
const isSlotAvailable = ({ startTime, duration, workStart, workEnd, existingBookings = [] }) => {
  const slotStart = timeToMinutes(startTime);
  const slotEnd = slotStart + duration;
  const workStartMin = timeToMinutes(workStart);
  const workEndMin = timeToMinutes(workEnd);

  // Check if slot is within working hours
  if (slotStart < workStartMin || slotEnd > workEndMin) {
    return false;
  }

  // Check for conflicts with existing bookings
  const bookingsInMinutes = existingBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  return !bookingsInMinutes.some((booking) =>
    isOverlapping(slotStart, slotEnd, booking.start, booking.end)
  );
};

/**
 * Calculate end time given start time and duration
 * @param {string} startTime - "HH:MM"
 * @param {number} durationMinutes
 * @returns {string} End time "HH:MM"
 */
const calculateEndTime = (startTime, durationMinutes) => {
  const startMinutes = timeToMinutes(startTime);
  return minutesToTime(startMinutes + durationMinutes);
};

module.exports = {
  timeToMinutes,
  minutesToTime,
  isOverlapping,
  generateAvailableSlots,
  isSlotAvailable,
  calculateEndTime,
};
