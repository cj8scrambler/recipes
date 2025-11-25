import React, { useState, useEffect } from 'react'
import { api } from '../api'

// Format number with minimum decimals (remove trailing zeros)
function formatWeightValue(value) {
  if (value === null || value === undefined) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  // Round to 2 decimal places, then remove trailing zeros
  return parseFloat(num.toFixed(2)).toString()
}

export default function IngredientEditor({ ingredient = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [defaultUnitId, setDefaultUnitId] = useState('')
  const [previousDefaultUnitId, setPreviousDefaultUnitId] = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [units, setUnits] = useState([])
  const [prices, setPrices] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    loadUnits()
  }, [])

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name || '')
      setDefaultUnitId(ingredient.default_unit_id || '')
      setPreviousDefaultUnitId(ingredient.default_unit_id || '')
      setWeight(formatWeightValue(ingredient.weight))
      setNotes(ingredient.notes || '')
      // Load prices if editing existing ingredient
      if (ingredient.ingredient_id) {
        loadPrices(ingredient.ingredient_id)
      } else {
        setPrices([])
      }
    } else {
      setName('')
      setDefaultUnitId('')
      setPreviousDefaultUnitId('')
      setWeight('')
      setNotes('')
      setPrices([])
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

  async function loadPrices(ingredientId) {
    try {
      const ps = await api.listIngredientPrices(ingredientId)
      // Format price values for display (remove trailing zeros)
      const formattedPrices = (ps || []).map(p => ({
        ...p,
        price: formatPriceForInput(p.price)
      }))
      setPrices(formattedPrices)
    } catch (err) {
      console.error('Failed to load prices:', err)
      setPrices([])
    }
  }

  function formatPriceForInput(price) {
    if (price === '' || price == null) return '';
    const num = parseFloat(price);
    if (isNaN(num)) return '';
    // Format to max 2 decimal places and remove trailing zeros
    return parseFloat(num.toFixed(2)).toString();
  }

  function addPrice() {
    setPrices([...prices, { unit_id: '', price: '', price_note: '', isNew: true }])
  }

  function removePrice(index) {
    setPrices(prices.filter((_, i) => i !== index))
  }

  function updatePrice(index, field, value) {
    const updated = [...prices]
    updated[index] = { ...updated[index], [field]: value }
    setPrices(updated)
  }

  async function savePrice(price, ingredientId) {
    try {
      if (price.price_id) {
        // Update existing price
        await api.updateIngredientPrice(ingredientId, price.price_id, {
          price: parseFloat(price.price),
          unit_id: parseInt(price.unit_id),
          price_note: price.price_note || null
        })
      } else {
        // Create new price
        await api.createIngredientPrice(ingredientId, {
          price: parseFloat(price.price),
          unit_id: parseInt(price.unit_id),
          price_note: price.price_note || null
        })
      }
    } catch (err) {
      throw new Error(`Failed to save price: ${err.message}`)
    }
  }

  async function deletePrice(price, ingredientId) {
    if (price.price_id) {
      try {
        await api.deleteIngredientPrice(ingredientId, price.price_id)
      } catch (err) {
        throw new Error(`Failed to delete price: ${err.message}`)
      }
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    
    try {
      // Determine the weight value to save
      let weightToSave = null
      
      if (defaultUnitId) {
        const unitForWeight = units.find(u => u.unit_id === parseInt(defaultUnitId))
        if (unitForWeight?.category === 'Weight') {
          // Weight-based unit: use the base_conversion_factor directly
          // base_conversion_factor is grams per unit (e.g., 453.592 for pounds)
          const factor = parseFloat(unitForWeight.base_conversion_factor)
          weightToSave = !isNaN(factor) ? parseFloat(factor.toFixed(2)) : null
        } else {
          // Non-weight-based unit: use the user-entered weight
          weightToSave = weight ? parseFloat(weight) : null
        }
      }
      // If no default unit, weight stays null
      
      // First save the ingredient
      const savedIngredient = await onSave({
        ...ingredient,
        name,
        default_unit_id: defaultUnitId ? parseInt(defaultUnitId) : null,
        weight: weightToSave,
        notes
      })
      
      // If we have an ingredient ID (either from existing or newly created), save prices
      const ingredientId = savedIngredient?.ingredient_id || ingredient?.ingredient_id
      if (ingredientId) {
        // Get original prices to detect deletions
        const originalPrices = ingredient?.prices || []
        const currentPriceIds = prices.filter(p => p.price_id).map(p => p.price_id)
        
        // Delete removed prices
        for (const origPrice of originalPrices) {
          if (!currentPriceIds.includes(origPrice.price_id)) {
            await deletePrice(origPrice, ingredientId)
          }
        }
        
        // Save new and updated prices
        for (const price of prices) {
          if (price.unit_id && price.price) {
            await savePrice(price, ingredientId)
          }
        }
      }
    } catch (err) {
      setError(err.message)
      console.error('Error saving ingredient:', err)
    }
  }

  // Group units by category for organized display
  const groupedUnits = units.reduce((acc, unit) => {
    if (!acc[unit.category]) {
      acc[unit.category] = []
    }
    acc[unit.category].push(unit)
    return acc
  }, {})

  // Get the selected default unit object
  const selectedUnit = defaultUnitId ? units.find(u => u.unit_id === parseInt(defaultUnitId)) : null
  
  // Determine if the selected unit is weight-based
  const isWeightBasedUnit = selectedUnit?.category === 'Weight'
  
  // Calculate the weight in grams for weight-based units
  // base_conversion_factor is how many grams per unit (e.g., 453.592 for pounds)
  // So "Weight per pound (in grams)" = 453.59
  const calculatedWeight = isWeightBasedUnit && selectedUnit?.base_conversion_factor 
    ? formatWeightValue(selectedUnit.base_conversion_factor)
    : null

  // Handle default unit change - clear weight if unit changes
  function handleDefaultUnitChange(newUnitId) {
    // If unit is changing, clear the weight
    if (newUnitId !== previousDefaultUnitId) {
      setWeight('')
    }
    setDefaultUnitId(newUnitId)
    setPreviousDefaultUnitId(newUnitId)
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h3>{ingredient?.ingredient_id ? 'Edit Ingredient' : 'New Ingredient'}</h3>
      {error && <div className="error">{error}</div>}
      
      <div className="form-group">
        <label>
          Ingredient Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., All-purpose flour" />
        </label>
      </div>
      <div className="form-group">
        <label>
          Unit of Measurement (Default)
          <select value={defaultUnitId} onChange={(e) => handleDefaultUnitChange(e.target.value)}>
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
      
      {/* Weight field - show message if no default unit, otherwise show appropriate field */}
      {!selectedUnit ? (
        <div className="form-group">
          <label style={{ color: '#666', fontStyle: 'italic' }}>
            Weight per unit (in grams)
          </label>
          <p style={{ fontSize: '0.9em', color: '#999', marginTop: '0.25em', fontStyle: 'italic' }}>
            Select a default unit above to configure weight.
          </p>
        </div>
      ) : (
        <div className="form-group">
          {isWeightBasedUnit ? (
            // Weight-based unit: show calculated read-only value
            <>
              <label>
                Weight per {selectedUnit.name.toLowerCase()} (in grams)
                <input 
                  type="number" 
                  value={calculatedWeight || ''}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </label>
              <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25em' }}>
                Automatically calculated based on the weight unit conversion.
              </p>
            </>
          ) : (
            // Non-weight-based unit: show editable input
            <>
              <label>
                Weight per {selectedUnit.name.toLowerCase()} (in grams)
                <input 
                  type="number" 
                  step="0.01"
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  placeholder={`e.g., grams per ${selectedUnit.abbreviation}`}
                />
              </label>
              <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0.25em' }}>
                Enter the weight in grams for one {selectedUnit.name.toLowerCase()}. Used to calculate total recipe weight.
              </p>
            </>
          )}
        </div>
      )}
      
      <div className="form-group">
        <label>Prices per Unit</label>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '0.5em' }}>
          Add prices for different units (e.g., price per cup, price per pound). 
          This allows recipe costs to be calculated regardless of which unit is used in the recipe.
        </p>
        {prices.map((price, idx) => {
          const selectedUnit = units.find(u => u.unit_id === parseInt(price.unit_id))
          return (
            <div key={idx} style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1.5fr 2fr auto', 
              gap: '0.5em', 
              marginBottom: '0.5em',
              alignItems: 'start'
            }}>
              <select 
                value={price.unit_id || ''} 
                onChange={(e) => updatePrice(idx, 'unit_id', e.target.value)}
                required
              >
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
              <input 
                type="number" 
                step="0.01"
                value={price.price || ''} 
                onChange={(e) => updatePrice(idx, 'price', e.target.value)}
                placeholder="Price"
                required
              />
              <input 
                type="text"
                value={price.price_note || ''} 
                onChange={(e) => updatePrice(idx, 'price_note', e.target.value)}
                placeholder="Note (e.g., Store/Date)"
              />
              <button 
                type="button" 
                className="small danger" 
                onClick={() => removePrice(idx)}
              >
                Remove
              </button>
            </div>
          )
        })}
        <button type="button" className="small secondary" onClick={addPrice}>
          + Add Price
        </button>
      </div>
      
      <div className="editor-actions">
        <button type="submit">Save Ingredient</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}