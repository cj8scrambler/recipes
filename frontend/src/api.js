// Simple API client - update base if your backend uses a different base path
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const fullUrl = `${BASE}${path}`
  console.log('[DEBUG API] Request:', fullUrl)
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Include cookies for session-based auth
    ...options
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  const data = res.status === 204 ? null : await res.json()
  // Log only essential fields for large responses (recipes endpoint)
  if (path.includes('/recipes/') && data && data.recipe_id) {
    console.log('[DEBUG API] Response from', path, '- Recipe:', {
      recipe_id: data.recipe_id,
      name: data.name,
      base_servings: data.base_servings,
      ingredient_count: data.ingredients?.length
    })
  } else {
    console.log('[DEBUG API] Response from', path, ':', data)
  }
  return data
}

export const api = {
  // Authentication
  login: (email, password) => request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/logout', { method: 'POST' }),
  getMe: () => request('/me'),
  isTestDatabase: () => request('/is-test-database'),
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

  // Ingredient Types (public list)
  listIngredientTypes: () => request('/ingredient-types'),

  // Admin - Ingredients
  adminListIngredients: () => request('/ingredients'),
  adminCreateIngredient: (payload) => request('/ingredients', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateIngredient: (id, payload) => request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteIngredient: (id) => request(`/ingredients/${id}`, { method: 'DELETE' }),

  // Units
  listUnits: () => request('/units'),

  // Recipe Costs
  getRecipeCost: (id, scale = 1.0) => {
    console.log('[DEBUG API] getRecipeCost called:', { id, scale, scale_type: typeof scale })
    return request(`/recipes/${id}/cost?scale=${scale}`)
  },

  // Recipe Weights
  getRecipeWeight: (id, scale = 1.0) => {
    console.log('[DEBUG API] getRecipeWeight called:', { id, scale, scale_type: typeof scale })
    return request(`/recipes/${id}/weight?scale=${scale}`)
  },

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
  adminDeleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  // Admin - Ingredient Types
  adminListIngredientTypes: () => request('/ingredient-types'),
  adminCreateIngredientType: (payload) => request('/ingredient-types', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateIngredientType: (id, payload) => request(`/ingredient-types/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteIngredientType: (id) => request(`/ingredient-types/${id}`, { method: 'DELETE' }),

  // Recipe Lists
  listRecipeLists: () => request('/recipe-lists'),
  createRecipeList: (payload) => request('/recipe-lists', { method: 'POST', body: JSON.stringify(payload) }),
  getRecipeList: (listId) => request(`/recipe-lists/${listId}`),
  updateRecipeList: (listId, payload) => request(`/recipe-lists/${listId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRecipeList: (listId) => request(`/recipe-lists/${listId}`, { method: 'DELETE' }),
  
  // Recipe List Items
  listRecipeListItems: (listId) => request(`/recipe-lists/${listId}/items`),
  addRecipeToList: (listId, payload) => request(`/recipe-lists/${listId}/items`, { method: 'POST', body: JSON.stringify(payload) }),
  getRecipeListItem: (listId, itemId) => request(`/recipe-lists/${listId}/items/${itemId}`),
  updateRecipeListItem: (listId, itemId, payload) => request(`/recipe-lists/${listId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  removeRecipeFromList: (listId, itemId) => request(`/recipe-lists/${listId}/items/${itemId}`, { method: 'DELETE' }),
  
  // Recipe List Membership (get which lists contain a recipe)
  getRecipeListMembership: (recipeId) => request(`/recipes/${recipeId}/lists`)
}