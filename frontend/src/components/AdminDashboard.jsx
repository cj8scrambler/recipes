import React, { useEffect, useState } from 'react'
import { api } from '../api'
import RecipeEditor from './RecipeEditor'
import IngredientEditor from './IngredientEditor'
import IngredientGroupEditor from './IngredientGroupEditor'
import TagEditor from './TagEditor'
import UserManagement from './UserManagement'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('recipes')
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [ingredientGroups, setIngredientGroups] = useState([])
  const [tags, setTags] = useState([])
  const [users, setUsers] = useState([])
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [rs, is, gs, ts, us] = await Promise.all([
        api.adminListRecipes(),
        api.adminListIngredients(),
        api.adminListIngredientGroups(),
        api.adminListTags(),
        api.adminListUsers()
      ])
      setRecipes(rs || [])
      setIngredients(is || [])
      setIngredientGroups(gs || [])
      setTags(ts || [])
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
      let savedIngredient
      if (payload.ingredient_id) {
        savedIngredient = await api.adminUpdateIngredient(payload.ingredient_id, payload)
      } else {
        savedIngredient = await api.adminCreateIngredient(payload)
      }
      setEditingIngredient(null)
      await loadAll()
      return savedIngredient
    } catch (err) {
      setError(err.message)
      throw err
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

  async function saveTag(payload) {
    try {
      if (payload.tag_id) {
        await api.adminUpdateTag(payload.tag_id, payload)
      } else {
        await api.adminCreateTag(payload)
      }
      setEditingTag(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeTag(id) {
    if (!confirm('Delete this tag? This action cannot be undone.')) return
    try {
      await api.adminDeleteTag(id)
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
          className={`tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          Tags
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
            {ingredients.map(i => {
              const hasNoPrice = !i.prices || i.prices.length === 0
              // Check for missing weight: null, undefined, 0, empty string, or no default unit
              const hasNoWeight = i.weight === null || i.weight === undefined || i.weight === 0 || i.weight === '' || !i.default_unit_id
              return (
                <li key={i.ingredient_id}>
                  <span>
                    {i.name} {i.unit ? <span className="text-muted">({i.unit})</span> : ''}
                    {hasNoPrice && (
                      <span 
                        style={{ 
                          marginLeft: '0.5em', 
                          color: '#d9534f', 
                          fontSize: '0.85em',
                          fontWeight: 'bold'
                        }}
                        title="No price defined"
                      >
                        💲
                      </span>
                    )}
                    {hasNoWeight && (
                      <span 
                        style={{ 
                          marginLeft: '0.5em', 
                          color: '#f0ad4e', 
                          fontSize: '0.85em',
                          fontWeight: 'bold'
                        }}
                        title="No weight defined"
                      >
                        ⚖️
                      </span>
                    )}
                  </span>
                  <div>
                    <button className="small secondary" onClick={() => setEditingIngredient(i)}>Edit</button>
                    <button className="small danger" onClick={() => removeIngredient(i.ingredient_id)}>Delete</button>
                  </div>
                </li>
              )
            })}
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

      {activeTab === 'tags' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Manage Tags</h3>
            <button onClick={() => setEditingTag({})}>+ New Tag</button>
          </div>
          {tags.length === 0 && (
            <div className="empty-state">
              <p>No tags yet. Add tags to categorize your recipes.</p>
            </div>
          )}
          <ul>
            {tags.map(t => (
              <li key={t.tag_id}>
                <div>
                  <span>{t.name}</span>
                  {t.description && (
                    <div className="text-muted" style={{fontSize: '0.9em', marginTop: '0.25em'}}>
                      {t.description}
                    </div>
                  )}
                </div>
                <div>
                  <button className="small secondary" onClick={() => setEditingTag(t)}>Edit</button>
                  <button className="small danger" onClick={() => removeTag(t.tag_id)}>Delete</button>
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

      {activeTab === 'tags' && editingTag && (
        <TagEditor
          tag={editingTag}
          onCancel={() => setEditingTag(null)}
          onSave={saveTag}
        />
      )}

      {activeTab === 'users' && (
        <UserManagement users={users} onRefresh={loadAll} />
      )}
    </div>
  )
}
