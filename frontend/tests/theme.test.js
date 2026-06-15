import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, applyTheme, THEMES } from '../src/theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('THEMES', () => {
  it('includes light, walnut, stone, and carbon', () => {
    const ids = THEMES.map(t => t.id)
    expect(ids).toContain('light')
    expect(ids).toContain('walnut')
    expect(ids).toContain('stone')
    expect(ids).toContain('carbon')
  })

  it('every theme has an id, label, primaryColor, and surfaceColor', () => {
    for (const theme of THEMES) {
      expect(theme.id).toBeTruthy()
      expect(theme.label).toBeTruthy()
      expect(theme.primaryColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.surfaceColor).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('getTheme', () => {
  it('returns light when nothing is stored', () => {
    expect(getTheme()).toBe('light')
  })

  it('returns the stored theme', () => {
    localStorage.setItem('recipes-theme', 'carbon')
    expect(getTheme()).toBe('carbon')
  })
})

describe('applyTheme', () => {
  it('persists the theme to localStorage', () => {
    applyTheme('stone')
    expect(localStorage.getItem('recipes-theme')).toBe('stone')
  })

  it('sets data-theme attribute for non-light themes', () => {
    applyTheme('carbon')
    expect(document.documentElement.dataset.theme).toBe('carbon')
  })

  it('removes data-theme attribute when switching to light', () => {
    applyTheme('carbon')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('round-trips: getTheme returns what applyTheme set', () => {
    for (const theme of THEMES) {
      applyTheme(theme.id)
      expect(getTheme()).toBe(theme.id)
    }
  })
})
