/**
 * Format recipe quantity by removing trailing zeros after decimal point
 * @param {number} number - The quantity to format
 * @param {number} maxDecimals - Maximum number of decimal places
 * @returns {string} Formatted number as string
 */
export function formatRecipeUnits(number, maxDecimals) {
  // Round to the specified maximum decimal places and convert to string
  const fixedString = number.toFixed(maxDecimals);
  // Convert back to a float to remove trailing zeros, then to string to avoid scientific notation
  return parseFloat(fixedString).toString();
}
