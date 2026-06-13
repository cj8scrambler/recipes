import { describe, it, expect } from 'vitest'
import { convertUnit, toBaseUnit, fromBaseUnit, getDisplayUnit } from '../src/unitConversions'

// ---------------------------------------------------------------------------
// Shared unit fixtures (base unit: mL for volume, g for weight)
// ---------------------------------------------------------------------------

const tsp   = { abbreviation: 'tsp',   category: 'Volume', system: 'US Customary', base_conversion_factor: 4.92892 }
const tbsp  = { abbreviation: 'tbsp',  category: 'Volume', system: 'US Customary', base_conversion_factor: 14.7868 }
const floz  = { abbreviation: 'fl oz', category: 'Volume', system: 'US Customary', base_conversion_factor: 29.5735 }
const cup   = { abbreviation: 'c',     category: 'Volume', system: 'US Customary', base_conversion_factor: 236.588 }
const gal   = { abbreviation: 'gal',   category: 'Volume', system: 'US Customary', base_conversion_factor: 3785.41 }
const mL    = { abbreviation: 'mL',    category: 'Volume', system: 'Metric',       base_conversion_factor: 1 }
const liter = { abbreviation: 'L',     category: 'Volume', system: 'Metric',       base_conversion_factor: 1000 }

const gram  = { abbreviation: 'g',  category: 'Weight', system: 'Metric',       base_conversion_factor: 1 }
const kg    = { abbreviation: 'kg', category: 'Weight', system: 'Metric',       base_conversion_factor: 1000 }
const mg    = { abbreviation: 'mg', category: 'Weight', system: 'Metric',       base_conversion_factor: 0.001 }
const oz    = { abbreviation: 'oz', category: 'Weight', system: 'US Customary', base_conversion_factor: 28.3495 }
const lb    = { abbreviation: 'lb', category: 'Weight', system: 'US Customary', base_conversion_factor: 453.592 }

const itemUnit = { abbreviation: 'each', category: 'Item', system: 'US Customary', base_conversion_factor: 1 }

const usVolumeUnits  = [tsp, tbsp, floz, cup, gal]
const metricVolumeUnits = [mL, liter]
const usWeightUnits  = [oz, lb]
const metricWeightUnits = [gram, kg, mg]

// ---------------------------------------------------------------------------
// convertUnit
// ---------------------------------------------------------------------------

describe('convertUnit', () => {
  it('converts tsp to tbsp', () => {
    // 3 tsp = 1 tbsp
    expect(convertUnit(3, tsp, tbsp)).toBeCloseTo(1, 5)
  })

  it('converts tbsp to tsp', () => {
    expect(convertUnit(1, tbsp, tsp)).toBeCloseTo(3, 3)
  })

  it('converts mL to L', () => {
    expect(convertUnit(500, mL, liter)).toBeCloseTo(0.5, 5)
  })

  it('converts g to kg', () => {
    expect(convertUnit(2000, gram, kg)).toBeCloseTo(2, 5)
  })

  it('converts between volume sub-categories (Dry Volume to Liquid Volume)', () => {
    const dryTsp  = { ...tsp,  category: 'Dry Volume' }
    const liqTbsp = { ...tbsp, category: 'Liquid Volume' }
    expect(convertUnit(3, dryTsp, liqTbsp)).toBeCloseTo(1, 5)
  })

  it('returns original quantity when fromUnit is null', () => {
    expect(convertUnit(5, null, tbsp)).toBe(5)
  })

  it('returns original quantity when toUnit is null', () => {
    expect(convertUnit(5, tsp, null)).toBe(5)
  })

  it('returns original quantity for incompatible categories (Volume vs Weight)', () => {
    expect(convertUnit(5, tsp, gram)).toBe(5)
  })

  it('returns original quantity for Item category', () => {
    expect(convertUnit(3, itemUnit, itemUnit)).toBe(3)
  })

  it('same unit round-trip returns original value', () => {
    expect(convertUnit(4, cup, cup)).toBeCloseTo(4, 5)
  })
})

// ---------------------------------------------------------------------------
// toBaseUnit / fromBaseUnit
// ---------------------------------------------------------------------------

describe('toBaseUnit', () => {
  it('converts tsp quantity to mL', () => {
    expect(toBaseUnit(2, tsp)).toBeCloseTo(9.85784, 3)
  })

  it('converts lb to g', () => {
    expect(toBaseUnit(1, lb)).toBeCloseTo(453.592, 3)
  })

  it('returns quantity unchanged when unit is null', () => {
    expect(toBaseUnit(5, null)).toBe(5)
  })

  it('returns quantity unchanged when base_conversion_factor is missing', () => {
    expect(toBaseUnit(5, { abbreviation: 'x' })).toBe(5)
  })
})

