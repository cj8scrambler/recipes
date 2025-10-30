import React, { useEffect, useState } from 'react'
import { api } from '../api'
import RecipeList from './RecipeList'
import RecipeEditor from './RecipeEditor'
import IngredientEditor from './IngredientEditor'

export default function AdminDashboard() {
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
      if (payload.id) {
        await api.updateRecipe(payload.id, payload)
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
    if (!confirm('Delete recipe?')) return
    try {
      await api.deleteRecipe(id)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveIngredient(payload) {
    try {
      if (payload.id) {
        await api.updateIngredient(payload.id, payload)
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
    if (!confirm('Delete ingredient?')) return
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
      <section className="two-col">
        <div>
          <h3>Recipes</h3>
          <button onClick={() => setEditingRecipe({})}>New Recipe</button>
          <RecipeList recipes={recipes} onSelect={(r) => setEditingRecipe(r)} />
          <ul>
            {recipes.map(r => (
              <li key={r.id}>
                {r.name}
                <button onClick={() => setEditingRecipe(r)}>Edit</button>
                <button onClick={() => removeRecipe(r.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Ingredients</h3>
          <button onClick={() => setEditingIngredient({})}>New Ingredient</button>
          <ul>
            {ingredients.map(i => (
              <li key={i.id}>
                {i.name} {i.unit ? `(${i.unit})` : ''}
                <button onClick={() => setEditingIngredient(i)}>Edit</button>
                <button onClick={() => removeIngredient(i.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <aside>
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
      </aside>
    </div>
  )
}