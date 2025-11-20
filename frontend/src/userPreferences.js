/**
 * User preferences management using localStorage
 */

const PREFERENCES_KEY = 'recipe_app_preferences';

const DEFAULT_PREFERENCES = {
  unitSystem: 'US Customary' // or 'Metric'
};

/**
 * Get user preferences from localStorage
 * @returns {object} User preferences
 */
export function getPreferences() {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading preferences:', e);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save user preferences to localStorage
 * @param {object} preferences - Preferences to save
 */
export function savePreferences(preferences) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (e) {
    console.error('Error saving preferences:', e);
  }
}

/**
 * Get the user's preferred unit system
 * @returns {string} 'Metric' or 'US Customary'
 */
export function getPreferredUnitSystem() {
  return getPreferences().unitSystem;
}

/**
 * Set the user's preferred unit system
 * @param {string} system - 'Metric' or 'US Customary'
 */
export function setPreferredUnitSystem(system) {
  const prefs = getPreferences();
  prefs.unitSystem = system;
  savePreferences(prefs);
}
