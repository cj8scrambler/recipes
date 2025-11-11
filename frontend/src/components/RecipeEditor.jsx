import React, { useState, useEffect } from 'react'

export default function RecipeEditor({ recipe = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '')
      setInstructions(recipe.instructions || '')
      setServings(recipe.base_servings || 1)
    } else {
      setName('')
      setInstructions('')
      setServings(1)
    }
  }, [recipe])

  function submit(e) {
    e.preventDefault()
    onSave({
      ...recipe,
      name,
      instructions,
      base_servings: Number(servings)
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{recipe?.recipe_id ? 'Edit Recipe' : 'New Recipe'}</h3>
      <div className="form-group">
        <label>
          Recipe Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Chocolate Chip Cookies" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Servings
          <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} min="1" placeholder="4" />
        </label>
      </div>
      {recipe?.ingredients && recipe.ingredients.length > 0 && (
        <div className="form-group">
          <label>Ingredients</label>
          <ul style={{marginTop: '0.5em', paddingLeft: '1.5em'}}>
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx}>
                {ing.quantity && ing.unit_abv ? `${ing.quantity} ${ing.unit_abv}` : ''} {ing.name}
                {ing.notes ? <span className="text-muted"> — {ing.notes}</span> : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
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