import React, { useState, useEffect } from 'react'

export default function IngredientGroupEditor({ group = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (group) {
      setName(group.name || '')
      setDescription(group.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [group])

  function submit(e) {
    e.preventDefault()
    onSave({
      ...group,
      name,
      description
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{group?.group_id ? 'Edit Ingredient Group' : 'New Ingredient Group'}</h3>
      <div className="form-group">
        <label>
          Group Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Spice Mix" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Description (Optional)
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Spices and seasonings to be mixed" />
        </label>
      </div>
      <div className="editor-actions">
        <button type="submit">Save Group</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
