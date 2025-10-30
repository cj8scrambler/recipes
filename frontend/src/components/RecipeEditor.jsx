import React, { useState, useEffect } from 'react'

export default function RecipeEditor({ recipe = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '')
      setInstructions(recipe.instructions || '')
      setServings(recipe.servings || 1)
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
      servings: Number(servings)
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{recipe ? 'Edit Recipe' : 'New Recipe'}</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Servings
        <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} min="1" />
      </label>
      <label>
        Instructions
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </label>
      <div className="editor-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}