import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import RecipeList from './RecipeList'

export default function UserView() {
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [scale, setScale] = useState(1)
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRecipes()
  }, [])

  async function loadRecipes() {
    try {
      const rs = await api.listRecipes()
      setRecipes(rs || [])
    } catch (err) {
      setError(err.message)
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
    if (!selected) return []
    const factor = scale / (selected.base_servings || 1)
    return (selected.ingredients || []).map(i => ({
      ...i,
      quantity: i.quantity ? (i.quantity * factor) : i.quantity
    }))
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
                      {ing.quantity ? <strong>{formatRecipeUnits(ing.quantity, 2)} {ing.unit_abv || ''}</strong> : ''} {ing.name}
                      {ing.note ? <span className="text-muted"> — {ing.note}</span> : ''}
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
