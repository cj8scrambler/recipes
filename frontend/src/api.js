// Simple API client - update base if your backend uses a different base path
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Include cookies for session-based auth
    ...options
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  // Authentication
  login: (email, password) => request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/logout', { method: 'POST' }),
  getMe: () => request('/me'),
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  changePassword: (currentPassword, newPassword) => request('/change-password', { 
    method: 'POST', 
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) 
  }),

  // Recipes (public browsing)
  listRecipes: () => request('/recipes'),
  getRecipe: (id) => request(`/recipes/${id}`),

  // Admin - Recipes
  adminListRecipes: () => request('/recipes'),
  adminCreateRecipe: (payload) => request('/recipes', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateRecipe: (id, payload) => request(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteRecipe: (id) => request(`/recipes/${id}`, { method: 'DELETE' }),

  // Ingredients (public list)
  listIngredients: () => request('/ingredients'),

  // Admin - Ingredients
  adminListIngredients: () => request('/ingredients'),
  adminCreateIngredient: (payload) => request('/ingredients', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateIngredient: (id, payload) => request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteIngredient: (id) => request(`/ingredients/${id}`, { method: 'DELETE' }),

  // Units
  listUnits: () => request('/units'),

  // Recipe Costs
  getRecipeCost: (id, scale = 1.0) => request(`/recipes/${id}/cost?scale=${scale}`),

  // Recipe Weights
  getRecipeWeight: (id, scale = 1.0) => request(`/recipes/${id}/weight?scale=${scale}`),

  // Admin - Ingredient Prices
  listIngredientPrices: (ingredientId) => request(`/ingredients/${ingredientId}/prices`),
  createIngredientPrice: (ingredientId, payload) => request(`/ingredients/${ingredientId}/prices`, { method: 'POST', body: JSON.stringify(payload) }),
  updateIngredientPrice: (ingredientId, priceId, payload) => request(`/ingredients/${ingredientId}/prices/${priceId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteIngredientPrice: (ingredientId, priceId) => request(`/ingredients/${ingredientId}/prices/${priceId}`, { method: 'DELETE' }),

  // Versions (if your backend exposes versions; adjust if different)
  listRecipeVersions: (id) => request(`/recipes/${id}/versions`),

  // Admin - Ingredient Groups
  adminListIngredientGroups: () => request('/ingredient-groups'),
  adminCreateIngredientGroup: (payload) => request('/ingredient-groups', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateIngredientGroup: (id, payload) => request(`/ingredient-groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteIngredientGroup: (id) => request(`/ingredient-groups/${id}`, { method: 'DELETE' }),

  // Admin - Users
  adminListUsers: () => request('/admin/users'),
  adminCreateUser: (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Admin - Tags
  adminListTags: () => request('/tags'),
  adminCreateTag: (payload) => request('/tags', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateTag: (id, payload) => request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' })
}