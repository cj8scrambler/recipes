export const THEMES = [
  { id: 'light',  label: 'Light',  primaryColor: '#0066cc', surfaceColor: '#ffffff' },
  { id: 'walnut', label: 'Walnut', primaryColor: '#b8844a', surfaceColor: '#1c1814' },
  { id: 'stone',  label: 'Stone',  primaryColor: '#7a6252', surfaceColor: '#faf7f4' },
  { id: 'carbon', label: 'Carbon', primaryColor: '#4272a0', surfaceColor: '#18191c' },
]

const STORAGE_KEY = 'recipes-theme'

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'light'
}

export function applyTheme(themeId) {
  if (themeId === 'light') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = themeId
  }
  localStorage.setItem(STORAGE_KEY, themeId)
}
