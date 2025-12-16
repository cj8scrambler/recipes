/**
 * Unit conversion utilities for recipes
 * Handles conversion between units and automatic unit selection based on quantity
 */

/**
 * Volume categories that can be converted between each other
 * @constant
 */
export const VOLUME_CATEGORIES = ['Volume', 'Dry Volume', 'Liquid Volume'];

/**
 * Convert a quantity from one unit to another within the same category
 * @param {number} quantity - The quantity to convert
 * @param {object} fromUnit - The unit object to convert from (must have base_conversion_factor)
 * @param {object} toUnit - The unit object to convert to (must have base_conversion_factor)
 * @returns {number} The converted quantity
 */
export function convertUnit(quantity, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return quantity;
  
  // Volume categories (including Dry Volume and Liquid Volume) can convert between each other
  const volumeCategories = VOLUME_CATEGORIES;
  const fromIsVolume = volumeCategories.includes(fromUnit.category);
  const toIsVolume = volumeCategories.includes(toUnit.category);
  
  // Check if categories are compatible
  if (fromIsVolume && toIsVolume) {
    // Volume units can convert between each other
  } else if (fromUnit.category !== toUnit.category) {
    console.warn('Cannot convert between different unit categories');
    return quantity;
  }
  
  // For Item and Temperature units, no conversion needed
  if (fromUnit.category === 'Item' || fromUnit.category === 'Temperature') {
    return quantity;
  }
  
  // Convert to base unit first, then to target unit
  const baseQuantity = quantity * fromUnit.base_conversion_factor;
  const convertedQuantity = baseQuantity / toUnit.base_conversion_factor;
  
  return convertedQuantity;
}

/**
 * Get the appropriate unit to display based on quantity and user preference
 * Uses threshold logic (e.g., 3 tsp -> tbsp, 4 tbsp -> cups, etc.)
 * @param {number} baseQuantity - Quantity in base units (mL for volume, g for weight)
 * @param {string} category - 'Volume' or 'Weight'
 * @param {array} units - Array of all available units
 * @param {string} preferredSystem - 'Metric' or 'US Customary'
 * @returns {object} Object with { quantity, unit } representing the best display unit
 */
