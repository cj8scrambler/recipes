/**
 * Format recipe quantity by removing trailing zeros after decimal point
 * @param {number|string} number - The quantity to format
 * @param {number} maxDecimals - Maximum number of decimal places
 * @returns {string} Formatted number as string
 */
export function formatRecipeUnits(number, maxDecimals) {
  // Convert to number if it's a string
  const num = typeof number === 'string' ? parseFloat(number) : number;
  
  // Return empty string if not a valid number
  if (isNaN(num)) return '';
  
  // Round to the specified maximum decimal places and convert to string
  const fixedString = num.toFixed(maxDecimals);
  // Convert back to a float to remove trailing zeros, then to string to avoid scientific notation
  return parseFloat(fixedString).toString();
}
