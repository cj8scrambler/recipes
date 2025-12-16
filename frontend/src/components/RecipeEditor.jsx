import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { toBaseUnit } from '../unitConversions'

/**
 * Format quantity for display in input field - removes trailing zeros
 */
function formatQuantityForInput(quantity) {
  if (quantity === '' || quantity == null) return '';
  const num = parseFloat(quantity);
  if (isNaN(num)) return '';
  // Format to max 1 decimal place and remove trailing zeros
  return parseFloat(num.toFixed(1)).toString();
}

export default function RecipeEditor({ recipe = null, onCancel, onSave, allRecipes = [] }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState([])
  const [units, setUnits] = useState([])
  const [allIngredients, setAllIngredients] = useState([])
  const [ingredientGroups, setIngredientGroups] = useState([])
  const [ingredientTypes, setIngredientTypes] = useState([])
  const [allTags, setAllTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [recipeCost, setRecipeCost] = useState(null)
  const [recipeWeight, setRecipeWeight] = useState(null)
  const [parentRecipeId, setParentRecipeId] = useState(null)

  useEffect(() => {
    loadUnits()
    loadIngredients()
    loadIngredientGroups()
    loadIngredientTypes()
    loadTags()
  }, [])

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '')
      setDescription(recipe.description || '')
      setInstructions(recipe.instructions || '')
      setServings(recipe.base_servings || 1)
      setParentRecipeId(recipe.parent_recipe_id || null)
      // Ingredients from backend already have ingredient_id, quantity (in base units), unit_id, notes, group_id
      setIngredients((recipe.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredient_id || '',
        quantity: formatQuantityForInput(ing.quantity),
        unit_id: ing.unit_id || '',
        notes: ing.notes || '',
        group_id: ing.group_id || ''
      })))
      // Set selected tags
      setSelectedTags((recipe.tags || []).map(t => t.tag_id))
      // Load cost and weight if editing existing recipe
      if (recipe.recipe_id) {
        loadRecipeCost(recipe.recipe_id)
        loadRecipeWeight(recipe.recipe_id)
      }
    } else {
      setName('')
      setDescription('')
      setInstructions('')
      setServings(1)
      setIngredients([])
      setSelectedTags([])
      setRecipeCost(null)
      setRecipeWeight(null)
      setParentRecipeId(null)
    }
  }, [recipe])

  async function loadRecipeCost(recipeId) {
    try {
      const cost = await api.getRecipeCost(recipeId, 1.0)
      setRecipeCost(cost)
    } catch (err) {
      console.error('Failed to load recipe cost:', err)
      setRecipeCost(null)
    }
  }

  async function loadRecipeWeight(recipeId) {
    try {
      const weight = await api.getRecipeWeight(recipeId, 1.0)
      setRecipeWeight(weight)
    } catch (err) {
      console.error('Failed to load recipe weight:', err)
      setRecipeWeight(null)
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

  async function loadIngredients() {
    try {
      const ings = await api.listIngredients()
      setAllIngredients(ings || [])
    } catch (err) {
      console.error('Failed to load ingredients:', err)
    }
  }

  async function loadIngredientGroups() {
    try {
      const groups = await api.adminListIngredientGroups()
      setIngredientGroups(groups || [])
    } catch (err) {
      console.error('Failed to load ingredient groups:', err)
    }
  }

  async function loadIngredientTypes() {
    try {
      const types = await api.listIngredientTypes()
      setIngredientTypes(types || [])
    } catch (err) {
      console.error('Failed to load ingredient types:', err)
    }
  }

  async function loadTags() {
    try {
      const tags = await api.adminListTags()
      setAllTags(tags || [])
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }

  // Handle parent recipe selection change
  async function handleParentRecipeChange(newParentId) {
    const parsedParentId = newParentId ? parseInt(newParentId, 10) : null
    
    setParentRecipeId(parsedParentId)
    
    // If setting a parent recipe and current recipe has NO ingredients, copy from parent
    if (parsedParentId && ingredients.length === 0) {
      try {
        const parentRecipe = await api.getRecipe(parsedParentId)
        if (parentRecipe) {
          // Copy ingredients from parent
          if (parentRecipe.ingredients && parentRecipe.ingredients.length > 0) {
            setIngredients(parentRecipe.ingredients.map(ing => ({
              ingredient_id: ing.ingredient_id || '',
              quantity: formatQuantityForInput(ing.quantity),
              unit_id: ing.unit_id || '',
              notes: ing.notes || '',
              group_id: ing.group_id || ''
            })))
          }
          // Copy description, instructions, and base_servings from parent
          if (parentRecipe.description) {
            setDescription(parentRecipe.description)
          }
          if (parentRecipe.instructions) {
            setInstructions(parentRecipe.instructions)
          }
          if (parentRecipe.base_servings) {
            setServings(parentRecipe.base_servings)
          }
        }
      } catch (err) {
        console.error('Failed to load parent recipe:', err)
      }
    }
    // If removing parent (newParentId is null), keep all current values - no changes needed
  }

  // Get available parent recipes (exclude self and any recipes that have this recipe as parent)
  function getAvailableParentRecipes() {
    if (!allRecipes || allRecipes.length === 0) return []
    
    // Filter out:
    // 1. The current recipe itself
    // 2. Any recipe that already has a parent (can't be a parent if it's already a variant)
    // 3. Any recipe that is a variant of the current recipe (would create circular reference)
    return allRecipes.filter(r => {
      // Don't include self
      if (recipe?.recipe_id && r.recipe_id === recipe.recipe_id) return false
      // Don't include recipes that already have a parent (variants can't be parents)
      if (r.parent_recipe_id) return false
      return true
    })
  }

  function addIngredient() {
    setIngredients([
      ...ingredients,
      { ingredient_id: '', quantity: '', unit_id: '', notes: '', group_id: '' }
    ])
  }

  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function updateIngredient(index, field, value) {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    
    // If ingredient_id is being changed, auto-select its default unit
    if (field === 'ingredient_id' && value) {
      const selectedIngredient = allIngredients.find(ing => ing.ingredient_id === parseInt(value))
      if (selectedIngredient && selectedIngredient.default_unit_id) {
        updated[index].unit_id = selectedIngredient.default_unit_id
      }
    }
    
    setIngredients(updated)
  }

  function toggleTag(tagId) {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(t => t !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  function submit(e) {
    e.preventDefault()
    
    // Convert all ingredient quantities to base units for storage
    const processedIngredients = ingredients
      .filter(ing => ing.ingredient_id && ing.quantity && ing.unit_id)
      .map(ing => {
        const unit = units.find(u => u.unit_id === parseInt(ing.unit_id))
        const baseQuantity = unit && unit.base_conversion_factor 
          ? toBaseUnit(parseFloat(ing.quantity), unit)
          : parseFloat(ing.quantity)
        
        // Find the base unit for this category
        // For volume units (Volume, Dry Volume, Liquid Volume), use the base Volume unit
        // For other categories, use the base unit in the same category
        let baseUnit = unit
        if (unit && unit.category !== 'Item' && unit.category !== 'Temperature') {
          const volumeCategories = ['Volume', 'Dry Volume', 'Liquid Volume']
          const isVolumeUnit = volumeCategories.includes(unit.category)
          
          if (isVolumeUnit) {
            // For any volume category, find the base unit in 'Volume' category
            baseUnit = units.find(u => 
              u.category === 'Volume' && 
              u.base_conversion_factor === 1.0
            )
          } else {
            // For non-volume categories, find base unit in same category
            baseUnit = units.find(u => 
              u.category === unit.category && 
              u.base_conversion_factor === 1.0
            )
          }
        }
        
        return {
          ingredient_id: parseInt(ing.ingredient_id),
          quantity: baseUnit ? baseQuantity : parseFloat(ing.quantity),
          unit_id: baseUnit ? baseUnit.unit_id : parseInt(ing.unit_id),
          notes: ing.notes || null,
          group_id: ing.group_id ? parseInt(ing.group_id) : null
        }
      })
    
    onSave({
      ...recipe,
      name,
      description,
      instructions,
      base_servings: Number(servings),
      ingredients: processedIngredients,
      tags: selectedTags.map(tag_id => ({ tag_id })),
      parent_recipe_id: parentRecipeId
    })
  }

  // Check if this recipe is a variant (has a parent)
  const isVariant = !!parentRecipeId

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{recipe?.recipe_id ? 'Edit Recipe' : 'New Recipe'}</h3>
      
      {/* Parent Recipe Selection - for creating/editing variants */}
      <div className="form-group">
        <label>
          Parent Recipe (Optional - makes this a variant)
          <select 
            value={parentRecipeId || ''} 
            onChange={(e) => handleParentRecipeChange(e.target.value)}
          >
            <option value="">None (standalone recipe)</option>
            {getAvailableParentRecipes().map(r => (
              <option key={r.recipe_id} value={r.recipe_id}>{r.name}</option>
            ))}
          </select>
        </label>
        {isVariant && (
          <div style={{ 
            marginTop: '0.5em', 
            padding: '0.5em', 
            backgroundColor: 'var(--primary-light)', 
            borderRadius: '4px',
            fontSize: '0.9em',
            color: 'var(--primary-dark)'
          }}>
            ℹ️ This recipe is a variant and will not appear as a separate recipe in the browse list.
          </div>
        )}
      </div>

      <div className="form-group">
        <label>
          {isVariant ? 'Variant Name' : 'Recipe Name'}
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Chocolate Chip Cookies" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Description
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="A brief description of this recipe..." 
            rows="2"
          />
        </label>
      </div>
      <div className="form-group">
        <label>
          Servings
          <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} min="1" placeholder="4" />
        </label>
      </div>
      <div className="form-group">
        <label>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em', marginTop: '0.5em' }}>
          {allTags.length === 0 ? (
            <span className="text-muted">No tags available. Create tags in the Tags tab.</span>
          ) : (
            allTags.map(tag => (
              <button
                key={tag.tag_id}
                type="button"
                onClick={() => toggleTag(tag.tag_id)}
                style={{
                  padding: '0.25em 0.75em',
                  borderRadius: '1em',
                  border: selectedTags.includes(tag.tag_id) ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  background: selectedTags.includes(tag.tag_id) ? 'var(--primary-light)' : 'var(--bg-primary)',
                  color: selectedTags.includes(tag.tag_id) ? 'var(--primary)' : 'var(--gray-700)',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                {tag.name}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="form-group">
        <label>Ingredients</label>
        {(() => {
          // Group ingredients by group_id for display
          const grouped = ingredients.reduce((acc, ing, idx) => {
            const groupKey = ing.group_id || 'ungrouped'
            if (!acc[groupKey]) {
              acc[groupKey] = {
                name: ingredientGroups.find(g => g.group_id === parseInt(ing.group_id))?.name || null,
                ingredients: []
              }
            }
            acc[groupKey].ingredients.push({ ...ing, originalIndex: idx })
            return acc
          }, {})
          
          // Sort groups: ungrouped first, then by group name
          const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
            if (keyA === 'ungrouped') return -1
            if (keyB === 'ungrouped') return 1
            return 0
          })
          
          return sortedGroups.map(([groupKey, group]) => (
            <div key={groupKey} style={{ marginBottom: '1em' }}>
              {groupKey !== 'ungrouped' && group.name && (
                <h4 style={{ 
                  fontSize: '1em', 
                  fontWeight: 600, 
                  marginTop: '0.5em', 
                  marginBottom: '0.5em',
                  color: 'var(--gray-700)',
                  paddingLeft: '0.5em',
                  borderLeft: '3px solid var(--primary)'
                }}>
                  {group.name}
                </h4>
              )}
              <div style={{ paddingLeft: groupKey !== 'ungrouped' ? '1rem' : 0 }}>
                {group.ingredients.map((ing) => {
                  const idx = ing.originalIndex
                  const selectedIngredient = allIngredients.find(i => i.ingredient_id === parseInt(ing.ingredient_id))
                  const selectedUnit = units.find(u => u.unit_id === parseInt(ing.unit_id))
                  
                  return (
                    <div key={idx} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 2fr 2fr 1.5fr auto', 
                      gap: '0.5em', 
                      marginBottom: '0.5em',
                      alignItems: 'start'
                    }}>
                      <select 
                        value={ing.ingredient_id} 
                        onChange={(e) => updateIngredient(idx, 'ingredient_id', e.target.value)}
                        required
                      >
                        <option value="">Select ingredient</option>
                        {/* First show ingredients without a type */}
                        {(() => {
                          const noTypeIngredients = allIngredients
                            .filter(i => !i.type_id)
                            .sort((a, b) => a.name.localeCompare(b.name))
                          if (noTypeIngredients.length > 0) {
                            return noTypeIngredients.map(i => (
                              <option key={i.ingredient_id} value={i.ingredient_id}>
                                {i.name}
                              </option>
                            ))
                          }
                          return null
                        })()}
                        {/* Then show ingredients grouped by type */}
                        {ingredientTypes
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(type => {
                            const typeIngredients = allIngredients
                              .filter(i => i.type_id === type.type_id)
                              .sort((a, b) => a.name.localeCompare(b.name))
                            if (typeIngredients.length === 0) return null
                            return (
                              <optgroup key={type.type_id} label={type.name}>
                                {typeIngredients.map(i => (
                                  <option key={i.ingredient_id} value={i.ingredient_id}>
                                    {i.name}
                                  </option>
                                ))}
                              </optgroup>
                            )
                          })}
                      </select>
                      <input 
                        type="number" 
                        step="0.1"
                        value={ing.quantity} 
                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        required
                      />
                      <select 
                        value={ing.unit_id} 
                        onChange={(e) => updateIngredient(idx, 'unit_id', e.target.value)}
                        required
                      >
                        <option value="">Select unit</option>
                        {/* Group units by category for easier navigation */}
                        {selectedUnit && (
                          <optgroup label={`${selectedUnit.category} (Current)`}>
                            {units
                              .filter(u => u.category === selectedUnit.category)
                              .map(u => (
                                <option key={u.unit_id} value={u.unit_id}>
                                  {u.name} ({u.abbreviation})
                                </option>
                              ))}
                          </optgroup>
                        )}
                        {/* Show other categories for switching */}
                        {['Volume', 'Dry Volume', 'Liquid Volume', 'Weight', 'Item', 'Temperature']
                          .filter(cat => !selectedUnit || cat !== selectedUnit.category)
                          .map(category => {
                            const categoryUnits = units.filter(u => u.category === category)
                            if (categoryUnits.length === 0) return null
                            return (
                              <optgroup key={category} label={category}>
                                {categoryUnits.map(u => (
                                  <option key={u.unit_id} value={u.unit_id}>
                                    {u.name} ({u.abbreviation})
                                  </option>
                                ))}
                              </optgroup>
                            )
                          })}
                      </select>
                      <input 
                        type="text"
                        value={ing.notes || ''} 
                        onChange={(e) => updateIngredient(idx, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                      />
                      <select 
                        value={ing.group_id || ''} 
                        onChange={(e) => updateIngredient(idx, 'group_id', e.target.value)}
                      >
                        <option value="">No group</option>
                        {ingredientGroups.map(g => (
                          <option key={g.group_id} value={g.group_id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="small danger" 
                        onClick={() => removeIngredient(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        })()}
        <button type="button" className="small secondary" onClick={addIngredient}>
          + Add Ingredient
        </button>
        
        {recipeCost && recipe?.recipe_id && (
          <div style={{ 
            marginTop: '1em', 
            padding: '0.75em', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <h4 style={{ margin: '0 0 0.5em 0' }}>Cost Information</h4>
            {recipeCost.ingredients_cost && recipeCost.ingredients_cost.length > 0 && (
              <div style={{ marginBottom: '0.5em', overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  fontSize: '0.85em',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ textAlign: 'left', padding: '0.5em', fontWeight: 'bold' }}>Ingredient</th>
                      <th style={{ textAlign: 'left', padding: '0.5em', fontWeight: 'bold' }}>Original Cost</th>
                      <th style={{ textAlign: 'left', padding: '0.5em', fontWeight: 'bold' }}>Recipe Cost</th>
                      <th style={{ textAlign: 'right', padding: '0.5em', fontWeight: 'bold' }}>Quantity</th>
                      <th style={{ textAlign: 'right', padding: '0.5em', fontWeight: 'bold' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipeCost.ingredients_cost.map((ingCost, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5em' }}>{ingCost.name}</td>
                        {ingCost.has_price_data && ingCost.details ? (
                          <>
                            <td style={{ padding: '0.5em' }}>
                              ${ingCost.details.original_price.toFixed(2)} / {ingCost.details.original_unit}
                            </td>
                            <td style={{ padding: '0.5em' }}>
                              ${ingCost.details.price_per_recipe_unit.toFixed(3)} / {ingCost.details.recipe_unit}
                            </td>
                            <td style={{ textAlign: 'right', padding: '0.5em' }}>
                              {ingCost.details.recipe_quantity.toFixed(1)} {ingCost.details.recipe_unit}
                            </td>
                            <td style={{ textAlign: 'right', padding: '0.5em', fontWeight: 'bold' }}>
                              ${ingCost.cost.toFixed(2)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td colSpan="4" style={{ padding: '0.5em', color: '#d9534f', textAlign: 'center' }}>
                              Price not available
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {recipeCost.total_cost !== null ? (
              <div style={{ 
                borderTop: '2px solid #ddd', 
                paddingTop: '0.5em',
                fontWeight: 'bold',
                fontSize: '1em'
              }}>
                Total: ${recipeCost.total_cost.toFixed(2)}
              </div>
            ) : (
              <div style={{ 
                borderTop: '2px solid #ddd', 
                paddingTop: '0.5em',
                color: '#d9534f'
              }}>
                Total cost cannot be calculated - some prices missing
              </div>
            )}
          </div>
        )}

        {recipeWeight && recipe?.recipe_id && (
          <div style={{ 
            marginTop: '1em', 
            padding: '0.75em', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <h4 style={{ margin: '0 0 0.5em 0' }}>Weight Information</h4>
            {recipeWeight.ingredients_weight && recipeWeight.ingredients_weight.length > 0 && (
              <div style={{ marginBottom: '0.5em', overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  fontSize: '0.85em',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ textAlign: 'left', padding: '0.5em', fontWeight: 'bold' }}>Ingredient</th>
                      <th style={{ textAlign: 'right', padding: '0.5em', fontWeight: 'bold' }}>Base Weight (g)</th>
                      <th style={{ textAlign: 'right', padding: '0.5em', fontWeight: 'bold' }}>Recipe Weight (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipeWeight.ingredients_weight.map((ingWeight, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5em' }}>{ingWeight.name}</td>
                        {ingWeight.has_weight_data ? (
                          <>
                            <td style={{ textAlign: 'right', padding: '0.5em' }}>
                              {ingWeight.base_weight.toFixed(0)}
                            </td>
                            <td style={{ textAlign: 'right', padding: '0.5em', fontWeight: 'bold' }}>
                              {ingWeight.scaled_weight.toFixed(0)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td colSpan="2" style={{ padding: '0.5em', color: '#d9534f', textAlign: 'center' }}>
                              Weight not available
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {recipeWeight.total_weight !== null ? (
              <div style={{ 
                borderTop: '2px solid #ddd', 
                paddingTop: '0.5em',
                fontWeight: 'bold',
                fontSize: '1em'
              }}>
                Total Weight: {recipeWeight.total_weight.toFixed(0)}g
              </div>
            ) : (
              <div style={{ 
                borderTop: '2px solid #ddd', 
                paddingTop: '0.5em',
                color: '#d9534f'
              }}>
                Total weight cannot be calculated - some weights missing
              </div>
            )}
          </div>
        )}
      </div>
      <div className="form-group">
        <label>
          Instructions
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Enter cooking instructions..." />
        </label>
      </div>
      <div className="editor-actions">
        <button type="submit">Save Recipe</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}