/**
 * Unit conversion utilities for recipes
 * Handles conversion between units and automatic unit selection based on quantity
 */

/**
 * Convert a quantity from one unit to another within the same category
 * @param {number} quantity - The quantity to convert
 * @param {object} fromUnit - The unit object to convert from (must have base_conversion_factor)
 * @param {object} toUnit - The unit object to convert to (must have base_conversion_factor)
 * @returns {number} The converted quantity
 */
export function convertUnit(quantity, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return quantity;
  if (fromUnit.category !== toUnit.category) {
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
  
  // Filter units by category and system
  const categoryUnits = units.filter(u => 
    u.category === category && 
    u.system === preferredSystem &&
    u.base_conversion_factor != null
  );
  
  if (categoryUnits.length === 0) {
    return { quantity: baseQuantity, unit: null };
  }
  
  // Sort by conversion factor (smallest to largest)
  categoryUnits.sort((a, b) => a.base_conversion_factor - b.base_conversion_factor);
  
  if (preferredSystem === 'US Customary' && category === 'Volume') {
    // US Volume: tsp -> tbsp -> fl oz -> cup -> pint -> quart -> gallon
    // Thresholds: 3 tsp = 1 tbsp, 2 tbsp = 1 fl oz, 8 fl oz = 1 cup, 2 cups = 1 pint, etc.
    const tsp = categoryUnits.find(u => u.abbreviation === 'tsp');
    const tbsp = categoryUnits.find(u => u.abbreviation === 'tbsp');
    const floz = categoryUnits.find(u => u.abbreviation === 'fl oz');
    const cup = categoryUnits.find(u => u.abbreviation === 'c');
    const pint = categoryUnits.find(u => u.abbreviation === 'pt');
    const quart = categoryUnits.find(u => u.abbreviation === 'qt');
    const gallon = categoryUnits.find(u => u.abbreviation === 'gal');
    
    // Convert and check thresholds from largest to smallest
    if (gallon) {
      const qty = baseQuantity / gallon.base_conversion_factor;
      if (qty >= 1) return { quantity: qty, unit: gallon };
    }
    if (quart) {
      const qty = baseQuantity / quart.base_conversion_factor;
      if (qty >= 4) return { quantity: qty, unit: quart };
    }
    if (pint) {
      const qty = baseQuantity / pint.base_conversion_factor;
      if (qty >= 2) return { quantity: qty, unit: pint };
    }
    if (cup) {
      const qty = baseQuantity / cup.base_conversion_factor;
      if (qty >= 2) return { quantity: qty, unit: cup };
    }
    if (floz) {
      const qty = baseQuantity / floz.base_conversion_factor;
      if (qty >= 8) return { quantity: qty, unit: floz };
    }
    if (tbsp) {
      const qty = baseQuantity / tbsp.base_conversion_factor;
      if (qty >= 3) return { quantity: qty, unit: tbsp };
    }
    if (tsp) {
      const qty = baseQuantity / tsp.base_conversion_factor;
      return { quantity: qty, unit: tsp };
    }
  } else if (preferredSystem === 'Metric' && category === 'Volume') {
    // Metric Volume: mL -> cL -> dL -> L
    // Thresholds: 10 mL = 1 cL, 10 cL = 1 dL, 10 dL = 1 L
    const liter = categoryUnits.find(u => u.abbreviation === 'L');
    const deciliter = categoryUnits.find(u => u.abbreviation === 'dL');
    const centiliter = categoryUnits.find(u => u.abbreviation === 'cL');
    const milliliter = categoryUnits.find(u => u.abbreviation === 'mL');
    
    if (liter) {
      const qty = baseQuantity / liter.base_conversion_factor;
      if (qty >= 1) return { quantity: qty, unit: liter };
    }
    if (deciliter) {
      const qty = baseQuantity / deciliter.base_conversion_factor;
      if (qty >= 10) return { quantity: qty, unit: deciliter };
    }
    if (centiliter) {
      const qty = baseQuantity / centiliter.base_conversion_factor;
      if (qty >= 10) return { quantity: qty, unit: centiliter };
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
