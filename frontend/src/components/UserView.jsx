import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { getDisplayUnit, toBaseUnit } from '../unitConversions'
import RecipeList from './RecipeList'
import { generateSingleRecipePDF } from '../pdfGenerator'

// Constants for servings input
const DEFAULT_SERVINGS = 1
const DEFAULT_SERVINGS_STR = '1'

// Round to tenths (1 decimal place)
function roundToTenths(value) {
  return Math.round(value * 10) / 10
}

export default function UserView({ user }) {
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [scale, setScale] = useState(DEFAULT_SERVINGS)
  const [scaleInput, setScaleInput] = useState(DEFAULT_SERVINGS_STR) // String state for free-form input
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [error, setError] = useState(null)
  const [units, setUnits] = useState([])
  const [recipeCost, setRecipeCost] = useState(null)
  const [recipeWeight, setRecipeWeight] = useState(null)
  
  // Recipe lists state
  const [recipeLists, setRecipeLists] = useState([])
  const [listMembership, setListMembership] = useState([])
  const [showAddToList, setShowAddToList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [addToListLoading, setAddToListLoading] = useState(false)
  
  // Use user's setting for preferred unit system, fallback to 'US Customary'
  const preferredSystem = user?.settings?.unit === 'metric' ? 'Metric' : 'US Customary'

  useEffect(() => {
    loadRecipes()
    loadUnits()
    loadRecipeLists()
  }, [])

  async function loadRecipes() {
    try {
      const rs = await api.listRecipes()
      setRecipes(rs || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadUnits() {
    try {
      const us = await api.listUnits()
      setUnits(us || [])
    } catch (err) {
      console.error('Failed to load units:', err)
    }
  }

  async function loadRecipeLists() {
    try {
      const lists = await api.listRecipeLists()
      setRecipeLists(lists || [])
    } catch (err) {
      console.error('Failed to load recipe lists:', err)
    }
  }

  async function loadListMembership(recipeId) {
    try {
      const membership = await api.getRecipeListMembership(recipeId)
      setListMembership(membership || [])
    } catch (err) {
      console.error('Failed to load list membership:', err)
      setListMembership([])
    }
  }

  async function selectRecipe(recipe) {
    setSelected(null)
    setVersions([])
    setSelectedVersion(null)
    setScale(DEFAULT_SERVINGS)
    setScaleInput(DEFAULT_SERVINGS_STR)
    setRecipeCost(null)
    setRecipeWeight(null)
    setListMembership([])
    setShowAddToList(false)
    try {
      const full = await api.getRecipe(recipe.recipe_id)
      console.log('[DEBUG] Recipe data received:', {
        recipe_id: full.recipe_id,
        name: full.name,
        base_servings: full.base_servings,
        base_servings_type: typeof full.base_servings,
        full_object_keys: Object.keys(full)
      })
      setSelected(full)
      // Load recipe cost and weight - scale factor is servings / base_servings
      const scaleFactor = DEFAULT_SERVINGS / (full.base_servings || 1)
      console.log('[DEBUG] Scale factor calculation:', {
        DEFAULT_SERVINGS,
        base_servings: full.base_servings,
        scaleFactor,
        calculation: `${DEFAULT_SERVINGS} / ${full.base_servings || 1} = ${scaleFactor}`
      })
      loadRecipeCost(recipe.recipe_id, scaleFactor)
      loadRecipeWeight(recipe.recipe_id, scaleFactor)
      // Load list membership
      loadListMembership(recipe.recipe_id)
      // Attempt to fetch versions; backend may not provide — handle gracefully
      try {
        const vs = await api.listRecipeVersions(recipe.recipe_id)
        setVersions(vs || [])
      } catch {
        setVersions([])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadRecipeCost(recipeId, scaleFactor) {
    try {
      const cost = await api.getRecipeCost(recipeId, scaleFactor)
      setRecipeCost(cost)
    } catch (err) {
      console.error('Failed to load recipe cost:', err)
      setRecipeCost(null)
    }
  }

  async function loadRecipeWeight(recipeId, scaleFactor) {
    try {
      const weight = await api.getRecipeWeight(recipeId, scaleFactor)
      setRecipeWeight(weight)
    } catch (err) {
      console.error('Failed to load recipe weight:', err)
      setRecipeWeight(null)
    }
  }

  function scaledIngredients() {
    if (!selected || !units.length) return []
    const factor = scale / (selected.base_servings || 1)
    
    return (selected.ingredients || []).map(i => {
      const originalUnit = units.find(u => u.unit_id === i.unit_id)
      if (!originalUnit) {
        return { ...i, quantity: i.quantity ? (i.quantity * factor) : i.quantity }
      }
      
      // Scale the quantity
      const scaledQuantity = i.quantity * factor
      
      // For Item and Temperature categories, no conversion needed
      if (originalUnit.category === 'Item' || originalUnit.category === 'Temperature') {
        return {
          ...i,
          quantity: scaledQuantity,
          displayUnit: originalUnit
        }
      }
      
      // Convert to base unit
      const baseQuantity = toBaseUnit(scaledQuantity, originalUnit)
      
      // Get the appropriate display unit based on user preference
      const { quantity: displayQuantity, unit: displayUnit } = getDisplayUnit(
        baseQuantity,
        originalUnit.category,
        units,
        preferredSystem
      )
      
      return {
        ...i,
        quantity: displayQuantity,
        displayUnit: displayUnit || originalUnit
      }
    })
  }

  async function switchVersion(version) {
    if (!version || !selected) return
    try {
      const v = await api.getRecipe(version.id) // assuming versions are recipe-like
      setSelectedVersion(version)
      setSelected(v)
    } catch (err) {
      setError(err.message)
    }
  }

  // Format number to show minimum decimals (tenths only, no trailing zeros)
  function formatServingsDisplay(value) {
    if (value === null || value === undefined || isNaN(value)) return DEFAULT_SERVINGS_STR
    const rounded = roundToTenths(value)
    // Remove trailing .0 for whole numbers
    if (rounded === Math.floor(rounded)) {
      return String(Math.floor(rounded))
    }
    return rounded.toFixed(1)
  }

  // Handle servings input change - allow free-form typing including empty, decimals, etc.
  function handleServingsChange(e) {
    const inputValue = e.target.value
    // Allow empty string and any characters for typing
    setScaleInput(inputValue)
    
    // Only update scale if it's a valid positive number
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue) && numValue > 0) {
      setScale(numValue)
      if (selected?.recipe_id) {
        // Calculate scale factor as servings / base_servings
        const scaleFactor = numValue / (selected.base_servings || 1)
        loadRecipeCost(selected.recipe_id, scaleFactor)
        loadRecipeWeight(selected.recipe_id, scaleFactor)
      }
    }
  }

  // Handle arrow keys for integer stepping
  function handleServingsKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault() // Prevent default browser behavior
      
      const currentValue = parseFloat(scaleInput)
      // If current value is invalid, start from 1
      if (isNaN(currentValue) || currentValue <= 0) {
        const newValue = 1
        setScale(newValue)
        setScaleInput(formatServingsDisplay(newValue))
        if (selected?.recipe_id) {
          // Calculate scale factor as servings / base_servings
          const scaleFactor = newValue / (selected.base_servings || 1)
          loadRecipeCost(selected.recipe_id, scaleFactor)
          loadRecipeWeight(selected.recipe_id, scaleFactor)
        }
        return
      }
      
      let newValue
      if (e.key === 'ArrowUp') {
        // Go to next whole number (ceiling + 1 if already whole, otherwise ceiling)
        newValue = Math.floor(currentValue) + 1
      } else {
        // Go to previous whole number, minimum 1
        // If on a decimal like 1.5, go to 1
        // If on a whole number like 2, go to 1
        const floorValue = Math.floor(currentValue)
        if (currentValue > floorValue) {
          // Has decimal part, go to floor
          newValue = Math.max(1, floorValue)
        } else {
          // Already a whole number, go down by 1
          newValue = Math.max(1, floorValue - 1)
        }
      }
      
      setScale(newValue)
      setScaleInput(formatServingsDisplay(newValue))
      if (selected?.recipe_id) {
        // Calculate scale factor as servings / base_servings
        const scaleFactor = newValue / (selected.base_servings || 1)
        loadRecipeCost(selected.recipe_id, scaleFactor)
        loadRecipeWeight(selected.recipe_id, scaleFactor)
      }
    }
  }

  // Format servings on blur - validate and format to tenths
  function handleServingsBlur() {
    const numValue = parseFloat(scaleInput)
    // If invalid or <= 0, reset to previous valid scale
    if (isNaN(numValue) || numValue <= 0) {
      setScaleInput(formatServingsDisplay(scale))
      return
    }
    // Round to tenths and format
    const rounded = roundToTenths(numValue)
    setScale(rounded)
    setScaleInput(formatServingsDisplay(rounded))
    if (selected?.recipe_id) {
      // Calculate scale factor as servings / base_servings
      const scaleFactor = rounded / (selected.base_servings || 1)
      loadRecipeCost(selected.recipe_id, scaleFactor)
      loadRecipeWeight(selected.recipe_id, scaleFactor)
    }
  }

  // Filter out child recipes (variants) - only show parent recipes
  const parentRecipes = React.useMemo(() => {
    return recipes.filter(r => !r.parent_recipe_id)
  }, [recipes])

  // Find variants for the currently selected recipe (memoized)
  const getVariantsForRecipe = React.useCallback((recipeId) => {
    return recipes.filter(r => r.parent_recipe_id === recipeId)
  }, [recipes])

  // Get current variants (either from selected recipe's variants list or by filtering)
  const currentVariants = selected ? (selected.variants || getVariantsForRecipe(selected.recipe_id)) : []

  // Handle variant selection from dropdown
  async function selectVariant(variantId) {
    if (!variantId) {
      // If empty selection, reload the original parent recipe
      if (selected && selected.parent_recipe_id) {
        // Currently viewing a variant, go back to parent
        const parent = recipes.find(r => r.recipe_id === selected.parent_recipe_id)
        if (parent) {
          await selectRecipe(parent)
        }
      }
      return
    }
    
    try {
      const variant = await api.getRecipe(parseInt(variantId, 10))
      setSelected(variant)
      setScale(DEFAULT_SERVINGS)
      setScaleInput(DEFAULT_SERVINGS_STR)
      // Calculate scale factor as servings / base_servings
      const scaleFactor = DEFAULT_SERVINGS / (variant.base_servings || 1)
      loadRecipeCost(variant.recipe_id, scaleFactor)
      loadRecipeWeight(variant.recipe_id, scaleFactor)
      // Update list membership for the variant recipe
      loadListMembership(variant.recipe_id)
    } catch (err) {
      setError(err.message)
    }
  }

  // Add recipe to existing list
  async function addToExistingList(listId) {
    if (!selected) return
    setAddToListLoading(true)
    try {
      await api.addRecipeToList(listId, {
        recipe_id: selected.recipe_id,
        servings: Math.round(scale) || 1,
        variant_id: selectedVersion?.recipe_id || null
      })
      await loadListMembership(selected.recipe_id)
      await loadRecipeLists()
      setShowAddToList(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setAddToListLoading(false)
    }
  }

  // Create new list and add recipe to it
  async function createListAndAdd(e) {
    e.preventDefault()
    if (!newListName.trim() || !selected) return
    setAddToListLoading(true)
    try {
      const newList = await api.createRecipeList({ name: newListName.trim() })
      await api.addRecipeToList(newList.list_id, {
        recipe_id: selected.recipe_id,
        servings: Math.round(scale) || 1,
        variant_id: selectedVersion?.recipe_id || null
      })
      setNewListName('')
      await loadListMembership(selected.recipe_id)
      await loadRecipeLists()
      setShowAddToList(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setAddToListLoading(false)
    }
  }

  // Get lists that don't contain this recipe
  function getAvailableLists() {
    const memberListIds = listMembership.map(m => m.list_id)
    return recipeLists.filter(list => !memberListIds.includes(list.list_id))
  }

  return (
    <div className="user-view">
      <div className="sidebar">
        <RecipeList recipes={parentRecipes} onSelect={selectRecipe} />
      </div>
      <div className="content">
        {error && <div className="error">{error}</div>}
        {!selected && (
          <div className="empty-state">
            <p>Select a recipe from the list to view details, ingredients, and cooking instructions.</p>
          </div>
        )}
        {selected && (
          <article>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{selected.name}</h2>
              <button 
                className="pdf-button"
                onClick={() => generateSingleRecipePDF(selected, scaledIngredients(), scale, null, recipeCost, recipeWeight)}
                title="Download recipe as PDF"
              >
                📄 PDF
              </button>
            </div>
            {/* Recipe Variation dropdown - shown when recipe has variants or is a variant */}
            {(currentVariants.length > 0 || selected.parent_recipe_id) && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '1rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                <label style={{ marginBottom: 0, fontWeight: 500 }}>Recipe Variation</label>
                <select 
                  style={{ width: 'auto', minWidth: '150px' }}
                  value={selected.recipe_id}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    if (selectedId === String(selected.recipe_id)) return
                    
                    // Find the parent recipe id (could be current recipe if viewing parent, or parent_recipe_id if viewing variant)
                    const parentId = selected.parent_recipe_id || selected.recipe_id
                    const parent = recipes.find(r => r.recipe_id === parentId)
                    
                    if (selectedId === String(parentId) && parent) {
                      // Selected the parent recipe
                      selectRecipe(parent)
                    } else {
                      // Selected a variant
                      selectVariant(selectedId)
                    }
                  }}
                >
                  {/* Show parent recipe as first option */}
                  {selected.parent_recipe_id ? (
                    // Currently viewing a variant - show parent first
                    <>
                      <option value={selected.parent_recipe_id}>
                        {recipes.find(r => r.recipe_id === selected.parent_recipe_id)?.name || 'Original'}
                      </option>
                      {recipes
                        .filter(r => r.parent_recipe_id === selected.parent_recipe_id)
                        .map(v => (
                          <option key={v.recipe_id} value={v.recipe_id}>{v.name}</option>
                        ))}
                    </>
                  ) : (
                    // Currently viewing parent - show self and variants
                    <>
                      <option value={selected.recipe_id}>{selected.name}</option>
                      {currentVariants.map(v => (
                        <option key={v.recipe_id} value={v.recipe_id}>{v.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            )}
            
            {/* Recipe Lists Section */}
            <div className="recipe-lists-section">
              {listMembership.length > 0 && (
                <div className="list-membership">
                  <span className="label">In lists:</span>
                  {listMembership.map(m => (
                    <span key={m.list_id} className="list-tag">
                      {m.list_name}
                    </span>
                  ))}
                </div>
              )}
              <button 
                className="add-to-list-btn small"
                onClick={() => setShowAddToList(!showAddToList)}
              >
                {showAddToList ? '✕ Close' : '+ Save to List'}
              </button>
            </div>

            {/* Add to List Dropdown */}
            {showAddToList && (
              <div className="add-to-list-dropdown">
                <div className="dropdown-header">Save to Recipe List</div>
                {getAvailableLists().length > 0 && (
                  <div className="existing-lists">
                    {getAvailableLists().map(list => (
                      <button
                        key={list.list_id}
                        className="list-option"
                        onClick={() => addToExistingList(list.list_id)}
                        disabled={addToListLoading}
                      >
                        {list.name}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={createListAndAdd} className="create-new-list">
                  <input
                    type="text"
                    placeholder="Create new list..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <button type="submit" disabled={addToListLoading || !newListName.trim()}>
                    Create & Add
                  </button>
                </form>
                <p className="add-note" style={{ 
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontWeight: 500
                }}>
                  📋 Saving with <strong>{Math.round(scale)} servings</strong>
                  {selectedVersion && ` • ${selectedVersion.variant_notes || selectedVersion.name}`}
                </p>
              </div>
            )}

            {/* Debug info banner - temporary for debugging */}
            {selected && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: 'var(--border-radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.9em',
                fontFamily: 'monospace'
              }}>
                <strong>🐛 DEBUG INFO:</strong><br />
                Recipe Base Servings: {selected.base_servings || 'undefined'}<br />
                Current Servings Display: {scale}<br />
                Scale Factor (for API): {selected.base_servings ? (scale / selected.base_servings).toFixed(6) : 'N/A'} (= {scale} / {selected.base_servings || '?'})
              </div>
            )}

            <div className="meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ marginBottom: 0 }}>Servings</label>
                <input 
                  type="number" 
                  value={scaleInput} 
                  min="1" 
                  step="1" 
                  style={{ width: '80px' }}
                  onChange={handleServingsChange}
                  onKeyDown={handleServingsKeyDown}
                  onBlur={handleServingsBlur}
                />
              </div>
              {recipeCost && (recipeCost.total_cost !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ marginBottom: 0 }}>Estimated Cost</label>
                  <span style={{ fontWeight: 600, fontSize: '1.1em' }}>${recipeCost.total_cost.toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)' }}>
                  <label style={{ marginBottom: 0 }}>Cost</label>
                  <span style={{ fontSize: '0.9em' }}>incomplete</span>
                </div>
              ))}
              {recipeWeight && (recipeWeight.total_weight !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ marginBottom: 0 }}>Total Weight</label>
                  <span style={{ fontWeight: 600, fontSize: '1.1em' }}>{recipeWeight.total_weight.toFixed(0)}g</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)' }}>
                  <label style={{ marginBottom: 0 }}>Weight</label>
                  <span style={{ fontSize: '0.9em' }}>incomplete</span>
                </div>
              ))}
              {(versions.length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ marginBottom: 0 }}>Version</label>
                  <select 
                    style={{ width: 'auto' }}
                    onChange={(e) => {
                      const v = versions.find(x => String(x.id) === e.target.value)
                      setSelectedVersion(v || null)
                      if (v) switchVersion(v)
                    }}>
                    <option value="">Default</option>
                    {versions.map(v => <option value={v.id} key={v.id}>{v.name || v.id}</option>)}
                  </select>
                </div>
              )}
              {selected.tags && selected.tags.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ marginBottom: 0 }}>Tags</label>
                  {selected.tags.map(tag => (
                    <span 
                      key={tag.tag_id}
                      style={{
                        padding: '0.2em 0.6em',
                        borderRadius: '1em',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '0.85em',
                        fontWeight: 500
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <section>
              <h3>Ingredients</h3>
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1.25rem', 
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                {(() => {
                  // Group ingredients by group_id
                  const grouped = scaledIngredients().reduce((acc, ing) => {
                    const groupKey = ing.group_id || 'ungrouped'
                    if (!acc[groupKey]) {
                      acc[groupKey] = {
                        name: ing.group_name,
                        ingredients: []
                      }
                    }
                    acc[groupKey].ingredients.push(ing)
                    return acc
                  }, {})
                  
                  // Sort groups: ungrouped first, then by group name
                  const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
                    if (keyA === 'ungrouped') return -1
                    if (keyB === 'ungrouped') return 1
                    return 0
                  })
                  
                  return sortedGroups.map(([groupKey, group], index) => {
                    const isLastGroup = index === sortedGroups.length - 1
                    return (
                      <div key={groupKey} style={{ marginBottom: isLastGroup ? 0 : '1em' }}>
                        {groupKey !== 'ungrouped' && group.name && (
                          <h4 style={{ 
                            fontSize: '1em', 
                            fontWeight: 600, 
                            marginTop: '0.5em', 
                            marginBottom: '0.5em',
                            color: 'var(--gray-700)'
                          }}>
                            {group.name}
                          </h4>
                        )}
                        <ul style={{ paddingLeft: groupKey !== 'ungrouped' ? '1.5rem' : 0 }}>
                          {group.ingredients.map((ing, idx) => (
                            <li key={idx}>
                              <span>
                                {ing.quantity && ing.displayUnit ? (
                                  <strong>{formatRecipeUnits(ing.quantity, 2)} {ing.displayUnit.abbreviation}</strong>
                                ) : ''} {ing.name}
                                {ing.notes ? <span className="text-muted"> — {ing.notes}</span> : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })
                })()}
              </div>
            </section>

            <section>
              <h3>Instructions</h3>
              <div className="instructions">{selected.instructions}</div>
            </section>
          </article>
        )}
      </div>
    </div>
  )
}
