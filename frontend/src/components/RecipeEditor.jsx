import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { toBaseUnit } from '../unitConversions'

export default function RecipeEditor({ recipe = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState([])
  const [units, setUnits] = useState([])
  const [allIngredients, setAllIngredients] = useState([])

  useEffect(() => {
    loadUnits()
    loadIngredients()
  }, [])

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '')
      setInstructions(recipe.instructions || '')
      setServings(recipe.base_servings || 1)
      // Ingredients from backend already have ingredient_id, quantity (in base units), unit_id, notes
      setIngredients((recipe.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredient_id || '',
        quantity: ing.quantity || '',
        unit_id: ing.unit_id || '',
        notes: ing.notes || ''
      })))
    } else {
      setName('')
      setInstructions('')
      setServings(1)
      setIngredients([])
    }
  }, [recipe])

  async function loadUnits() {
    try {
      const us = await api.listUnits()
      setUnits(us || [])
    } catch (err) {
      console.error('Failed to load units:', err)
    }
  }

  async function loadIngredients() {
    try {
      const ings = await api.listIngredients()
      setAllIngredients(ings || [])
    } catch (err) {
      console.error('Failed to load ingredients:', err)
    }
  }

  function addIngredient() {
    setIngredients([
      ...ingredients,
      { ingredient_id: '', quantity: '', unit_id: '', notes: '' }
    ])
  }

  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function updateIngredient(index, field, value) {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  function submit(e) {
    e.preventDefault()
    
    // Convert all ingredient quantities to base units for storage
    const processedIngredients = ingredients
      .filter(ing => ing.ingredient_id && ing.quantity && ing.unit_id)
      .map(ing => {
        const unit = units.find(u => u.unit_id === parseInt(ing.unit_id))
        const baseQuantity = unit && unit.base_conversion_factor 
          ? toBaseUnit(parseFloat(ing.quantity), unit)
          : parseFloat(ing.quantity)
        
        // Find the base unit for this category
        const baseUnit = unit && unit.category !== 'Item' && unit.category !== 'Temperature'
          ? units.find(u => 
              u.category === unit.category && 
              u.base_conversion_factor === 1.0
            )
          : unit
        
        return {
          ingredient_id: parseInt(ing.ingredient_id),
          quantity: baseUnit ? baseQuantity : parseFloat(ing.quantity),
          unit_id: baseUnit ? baseUnit.unit_id : parseInt(ing.unit_id),
          notes: ing.notes || null
        }
      })
    
    onSave({
      ...recipe,
      name,
      instructions,
      base_servings: Number(servings),
      ingredients: processedIngredients
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
      <div className="form-group">
        <label>Ingredients</label>
        {ingredients.map((ing, idx) => {
          const selectedIngredient = allIngredients.find(i => i.ingredient_id === parseInt(ing.ingredient_id))
          const selectedUnit = units.find(u => u.unit_id === parseInt(ing.unit_id))
          
          return (
            <div key={idx} style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr 2fr 2fr auto', 
              gap: '0.5em', 
              marginBottom: '0.5em',
              alignItems: 'start'
            }}>
              <select 
                value={ing.ingredient_id} 
                onChange={(e) => updateIngredient(idx, 'ingredient_id', e.target.value)}
                required
              >
                <option value="">Select ingredient</option>
                {allIngredients.map(i => (
                  <option key={i.ingredient_id} value={i.ingredient_id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <input 
                type="number" 
                step="0.01"
                value={ing.quantity} 
                onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                placeholder="Qty"
                required
              />
              <select 
                value={ing.unit_id} 
                onChange={(e) => updateIngredient(idx, 'unit_id', e.target.value)}
                required
              >
                <option value="">Select unit</option>
                {units
                  .filter(u => {
                    // If no unit selected yet, show all units
                    if (!selectedUnit) return true
                    // If unit is selected, only show units of the same category
                    return u.category === selectedUnit.category
                  })
                  .map(u => (
                    <option key={u.unit_id} value={u.unit_id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
              </select>
              <input 
                type="text"
                value={ing.notes || ''} 
                onChange={(e) => updateIngredient(idx, 'notes', e.target.value)}
                placeholder="Notes (optional)"
              />
              <button 
                type="button" 
                className="small danger" 
                onClick={() => removeIngredient(idx)}
              >
                Remove
              </button>
            </div>
          )
        })}
        <button type="button" className="small secondary" onClick={addIngredient}>
          + Add Ingredient
        </button>
      </div>
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