import React, { useEffect, useState } from 'react'
import { api } from '../api'
import RecipeEditor from './RecipeEditor'
import IngredientEditor from './IngredientEditor'
import IngredientGroupEditor from './IngredientGroupEditor'
import IngredientTypeEditor from './IngredientTypeEditor'
import TagEditor from './TagEditor'
import UserManagement from './UserManagement'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('recipes')
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [ingredientGroups, setIngredientGroups] = useState([])
  const [ingredientTypes, setIngredientTypes] = useState([])
  const [tags, setTags] = useState([])
  const [users, setUsers] = useState([])
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editingIngredient, setEditingIngredient] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [error, setError] = useState(null)
  // Track collapsed state for ingredient type sections (collapsed by default)
  const [collapsedTypes, setCollapsedTypes] = useState({})

  useEffect(() => {
    loadAll()
  }, [])

  // Initialize collapsed state when ingredientTypes changes
  useEffect(() => {
    const initialCollapsed = {}
    ingredientTypes.forEach(t => {
      // Preserve existing state or default to collapsed
      if (!(t.type_id in collapsedTypes)) {
        initialCollapsed[t.type_id] = true
      } else {
        initialCollapsed[t.type_id] = collapsedTypes[t.type_id]
      }
    })
    setCollapsedTypes(initialCollapsed)
  }, [ingredientTypes])

  async function loadAll() {
    try {
      const [rs, is, gs, its, ts, us] = await Promise.all([
        api.adminListRecipes(),
        api.adminListIngredients(),
        api.adminListIngredientGroups(),
        api.adminListIngredientTypes(),
        api.adminListTags(),
        api.adminListUsers()
      ])
      setRecipes(rs || [])
      setIngredients(is || [])
      setIngredientGroups(gs || [])
      setIngredientTypes(its || [])
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

  async function saveType(payload) {
    try {
      if (payload.type_id) {
        await api.adminUpdateIngredientType(payload.type_id, payload)
      } else {
        await api.adminCreateIngredientType(payload)
      }
      setEditingType(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeType(id) {
    if (!confirm('Delete this ingredient type? This action cannot be undone.')) return
    try {
      await api.adminDeleteIngredientType(id)
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

  function toggleTypeCollapsed(typeId) {
    setCollapsedTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }))
  }

  // Helper function to check if an ingredient needs price or weight configuration
  function ingredientNeedsConfig(ingredient) {
    const hasNoPrice = !ingredient.prices || ingredient.prices.length === 0
    const hasNoWeight = ingredient.weight === null || ingredient.weight === undefined || ingredient.weight === 0 || ingredient.weight === '' || !ingredient.default_unit_id
    return { hasNoPrice, hasNoWeight }
  }

  // Group ingredients by type for display
  function getGroupedIngredients() {
    // First, separate ingredients without a type
    const noTypeIngredients = ingredients.filter(i => !i.type_id)
    
    // Group remaining ingredients by type_id
    const byType = {}
    ingredients.filter(i => i.type_id).forEach(i => {
      if (!byType[i.type_id]) {
        const typeInfo = ingredientTypes.find(t => t.type_id === i.type_id)
        byType[i.type_id] = {
          type_id: i.type_id,
          type_name: typeInfo?.name || 'Unknown Type',
          ingredients: []
        }
      }
      byType[i.type_id].ingredients.push(i)
    })
    
    // Sort ingredients within each group alphabetically
    noTypeIngredients.sort((a, b) => a.name.localeCompare(b.name))
    Object.values(byType).forEach(group => {
      group.ingredients.sort((a, b) => a.name.localeCompare(b.name))
    })
    
    // Sort type groups alphabetically by type name
    const sortedTypes = Object.values(byType).sort((a, b) => a.type_name.localeCompare(b.type_name))
    
    return { noTypeIngredients, typeGroups: sortedTypes }
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
          className={`tab ${activeTab === 'types' ? 'active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          Ingredient Types
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
            {/* Show parent recipes first, then show their variants indented underneath */}
            {recipes
              .filter(r => !r.parent_recipe_id) // Only parent/standalone recipes at top level
              .map(r => {
                const variants = recipes.filter(v => v.parent_recipe_id === r.recipe_id)
                return (
                  <React.Fragment key={r.recipe_id}>
                    <li>
                      <div>
                        <span>{r.name}</span>
                        {variants.length > 0 && (
                          <span className="text-muted" style={{ marginLeft: '0.5em', fontSize: '0.85em' }}>
                            ({variants.length} variant{variants.length !== 1 ? 's' : ''})
                          </span>
                        )}
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
                    {/* Show variants indented */}
                    {variants.map(v => (
                      <li key={v.recipe_id} style={{ paddingLeft: '2rem', borderLeft: '3px solid var(--primary-light)' }}>
                        <div>
                          <span style={{ fontStyle: 'italic' }}>↳ {v.name}</span>
                          <span className="text-muted" style={{ marginLeft: '0.5em', fontSize: '0.85em' }}>
                            (variant)
                          </span>
                          {v.ingredients && v.ingredients.length > 0 && (
                            <div className="text-muted" style={{fontSize: '0.9em', marginTop: '0.25em'}}>
                              Ingredients: {v.ingredients.map(ing => ing.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <div>
                          <button className="small secondary" onClick={() => setEditingRecipe(v)}>Edit</button>
                          <button className="small danger" onClick={() => removeRecipe(v.recipe_id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </React.Fragment>
                )
              })}
          </ul>
        </div>
      )}

      {activeTab === 'ingredients' && (() => {
        const { noTypeIngredients, typeGroups } = getGroupedIngredients()
        
        // Helper to render an ingredient item
        const renderIngredientItem = (i) => {
          const { hasNoPrice, hasNoWeight } = ingredientNeedsConfig(i)
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
        }
        
        return (
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
            
            {/* Ingredients without a type - shown at top */}
            {noTypeIngredients.length > 0 && (
              <div style={{ marginBottom: '1em' }}>
                <h4 style={{ 
                  fontSize: '1em', 
                  fontWeight: 600, 
                  padding: '0.5em',
                  color: 'var(--gray-600)',
                  backgroundColor: 'var(--gray-100)',
                  borderRadius: '4px'
                }}>
                  Uncategorized
                </h4>
                <ul>
                  {noTypeIngredients.map(renderIngredientItem)}
                </ul>
              </div>
            )}
            
            {/* Ingredients grouped by type - collapsible sections */}
            {typeGroups.map(group => {
              const isCollapsed = collapsedTypes[group.type_id] ?? true
              // Check if any ingredient in this group needs config
              const groupHasNoPrice = group.ingredients.some(i => ingredientNeedsConfig(i).hasNoPrice)
              const groupHasNoWeight = group.ingredients.some(i => ingredientNeedsConfig(i).hasNoWeight)
              
              return (
                <div key={group.type_id} style={{ marginBottom: '1em' }}>
                  <h4 
                    onClick={() => toggleTypeCollapsed(group.type_id)}
                    style={{ 
                      fontSize: '1em', 
                      fontWeight: 600, 
                      padding: '0.5em',
                      color: 'var(--gray-700)',
                      backgroundColor: 'var(--gray-100)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      userSelect: 'none'
                    }}
                  >
                    <span>
                      <span style={{ marginRight: '0.5em' }}>
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                      {group.type_name}
                      <span style={{ fontWeight: 'normal', color: 'var(--gray-500)', marginLeft: '0.5em' }}>
                        ({group.ingredients.length})
                      </span>
                      {groupHasNoPrice && (
                        <span 
                          style={{ 
                            marginLeft: '0.5em', 
                            color: '#d9534f', 
                            fontSize: '0.85em'
                          }}
                          title="Some ingredients in this group have no price defined"
                        >
                          💲
                        </span>
                      )}
                      {groupHasNoWeight && (
                        <span 
                          style={{ 
                            marginLeft: '0.5em', 
                            color: '#f0ad4e', 
                            fontSize: '0.85em'
                          }}
                          title="Some ingredients in this group have no weight defined"
                        >
                          ⚖️
                        </span>
                      )}
                    </span>
                  </h4>
                  {!isCollapsed && (
                    <ul style={{ marginTop: '0.25em' }}>
                      {group.ingredients.map(renderIngredientItem)}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {activeTab === 'types' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Manage Ingredient Types</h3>
            <button onClick={() => setEditingType({})}>+ New Type</button>
          </div>
          {ingredientTypes.length === 0 && (
            <div className="empty-state">
              <p>No ingredient types yet. Add types to categorize your ingredients.</p>
            </div>
          )}
          <ul>
            {ingredientTypes.map(t => {
              // Count how many ingredients use this type
              const ingredientCount = ingredients.filter(i => i.type_id === t.type_id).length
              return (
                <li key={t.type_id}>
                  <div>
                    <span>{t.name}</span>
                    <span className="text-muted" style={{ marginLeft: '0.5em', fontSize: '0.9em' }}>
                      ({ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''})
                    </span>
                    {t.description && (
                      <div className="text-muted" style={{fontSize: '0.9em', marginTop: '0.25em'}}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <div>
                    <button className="small secondary" onClick={() => setEditingType(t)}>Edit</button>
                    <button className="small danger" onClick={() => removeType(t.type_id)}>Delete</button>
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
          allRecipes={recipes}
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

      {activeTab === 'types' && editingType && (
        <IngredientTypeEditor
          ingredientType={editingType}
          onCancel={() => setEditingType(null)}
          onSave={saveType}
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
