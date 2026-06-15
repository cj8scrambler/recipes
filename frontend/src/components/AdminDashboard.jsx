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
  const [variantTypes, setVariantTypes] = useState([])
  const [editingVariantType, setEditingVariantType] = useState(null)
  const [newVariantTypeName, setNewVariantTypeName] = useState('')
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
      const [rs, is, gs, its, ts, us, vts] = await Promise.all([
        api.adminListRecipes(),
        api.adminListIngredients(),
        api.adminListIngredientGroups(),
        api.adminListIngredientTypes(),
        api.adminListTags(),
        api.adminListUsers(),
        api.listVariantTypes()
      ])
      setRecipes(rs || [])
      setIngredients(is || [])
      setIngredientGroups(gs || [])
      setIngredientTypes(its || [])
      setTags(ts || [])
      setUsers(us || [])
      setVariantTypes(vts || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function createVariantOf(parentRecipe) {
    try {
      const full = await api.getRecipe(parentRecipe.recipe_id)
      setEditingRecipe({
        parent_recipe_id: full.recipe_id,
        name: full.name,
        description: full.description,
        instructions: full.instructions,
        base_servings: full.base_servings,
        ingredients: full.ingredients,
        tags: full.tags,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveVariantType(e) {
    e.preventDefault()
    const name = newVariantTypeName.trim()
    if (!name) return
    try {
      if (editingVariantType?.variant_type_id) {
        await api.updateVariantType(editingVariantType.variant_type_id, { name })
      } else {
        await api.createVariantType({ name })
      }
      setEditingVariantType(null)
      setNewVariantTypeName('')
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeVariantType(id) {
    if (!confirm('Delete this variant type?')) return
    try {
      await api.deleteVariantType(id)
      await loadAll()
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
    setError(null)
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

    const cat = ingredient.default_unit_category
    const isVolumeUnit = ['Volume', 'Dry Volume', 'Liquid Volume'].includes(cat)
    const isItemUnit = cat === 'Item'

    // No weight unit assigned at all
    const hasNoUnit = !ingredient.default_unit_id

    // Volume/item ingredients need weight (g/unit) explicitly set.
    // weight=0 is valid (e.g. Water), so only flag null/undefined.
    // Also OK if density is set — that can bridge the gap for cross-category recipes.
    const hasMissingWeight = (isVolumeUnit || isItemUnit) &&
      (ingredient.weight === null || ingredient.weight === undefined) &&
      !ingredient.density

    const hasNoWeight = hasNoUnit || hasMissingWeight

    // Backend tells us if this ingredient is actually used with a cross-category unit
    // in any recipe and is missing density — the only case it's truly needed.
    const needsDensity = !!ingredient.needs_density

    return { hasNoPrice, hasNoWeight, needsDensity }
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
          className={`tab ${activeTab === 'variant-types' ? 'active' : ''}`}
          onClick={() => setActiveTab('variant-types')}
        >
          Variant Types
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      {activeTab === 'recipes' && (
        <>
          {editingRecipe && (
            <RecipeEditor
              recipe={editingRecipe}
              onCancel={() => setEditingRecipe(null)}
              onSave={saveRecipe}
              allRecipes={recipes}
            />
          )}
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
                          <span style={{
                            marginLeft: '0.5em',
                            padding: '0.15rem 0.5rem',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            color: 'var(--gray-600)',
                          }}>
                            {r.variant_type_name || 'Base'}
                          </span>
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
                          <button className="small secondary" onClick={() => createVariantOf(r)}>+ Variant</button>
                          <button className="small secondary" onClick={() => setEditingRecipe(r)}>Edit</button>
                          <button className="small danger" onClick={() => removeRecipe(r.recipe_id)}>Delete</button>
                        </div>
                      </li>
                      {/* Show variants indented */}
                      {variants.map(v => (
                        <li key={v.recipe_id} style={{ paddingLeft: '2rem', borderLeft: '3px solid var(--primary-light)' }}>
                          <div>
                            <span style={{ fontStyle: 'italic' }}>↳ {v.name}</span>
                            <span style={{
                              marginLeft: '0.5em',
                              padding: '0.15rem 0.5rem',
                              background: 'var(--accent)',
                              color: 'white',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                            }}>
                              {v.variant_type_name || 'Variant'}
                            </span>
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
        </>
      )}

      {activeTab === 'ingredients' && (() => {
        const { noTypeIngredients, typeGroups } = getGroupedIngredients()
        
        const badge = (text, color, title) => (
          <span
            title={title}
            style={{
              marginLeft: '0.4em',
              padding: '0.1em 0.4em',
              borderRadius: '3px',
              fontSize: '0.72em',
              fontWeight: 'bold',
              backgroundColor: color,
              color: '#fff',
              verticalAlign: 'middle',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </span>
        )

        // Helper to render an ingredient item
        const renderIngredientItem = (i) => {
          const { hasNoPrice, hasNoWeight, needsDensity } = ingredientNeedsConfig(i)
          return (
            <li key={i.ingredient_id}>
              <span>
                {i.name} {i.unit ? <span className="text-muted">({i.unit})</span> : ''}
                {hasNoPrice    && badge('no price',   '#d9534f', 'No price defined')}
                {hasNoWeight   && badge('no weight',  '#f0ad4e', 'No weight configured — add a weight (g/unit) or density to enable recipe weight calculation')}
                {needsDensity  && badge('no density', '#8a6bb1', 'No density (g/mL) set — weight calculation will fail if this ingredient is measured by volume in a recipe')}
              </span>
              <div>
                <button className="small secondary" onClick={() => setEditingIngredient(i)}>Edit</button>
                <button className="small danger" onClick={() => removeIngredient(i.ingredient_id)}>Delete</button>
              </div>
            </li>
          )
        }
        
        return (
          <>
            {editingIngredient && (
              <IngredientEditor
                ingredient={editingIngredient}
                onCancel={() => setEditingIngredient(null)}
                onSave={saveIngredient}
              />
            )}
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
                    {noTypeIngredients.some(i => ingredientNeedsConfig(i).hasNoPrice)   && badge('no price',   '#d9534f', 'Some ingredients have no price defined')}
                    {noTypeIngredients.some(i => ingredientNeedsConfig(i).hasNoWeight)  && badge('no weight',  '#f0ad4e', 'Some ingredients have no weight defined')}
                    {noTypeIngredients.some(i => ingredientNeedsConfig(i).needsDensity) && badge('no density', '#8a6bb1', 'Some ingredients have no density set')}
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
                const groupNeedsDensity = group.ingredients.some(i => ingredientNeedsConfig(i).needsDensity)
                
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
                        {groupHasNoPrice   && badge('no price',   '#d9534f', 'Some ingredients in this group have no price defined')}
                        {groupHasNoWeight  && badge('no weight',  '#f0ad4e', 'Some ingredients in this group have no weight defined')}
                        {groupNeedsDensity && badge('no density', '#8a6bb1', 'Some ingredients in this group have no density set — weight calculation may fail if measured by volume in a recipe')}
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
          </>
        )
      })()}

      {activeTab === 'types' && (
        <>
          {editingType && (
            <IngredientTypeEditor
              ingredientType={editingType}
              onCancel={() => setEditingType(null)}
              onSave={saveType}
            />
          )}
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
        </>
      )}

      {activeTab === 'groups' && (
        <>
          {editingGroup && (
            <IngredientGroupEditor
              group={editingGroup}
              onCancel={() => setEditingGroup(null)}
              onSave={saveGroup}
            />
          )}
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
        </>
      )}

      {activeTab === 'tags' && (
        <>
          {editingTag && (
            <TagEditor
              tag={editingTag}
              onCancel={() => setEditingTag(null)}
              onSave={saveTag}
            />
          )}
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
        </>
      )}

      {activeTab === 'variant-types' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Manage Variant Types</h3>
          </div>
          <form onSubmit={saveVariantType} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', padding: '0 0 1rem', borderBottom: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder={editingVariantType ? 'Edit variant type name…' : 'New variant type name…'}
              value={newVariantTypeName}
              onChange={e => setNewVariantTypeName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={!newVariantTypeName.trim()}>
              {editingVariantType ? 'Save' : '+ Add'}
            </button>
            {editingVariantType && (
              <button type="button" className="secondary" onClick={() => { setEditingVariantType(null); setNewVariantTypeName('') }}>
                Cancel
              </button>
            )}
          </form>
          {variantTypes.length === 0 && (
            <div className="empty-state">
              <p>No variant types yet.</p>
            </div>
          )}
          <ul>
            {variantTypes.map(vt => (
              <li key={vt.variant_type_id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{vt.name}</span>
                  {vt.is_protected && (
                    <span style={{
                      padding: '0.1rem 0.4rem',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '3px',
                      fontSize: '0.72rem',
                      color: 'var(--gray-500)',
                    }}>
                      protected
                    </span>
                  )}
                </div>
                <div>
                  {!vt.is_protected && (
                    <>
                      <button className="small secondary" onClick={() => { setEditingVariantType(vt); setNewVariantTypeName(vt.name) }}>Edit</button>
                      <button className="small danger" onClick={() => removeVariantType(vt.variant_type_id)}>Delete</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'users' && (
        <UserManagement users={users} onRefresh={loadAll} />
      )}
    </div>
  )
}