describe('fromBaseUnit', () => {
  it('converts mL base quantity to cups', () => {
    expect(fromBaseUnit(236.588, cup)).toBeCloseTo(1, 5)
  })

  it('converts g base quantity to oz', () => {
    expect(fromBaseUnit(28.3495, oz)).toBeCloseTo(1, 5)
  })

  it('returns quantity unchanged when unit is null', () => {
    expect(fromBaseUnit(100, null)).toBe(100)
  })

  it('returns quantity unchanged when base_conversion_factor is missing', () => {
    expect(fromBaseUnit(100, { abbreviation: 'x' })).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// getDisplayUnit — US Customary volume thresholds
// ---------------------------------------------------------------------------

describe('getDisplayUnit — US Customary volume', () => {
  it('uses tsp for small quantities (<=3 tsp)', () => {
    // 2 tsp = 9.85784 mL
    const result = getDisplayUnit(9.85784, 'Volume', usVolumeUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('tsp')
    expect(result.quantity).toBeCloseTo(2, 3)
  })

  it('uses tbsp when quantity is just over 3 tsp', () => {
    // 4 tsp = 19.71568 mL
    const result = getDisplayUnit(19.71568, 'Volume', usVolumeUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('tbsp')
  })

  it('uses fl oz when quantity is over 2 tbsp', () => {
    // 3 tbsp = 44.3604 mL
    const result = getDisplayUnit(44.3604, 'Volume', usVolumeUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('fl oz')
  })

  it('uses cups when quantity is >= 8 fl oz (1 cup)', () => {
    // 1 cup = 236.588 mL
    const result = getDisplayUnit(236.588, 'Volume', usVolumeUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('c')
    expect(result.quantity).toBeCloseTo(1, 3)
  })

  it('uses gallons when quantity is >= 4 cups', () => {
    // 4 cups = 946.353 mL
    const result = getDisplayUnit(946.353, 'Volume', usVolumeUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('gal')
  })
})

// ---------------------------------------------------------------------------
// getDisplayUnit — Metric volume thresholds
// ---------------------------------------------------------------------------

describe('getDisplayUnit — Metric volume', () => {
  it('uses mL for quantities under 1 L', () => {
    const result = getDisplayUnit(500, 'Volume', metricVolumeUnits, 'Metric')
    expect(result.unit.abbreviation).toBe('mL')
    expect(result.quantity).toBeCloseTo(500, 3)
  })

  it('uses L for quantities >= 1 L', () => {
    const result = getDisplayUnit(1500, 'Volume', metricVolumeUnits, 'Metric')
    expect(result.unit.abbreviation).toBe('L')
    expect(result.quantity).toBeCloseTo(1.5, 3)
  })
})

// ---------------------------------------------------------------------------
// getDisplayUnit — US Customary weight thresholds
// ---------------------------------------------------------------------------

describe('getDisplayUnit — US Customary weight', () => {
  it('uses oz for quantities under 1 lb', () => {
    // 8 oz = 226.796 g
    const result = getDisplayUnit(226.796, 'Weight', usWeightUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('oz')
    expect(result.quantity).toBeCloseTo(8, 2)
  })

  it('uses lb for quantities >= 1 lb', () => {
    // 1 lb = 453.592 g
    const result = getDisplayUnit(453.592, 'Weight', usWeightUnits, 'US Customary')
    expect(result.unit.abbreviation).toBe('lb')
    expect(result.quantity).toBeCloseTo(1, 3)
  })
})

// ---------------------------------------------------------------------------
// getDisplayUnit — Metric weight thresholds
// ---------------------------------------------------------------------------

describe('getDisplayUnit — Metric weight', () => {
  it('uses mg for sub-gram quantities', () => {
    const result = getDisplayUnit(0.5, 'Weight', metricWeightUnits, 'Metric')
    expect(result.unit.abbreviation).toBe('mg')
    expect(result.quantity).toBeCloseTo(500, 3)
  })

  it('uses g for quantities >= 1 g and < 1 kg', () => {
    const result = getDisplayUnit(250, 'Weight', metricWeightUnits, 'Metric')
    expect(result.unit.abbreviation).toBe('g')
    expect(result.quantity).toBeCloseTo(250, 3)
  })

  it('uses kg for quantities >= 1 kg', () => {
    const result = getDisplayUnit(2000, 'Weight', metricWeightUnits, 'Metric')
    expect(result.unit.abbreviation).toBe('kg')
    expect(result.quantity).toBeCloseTo(2, 3)
  })
})

// ---------------------------------------------------------------------------
// getDisplayUnit — edge cases
// ---------------------------------------------------------------------------

describe('getDisplayUnit — edge cases', () => {
  it('returns null unit when units array is empty', () => {
    const result = getDisplayUnit(100, 'Volume', [], 'US Customary')
    expect(result.unit).toBeNull()
  })

  it('returns null unit when baseQuantity is falsy', () => {
    const result = getDisplayUnit(0, 'Volume', usVolumeUnits, 'US Customary')
    expect(result.unit).toBeNull()
  })

  it('returns null unit when category is missing', () => {
    const result = getDisplayUnit(100, null, usVolumeUnits, 'US Customary')
    expect(result.unit).toBeNull()
  })
})
