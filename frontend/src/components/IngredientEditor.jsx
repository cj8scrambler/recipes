import React, { useState, useEffect } from 'react'
import { api } from '../api'

export default function IngredientEditor({ ingredient = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [defaultUnitId, setDefaultUnitId] = useState('')
  const [notes, setNotes] = useState('')
  const [units, setUnits] = useState([])

  useEffect(() => {
    loadUnits()
  }, [])

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name || '')
      setDefaultUnitId(ingredient.default_unit_id || '')
      setNotes(ingredient.notes || '')
    } else {
      setName('')
      setDefaultUnitId('')
      setNotes('')
    }
  }, [ingredient])

  async function loadUnits() {
    try {
      const us = await api.listUnits()
      setUnits(us || [])
    } catch (err) {
      console.error('Failed to load units:', err)
    }
  }

  function submit(e) {
    e.preventDefault()
    onSave({
      ...ingredient,
      name,
      default_unit_id: defaultUnitId ? parseInt(defaultUnitId) : null,
      notes
    })
  }

  // Group units by category for organized display
  const groupedUnits = units.reduce((acc, unit) => {
    if (!acc[unit.category]) {
      acc[unit.category] = []
    }
    acc[unit.category].push(unit)
    return acc
  }, {})

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
          Unit of Measurement (Default)
          <select value={defaultUnitId} onChange={(e) => setDefaultUnitId(e.target.value)}>
            <option value="">Select unit</option>
            {Object.keys(groupedUnits).map(category => (
              <optgroup key={category} label={category}>
                {groupedUnits[category].map(u => (
                  <option key={u.unit_id} value={u.unit_id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
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