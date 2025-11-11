import React, { useEffect, useState } from 'react'
import { api } from '../api'
import RecipeEditor from './RecipeEditor'
import IngredientEditor from './IngredientEditor'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('recipes')
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [rs, is] = await Promise.all([api.listRecipes(), api.listIngredients()])
      setRecipes(rs || [])
      setIngredients(is || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveRecipe(payload) {
    try {
      if (payload.recipe_id) {
        await api.updateRecipe(payload.recipe_id, payload)
      } else {
        await api.createRecipe(payload)
      }
      setEditingRecipe(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeRecipe(id) {
    if (!confirm('Delete this recipe? This action cannot be undone.')) return
    try {
      await api.deleteRecipe(id)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveIngredient(payload) {
    try {
      if (payload.ingredient_id) {
        await api.updateIngredient(payload.ingredient_id, payload)
      } else {
        await api.createIngredient(payload)
      }
      setEditingIngredient(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeIngredient(id) {
    if (!confirm('Delete this ingredient? This action cannot be undone.')) return
    try {
      await api.deleteIngredient(id)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin">
      <h2>Admin Dashboard</h2>
      {error && <div className="error">{error}</div>}
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          Recipes
        </button>
        <button 
          className={`tab ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          Ingredients
        </button>
      </div>

      {activeTab === 'recipes' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Manage Recipes</h3>
            <button onClick={() => setEditingRecipe({})}>+ New Recipe</button>
          </div>
          {recipes.length === 0 && (
            <div className="empty-state">
              <p>No recipes yet. Create your first recipe to get started.</p>
            </div>
          )}
          <ul>
            {recipes.map(r => (
              <li key={r.recipe_id}>
                <div>
                  <span>{r.name}</span>
                  {r.ingredients && r.ingredients.length > 0 && (
                    <div className="text-muted" style={{fontSize: '0.9em', marginTop: '0.25em'}}>
                      Ingredients: {r.ingredients.map(ing => ing.name).join(', ')}
                    </div>
                  )}
                </div>
                <div>
                  <button className="small secondary" onClick={() => setEditingRecipe(r)}>Edit</button>
                  <button className="small danger" onClick={() => removeRecipe(r.recipe_id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'ingredients' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Manage Ingredients</h3>
            <button onClick={() => setEditingIngredient({})}>+ New Ingredient</button>
          </div>
          {ingredients.length === 0 && (
            <div className="empty-state">
              <p>No ingredients yet. Add ingredients to use in your recipes.</p>
            </div>
          )}
          <ul>
            {ingredients.map(i => (
              <li key={i.ingredient_id}>
                <span>
                  {i.name} {i.unit ? <span className="text-muted">({i.unit})</span> : ''}
                </span>
                <div>
                  <button className="small secondary" onClick={() => setEditingIngredient(i)}>Edit</button>
                  <button className="small danger" onClick={() => removeIngredient(i.ingredient_id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editingRecipe && (
        <RecipeEditor
          recipe={editingRecipe}
          onCancel={() => setEditingRecipe(null)}
          onSave={saveRecipe}
        />
      )}

      {editingIngredient && (
        <IngredientEditor
          ingredient={editingIngredient}
          onCancel={() => setEditingIngredient(null)}
          onSave={saveIngredient}
        />
      )}
    </div>
  )
}
