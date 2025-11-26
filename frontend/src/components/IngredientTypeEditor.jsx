import React, { useState, useEffect } from 'react'

export default function IngredientTypeEditor({ ingredientType = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (ingredientType) {
      setName(ingredientType.name || '')
      setDescription(ingredientType.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [ingredientType])

  function submit(e) {
    e.preventDefault()
    onSave({
      ...ingredientType,
      name,
      description
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{ingredientType?.type_id ? 'Edit Ingredient Type' : 'New Ingredient Type'}</h3>
      <div className="form-group">
        <label>
          Type Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Dairy" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Description (Optional)
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Milk, cheese, butter, and other dairy products" />
        </label>
      </div>
      <div className="editor-actions">
        <button type="submit">Save Type</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
