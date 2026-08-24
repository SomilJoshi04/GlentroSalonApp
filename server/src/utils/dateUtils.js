/**
 * dateUtils.js
 * Centralized date utility functions for consistent timezone and validation logic.
 */

/**
 * Checks if a given date is strictly before today (based on midnight local time).
 * 
 * @param {Date|string|number} dateValue - The date to check
 * @returns {boolean} True if the date is before today, false otherwise.
 */
const isDateInPast = (dateValue) => {
  if (!dateValue) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(dateValue);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate < today;
};

/**
 * Validates that an end date is not strictly before a start date.
 * 
 * @param {Date|string|number} startDate 
 * @param {Date|string|number} endDate 
 * @returns {boolean} True if end date is valid (>= start date) or if end date doesn't exist. False if end date is strictly before start date.
 */
const isEndDateValid = (startDate, endDate) => {
  if (!startDate || !endDate) return true;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  return end >= start;
};

module.exports = {
  isDateInPast,
  isEndDateValid
};
