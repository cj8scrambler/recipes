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
      <h3>{ingredient ? 'Edit Ingredient' : 'New Ingredient'}</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Unit
        <input value={unit} onChange={(e) => setUnit(e.target.value)} />
      </label>
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="editor-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}