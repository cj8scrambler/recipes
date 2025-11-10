import React, { useState, useEffect } from 'react'

export default function IngredientEditor({ ingredient = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name || '')
      setUnit(ingredient.unit || '')
      setNotes(ingredient.notes || '')
    } else {
      setName('')
      setUnit('')
      setNotes('')
    }
  }, [ingredient])

  function submit(e) {
    e.preventDefault()
    onSave({
      ...ingredient,
      name,
      unit,
      notes
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{ingredient?.ingredient_id ? 'Edit Ingredient' : 'New Ingredient'}</h3>
      <div className="form-group">
        <label>
          Ingredient Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., All-purpose flour" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Unit of Measurement
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., cups, grams, tsp" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Notes (Optional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional information" />
        </label>
      </div>
      <div className="editor-actions">
        <button type="submit">Save Ingredient</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}