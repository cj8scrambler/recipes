// Simple API client - update base if your backend uses a different base path
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  // Recipes
  listRecipes: () => request('/recipes'),
  getRecipe: (id) => request(`/recipes/${id}`),
  createRecipe: (payload) => request('/recipes', { method: 'POST', body: JSON.stringify(payload) }),
  updateRecipe: (id, payload) => request(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRecipe: (id) => request(`/recipes/${id}`, { method: 'DELETE' }),

  // Ingredients
  listIngredients: () => request('/ingredients'),
  createIngredient: (payload) => request('/ingredients', { method: 'POST', body: JSON.stringify(payload) }),
  updateIngredient: (id, payload) => request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteIngredient: (id) => request(`/ingredients/${id}`, { method: 'DELETE' }),

  // Versions (if your backend exposes versions; adjust if different)
  listRecipeVersions: (id) => request(`/recipes/${id}/versions`)
}