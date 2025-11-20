import React, { useEffect, useState } from 'react'
import { api } from '../api'
import RecipeEditor from './RecipeEditor'
import IngredientEditor from './IngredientEditor'
import IngredientGroupEditor from './IngredientGroupEditor'
import UserManagement from './UserManagement'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('recipes')
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [ingredientGroups, setIngredientGroups] = useState([])
  const [users, setUsers] = useState([])
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [rs, is, gs, us] = await Promise.all([
        api.adminListRecipes(),
        api.adminListIngredients(),
        api.adminListIngredientGroups(),
        api.adminListUsers()
      ])
      setRecipes(rs || [])
      setIngredients(is || [])
      setIngredientGroups(gs || [])
      setUsers(us || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveRecipe(payload) {
    try {
      if (payload.recipe_id) {
        await api.adminUpdateRecipe(payload.recipe_id, payload)
      } else {
        await api.adminCreateRecipe(payload)
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
      await api.adminDeleteRecipe(id)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveIngredient(payload) {
    try {
      if (payload.ingredient_id) {
        await api.adminUpdateIngredient(payload.ingredient_id, payload)
      } else {
        await api.adminCreateIngredient(payload)
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
      await api.adminDeleteIngredient(id)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveGroup(payload) {
    try {
      if (payload.group_id) {
        await api.adminUpdateIngredientGroup(payload.group_id, payload)
      } else {
        await api.adminCreateIngredientGroup(payload)
      }
      setEditingGroup(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeGroup(id) {
    if (!confirm('Delete this ingredient group? This action cannot be undone.')) return
    try {
      await api.adminDeleteIngredientGroup(id)
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
        <button 
          className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Ingredient Groups
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
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

      {activeTab === 'groups' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Manage Ingredient Groups</h3>
            <button onClick={() => setEditingGroup({})}>+ New Group</button>
          </div>
          {ingredientGroups.length === 0 && (
            <div className="empty-state">
              <p>No ingredient groups yet. Add groups to organize ingredients in recipes.</p>
            </div>
          )}
          <ul>
            {ingredientGroups.map(g => (
              <li key={g.group_id}>
                <div>
                  <span>{g.name}</span>
                  {g.description && (
                    <div className="text-muted" style={{fontSize: '0.9em', marginTop: '0.25em'}}>
                      {g.description}
                    </div>
                  )}
                </div>
                <div>
                  <button className="small secondary" onClick={() => setEditingGroup(g)}>Edit</button>
                  <button className="small danger" onClick={() => removeGroup(g.group_id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'recipes' && editingRecipe && (
        <RecipeEditor
          recipe={editingRecipe}
          onCancel={() => setEditingRecipe(null)}
          onSave={saveRecipe}
        />
      )}

      {activeTab === 'ingredients' && editingIngredient && (
        <IngredientEditor
          ingredient={editingIngredient}
          onCancel={() => setEditingIngredient(null)}
          onSave={saveIngredient}
        />
      )}

      {activeTab === 'groups' && editingGroup && (
        <IngredientGroupEditor
          group={editingGroup}
          onCancel={() => setEditingGroup(null)}
          onSave={saveGroup}
        />
      )}

      {activeTab === 'users' && (
        <UserManagement users={users} onRefresh={loadAll} />
      )}
    </div>
  )
}
