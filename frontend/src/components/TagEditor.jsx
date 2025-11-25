import React, { useState, useEffect } from 'react'

export default function TagEditor({ tag = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (tag) {
      setName(tag.name || '')
      setDescription(tag.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [tag])

  function submit(e) {
    e.preventDefault()
    onSave({
      ...tag,
      name,
      description
    })
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{tag?.tag_id ? 'Edit Tag' : 'New Tag'}</h3>
      <div className="form-group">
        <label>
          Tag Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Vegetarian" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Description (Optional)
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Contains no meat products" />
        </label>
      </div>
      <div className="editor-actions">
        <button type="submit">Save Tag</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
