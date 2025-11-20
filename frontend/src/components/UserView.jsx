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
    try {
      const full = await api.getRecipe(recipe.recipe_id)
      setSelected(full)
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
                  <input type="number" value={scale} min="0.25" step="0.25" onChange={(e) => setScale(Number(e.target.value))} />
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

            <section>
              <h3>Ingredients</h3>
              <ul>
                {scaledIngredients().map((ing, idx) => (
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
