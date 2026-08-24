/**
 * money.js
 * 
 * Centralized utility for handling integer paise financial calculations.
 * 
 * Rules:
 * 1. All financial calculations MUST be performed using integer paise.
 * 2. Floating-point rupees are ONLY used for frontend display formatting.
 * 3. Never use floating-point math for actual financial additions/subtractions.
 */

/**
 * Converts a floating-point rupee amount to integer paise safely.
 * Example: 142.50 -> 14250
 * Example: 99.99 -> 9999
 * @param {Number|String} rupees - Amount in rupees
 * @returns {Number} Integer amount in paise
 */
const rupeesToPaise = (rupees) => {
  if (rupees === null || rupees === undefined || isNaN(Number(rupees))) return 0;
  return Math.round(Number(rupees) * 100);
};

/**
 * Converts integer paise back to a float for legacy compatibility or strict numeric display.
 * Example: 14250 -> 142.5
 * @param {Number} paise - Amount in integer paise
 * @returns {Number} Float amount in rupees
 */
const paiseToRupees = (paise) => {
  if (paise === null || paise === undefined || isNaN(Number(paise))) return 0;
  return Number((Number(paise) / 100).toFixed(2));
};

/**
 * Rounds a raw paise amount to the nearest whole rupee in paise.
 * Business Rule:
 * 14249 -> 14200 (₹142)
 * 14250 -> 14300 (₹143)
 * 14251 -> 14300 (₹143)
 * @param {Number} paise - Raw paise amount
 * @returns {Number} Rounded paise amount
 */
const roundToNearestRupeePaise = (paise) => {
  if (paise === null || paise === undefined || isNaN(Number(paise))) return 0;
  // Divide by 100, round to nearest integer, then multiply back to 100
  return Math.round(Number(paise) / 100) * 100;
};

/**
 * Calculates percentage on a paise amount using safe integer math.
 * @param {Number} paiseAmount - Base amount in paise
 * @param {Number} percentage - Percentage to apply (e.g. 10 for 10%)
 * @returns {Number} Resulting amount in paise (rounded to nearest integer paise)
 */
const calculatePercentagePaise = (paiseAmount, percentage) => {
  if (!paiseAmount || !percentage) return 0;
  return Math.round((Number(paiseAmount) * Number(percentage)) / 100);
};

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  roundToNearestRupeePaise,
  calculatePercentagePaise,
};
