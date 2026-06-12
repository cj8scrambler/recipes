import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPreferences,
  savePreferences,
  getPreferredUnitSystem,
  setPreferredUnitSystem,
} from '../userPreferences'

const KEY = 'recipe_app_preferences'

beforeEach(() => {
  localStorage.clear()
})

describe('getPreferences', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getPreferences()).toEqual({ unitSystem: 'US Customary' })
  })

  it('returns stored preferences merged with defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ unitSystem: 'Metric' }))
    expect(getPreferences()).toEqual({ unitSystem: 'Metric' })
  })

  it('merges partial stored preferences with defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ unknownKey: 'value' }))
    const prefs = getPreferences()
    expect(prefs.unitSystem).toBe('US Customary')
    expect(prefs.unknownKey).toBe('value')
  })

  it('falls back to defaults when stored value is invalid JSON', () => {
    localStorage.setItem(KEY, 'not-valid-json')
    expect(getPreferences()).toEqual({ unitSystem: 'US Customary' })
  })
})

describe('savePreferences', () => {
  it('writes preferences to localStorage', () => {
    savePreferences({ unitSystem: 'Metric' })
    const stored = JSON.parse(localStorage.getItem(KEY))
    expect(stored).toEqual({ unitSystem: 'Metric' })
  })
})

describe('getPreferredUnitSystem', () => {
  it('returns default unit system when nothing stored', () => {
    expect(getPreferredUnitSystem()).toBe('US Customary')
  })

  it('returns stored unit system', () => {
    localStorage.setItem(KEY, JSON.stringify({ unitSystem: 'Metric' }))
    expect(getPreferredUnitSystem()).toBe('Metric')
  })
})

describe('setPreferredUnitSystem', () => {
  it('persists the new unit system', () => {
    setPreferredUnitSystem('Metric')
    expect(getPreferredUnitSystem()).toBe('Metric')
  })

  it('can switch back to US Customary', () => {
    setPreferredUnitSystem('Metric')
    setPreferredUnitSystem('US Customary')
    expect(getPreferredUnitSystem()).toBe('US Customary')
  })

  it('does not clobber other stored preferences', () => {
    savePreferences({ unitSystem: 'Metric', unknownKey: 'keepme' })
    setPreferredUnitSystem('US Customary')
    const prefs = getPreferences()
    expect(prefs.unknownKey).toBe('keepme')
  })
})
