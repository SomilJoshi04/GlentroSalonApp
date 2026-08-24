/**
 * Centralized utility for handling paise to rupee conversion in the frontend.
 * 
 * The backend stores money in strictly integer paise (e.g. 14250 paise = ₹142.50).
 * This utility safely formats it for display.
 * 
 * It also supports a fallback mechanism during the transition period where 
 * legacy components might pass a legacy decimal value (e.g., 142.5) instead of paise.
 */

/**
 * Safely format an amount in paise to a displayable Indian Rupee string.
 * @param {number|undefined|null} amountPaise The strict integer paise value (e.g., 14250)
 * @param {number|undefined|null} legacyAmount The fallback legacy value in rupees (e.g., 142.50)
 * @returns {string} Formatted string like "₹142.50"
 */
export const formatPaise = (amountPaise, legacyAmount) => {
  let finalRupees = 0;

  if (amountPaise !== undefined && amountPaise !== null) {
    // Primary path: using the new paise field
    finalRupees = amountPaise / 100;
  } else if (legacyAmount !== undefined && legacyAmount !== null) {
    // Fallback path: using the old rupee field during transition
    finalRupees = Number(legacyAmount);
  }

  // Ensure it's a valid number
  if (isNaN(finalRupees)) {
    finalRupees = 0;
  }

  // Format using standard locale string
  return `₹${finalRupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Extract just the numeric value in rupees from paise
 * (Useful for inputs or calculations if absolutely necessary, though frontend calculations should be avoided)
 */
export const getRupeesFromPaise = (amountPaise, legacyAmount) => {
  if (amountPaise !== undefined && amountPaise !== null) {
    return amountPaise / 100;
  }
  if (legacyAmount !== undefined && legacyAmount !== null) {
    return Number(legacyAmount);
  }
  return 0;
};