export function getDisplayUnit(baseQuantity, category, units, preferredSystem = 'US Customary') {
  if (!baseQuantity || !category || !units || units.length === 0) {
    return { quantity: baseQuantity, unit: null };
  }
  
  // Volume categories (including Dry Volume and Liquid Volume) can all display in any volume category
  const volumeCategories = VOLUME_CATEGORIES;
  const isVolumeCategory = volumeCategories.includes(category);
  
  // Filter units by category and system - for volumes, accept any volume category
  const categoryUnits = units.filter(u => {
    if (isVolumeCategory) {
      // For volume units, accept any volume category in the preferred system
      return volumeCategories.includes(u.category) && 
             u.system === preferredSystem &&
             u.base_conversion_factor != null;
    } else {
      // For non-volume units, match exact category
      return u.category === category && 
             u.system === preferredSystem &&
             u.base_conversion_factor != null;
    }
  });
  
  if (categoryUnits.length === 0) {
    return { quantity: baseQuantity, unit: null };
  }
  
  // Sort by conversion factor (smallest to largest)
  categoryUnits.sort((a, b) => a.base_conversion_factor - b.base_conversion_factor);
  
  if (preferredSystem === 'US Customary' && isVolumeCategory) {
    // US Volume: tsp -> tbsp (>3 tsp) -> fl oz (>2 tbsp) -> cups (≥8 fl oz) -> gallons (≥4 cups)
    const tsp = categoryUnits.find(u => u.abbreviation === 'tsp');
    const tbsp = categoryUnits.find(u => u.abbreviation === 'tbsp');
    const floz = categoryUnits.find(u => u.abbreviation === 'fl oz');
    const cup = categoryUnits.find(u => u.abbreviation === 'c');
    const gallon = categoryUnits.find(u => u.abbreviation === 'gal');
    
    // Check from largest to smallest
    if (gallon && cup) {
      const qtyInCups = baseQuantity / cup.base_conversion_factor;
      if (qtyInCups >= 4) {
        return { quantity: baseQuantity / gallon.base_conversion_factor, unit: gallon };
      }
    }
    if (cup && floz) {
      const qtyInFlOz = baseQuantity / floz.base_conversion_factor;
      // Use cups if >= 8 fl oz (which equals 1 cup)
      if (qtyInFlOz >= 8) {
        return { quantity: baseQuantity / cup.base_conversion_factor, unit: cup };
      }
    }
    if (floz && tbsp) {
      const qtyInTbsp = baseQuantity / tbsp.base_conversion_factor;
      // Use fl oz if > 2 tbsp
      if (qtyInTbsp > 2) {
        return { quantity: baseQuantity / floz.base_conversion_factor, unit: floz };
      }
    }
    if (tbsp && tsp) {
      const qtyInTsp = baseQuantity / tsp.base_conversion_factor;
      // Use tbsp if > 3 tsp
      if (qtyInTsp > 3) {
        return { quantity: baseQuantity / tbsp.base_conversion_factor, unit: tbsp };
      }
    }
    if (tsp) {
      return { quantity: baseQuantity / tsp.base_conversion_factor, unit: tsp };
    }
    // Fallback to smallest available unit
    if (tbsp) return { quantity: baseQuantity / tbsp.base_conversion_factor, unit: tbsp };
    if (floz) return { quantity: baseQuantity / floz.base_conversion_factor, unit: floz };
    if (cup) return { quantity: baseQuantity / cup.base_conversion_factor, unit: cup };
  } else if (preferredSystem === 'Metric' && isVolumeCategory) {
    // Metric Volume: mL -> L
    // Use larger unit when appropriate (skipping cL and dL as they're not commonly used)
    const liter = categoryUnits.find(u => u.abbreviation === 'L');
    const milliliter = categoryUnits.find(u => u.abbreviation === 'mL');
    
    if (liter) {
      const qty = baseQuantity / liter.base_conversion_factor;
      if (qty >= 1) return { quantity: qty, unit: liter };
    }
    if (milliliter) {
      const qty = baseQuantity / milliliter.base_conversion_factor;
      return { quantity: qty, unit: milliliter };
    }
  } else if (preferredSystem === 'US Customary' && category === 'Weight') {
    // US Weight: oz -> lb
    // Threshold: 16 oz = 1 lb
    const pound = categoryUnits.find(u => u.abbreviation === 'lb');
    const ounce = categoryUnits.find(u => u.abbreviation === 'oz');
    
    if (pound) {
      const qty = baseQuantity / pound.base_conversion_factor;
      if (qty >= 1) return { quantity: qty, unit: pound };
    }
    if (ounce) {
      const qty = baseQuantity / ounce.base_conversion_factor;
      return { quantity: qty, unit: ounce };
    }
  } else if (preferredSystem === 'Metric' && category === 'Weight') {
    // Metric Weight: mg -> g -> kg
    // Thresholds: 1000 mg = 1 g, 1000 g = 1 kg
    const kilogram = categoryUnits.find(u => u.abbreviation === 'kg');
    const gram = categoryUnits.find(u => u.abbreviation === 'g');
    const milligram = categoryUnits.find(u => u.abbreviation === 'mg');
    
    if (kilogram) {
      const qty = baseQuantity / kilogram.base_conversion_factor;
      if (qty >= 1) return { quantity: qty, unit: kilogram };
    }
    if (gram) {
      const qty = baseQuantity / gram.base_conversion_factor;
      if (qty >= 1) return { quantity: qty, unit: gram };
    }
    if (milligram) {
      const qty = baseQuantity / milligram.base_conversion_factor;
      return { quantity: qty, unit: milligram };
    }
  }
  
  // Fallback: use the smallest unit
  const smallestUnit = categoryUnits[0];
  return { 
    quantity: baseQuantity / smallestUnit.base_conversion_factor, 
    unit: smallestUnit 
  };
}

/**
 * Convert quantity to base unit (mL for volume, g for weight)
 * @param {number} quantity - The quantity to convert
 * @param {object} unit - The unit object (must have base_conversion_factor)
 * @returns {number} Quantity in base units
 */
export function toBaseUnit(quantity, unit) {
  if (!unit || !unit.base_conversion_factor) return quantity;
  return quantity * unit.base_conversion_factor;
}

/**
 * Convert quantity from base unit to a specific unit
 * @param {number} baseQuantity - Quantity in base units
 * @param {object} unit - The unit object to convert to
 * @returns {number} Converted quantity
 */
export function fromBaseUnit(baseQuantity, unit) {
  if (!unit || !unit.base_conversion_factor) return baseQuantity;
  return baseQuantity / unit.base_conversion_factor;
}
