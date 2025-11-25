import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { getDisplayUnit, toBaseUnit } from '../unitConversions'
import RecipeList from './RecipeList'

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
  
  // Use user's setting for preferred unit system, fallback to 'US Customary'
  const preferredSystem = user?.settings?.unit === 'metric' ? 'Metric' : 'US Customary'

  useEffect(() => {
    loadRecipes()
    loadUnits()
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

  async function selectRecipe(recipe) {
    setSelected(null)
    setVersions([])
    setSelectedVersion(null)
    setScale(DEFAULT_SERVINGS)
    setScaleInput(DEFAULT_SERVINGS_STR)
    setRecipeCost(null)
    setRecipeWeight(null)
    try {
      const full = await api.getRecipe(recipe.recipe_id)
      setSelected(full)
      // Load recipe cost and weight
      loadRecipeCost(recipe.recipe_id, DEFAULT_SERVINGS)
      loadRecipeWeight(recipe.recipe_id, DEFAULT_SERVINGS)
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
        loadRecipeCost(selected.recipe_id, numValue)
        loadRecipeWeight(selected.recipe_id, numValue)
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
          loadRecipeCost(selected.recipe_id, newValue)
          loadRecipeWeight(selected.recipe_id, newValue)
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
        loadRecipeCost(selected.recipe_id, newValue)
        loadRecipeWeight(selected.recipe_id, newValue)
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
      loadRecipeCost(selected.recipe_id, rounded)
      loadRecipeWeight(selected.recipe_id, rounded)
    }
  }

  return (
    <div className="user-view">
      <div className="sidebar">
        <RecipeList recipes={recipes} onSelect={selectRecipe} />
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
            <h2>{selected.name}</h2>
            <div className="meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ marginBottom: 0 }}>Servings</label>
                <input 
                  type="number" 
                  value={scaleInput} 
                  min="0.1" 
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
