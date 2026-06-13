import { describe, it, expect } from 'vitest'
import { formatRecipeUnits } from '../src/utils'

describe('formatRecipeUnits', () => {
  it('removes trailing zeros after decimal', () => {
    expect(formatRecipeUnits(1.5, 3)).toBe('1.5')
  })

  it('returns integer string when fractional part is zero', () => {
    expect(formatRecipeUnits(2.0, 2)).toBe('2')
  })

  it('accepts string input', () => {
    expect(formatRecipeUnits('3.500', 3)).toBe('3.5')
  })

  it('returns empty string for NaN input', () => {
    expect(formatRecipeUnits('abc', 2)).toBe('')
  })

  it('returns empty string for null input', () => {
    expect(formatRecipeUnits(null, 2)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(formatRecipeUnits(undefined, 2)).toBe('')
  })

  it('rounds to maxDecimals', () => {
    expect(formatRecipeUnits(1.23456, 2)).toBe('1.23')
  })

  it('handles maxDecimals of 0', () => {
    expect(formatRecipeUnits(3.7, 0)).toBe('4')
  })

  it('handles whole numbers', () => {
    expect(formatRecipeUnits(5, 3)).toBe('5')
  })

  it('handles very small numbers without scientific notation', () => {
    expect(formatRecipeUnits(0.001, 3)).toBe('0.001')
  })
})
