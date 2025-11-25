import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { getDisplayUnit, toBaseUnit } from '../unitConversions'
import RecipeList from './RecipeList'

export default function UserView({ user }) {
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [scale, setScale] = useState(1)
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
    setScale(1)
    setRecipeCost(null)
    setRecipeWeight(null)
    try {
      const full = await api.getRecipe(recipe.recipe_id)
      setSelected(full)
      // Load recipe cost and weight
      loadRecipeCost(recipe.recipe_id, 1)
      loadRecipeWeight(recipe.recipe_id, 1)
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
              <div className="form-group">
                <label>
                  Servings
                  <input 
                    type="number" 
                    value={scale} 
                    min="0.25" 
                    step="0.25" 
                    onChange={(e) => {
                      const newScale = Number(e.target.value)
                      setScale(newScale)
                      if (selected?.recipe_id) {
                        loadRecipeCost(selected.recipe_id, newScale)
                        loadRecipeWeight(selected.recipe_id, newScale)
                      }
                    }} 
                  />
                </label>
              </div>
              {(versions.length > 0) && (
                <div className="form-group">
                  <label>
                    Version
                    <select onChange={(e) => {
                      const v = versions.find(x => String(x.id) === e.target.value)
                      setSelectedVersion(v || null)
                      if (v) switchVersion(v)
                    }}>
                      <option value="">Default</option>
                      {versions.map(v => <option value={v.id} key={v.id}>{v.name || v.id}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </div>

            {(recipeCost || recipeWeight) && (
              <div style={{ marginTop: '1em', padding: '0.75em', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                {recipeCost && (recipeCost.total_cost !== null ? (
                  <p style={{ margin: 0, fontSize: '1.1em' }}>
                    <strong>Estimated Cost:</strong> ${recipeCost.total_cost.toFixed(2)}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '1em', color: '#666' }}>
                    <strong>Cost information incomplete:</strong> Some ingredient prices are not available
                  </p>
                ))}
                {recipeWeight && (recipeWeight.total_weight !== null ? (
                  <p style={{ margin: '0.5em 0 0 0', fontSize: '1.1em' }}>
                    <strong>Total Weight:</strong> {recipeWeight.total_weight.toFixed(0)}g
                  </p>
                ) : (
                  <p style={{ margin: '0.5em 0 0 0', fontSize: '1em', color: '#666' }}>
                    <strong>Weight information incomplete:</strong> Some ingredient weights are not available
                  </p>
                ))}
              </div>
            )}

            <section>
              <h3>Ingredients</h3>
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
                
                return sortedGroups.map(([groupKey, group]) => (
                  <div key={groupKey} style={{ marginBottom: '1em' }}>
                    {groupKey !== 'ungrouped' && group.name && (
                      <h4 style={{ 
                        fontSize: '1em', 
                        fontWeight: 'bold', 
                        marginTop: '1em', 
                        marginBottom: '0.5em',
                        color: '#555'
                      }}>
                        {group.name}
                      </h4>
                    )}
                    <ul>
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
                ))
              })()}
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
