import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { toBaseUnit } from '../unitConversions'

/**
 * Format quantity for display in input field - removes trailing zeros
 */
function formatQuantityForInput(quantity) {
  if (quantity === '' || quantity == null) return '';
  const num = parseFloat(quantity);
  if (isNaN(num)) return '';
  // Format to max 1 decimal place and remove trailing zeros
  return parseFloat(num.toFixed(1)).toString();
}

export default function RecipeEditor({ recipe = null, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState([])
  const [units, setUnits] = useState([])
  const [allIngredients, setAllIngredients] = useState([])
  const [ingredientGroups, setIngredientGroups] = useState([])
  const [recipeCost, setRecipeCost] = useState(null)

  useEffect(() => {
    loadUnits()
    loadIngredients()
    loadIngredientGroups()
  }, [])

  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '')
      setInstructions(recipe.instructions || '')
      setServings(recipe.base_servings || 1)
      // Ingredients from backend already have ingredient_id, quantity (in base units), unit_id, notes, group_id
      setIngredients((recipe.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredient_id || '',
        quantity: formatQuantityForInput(ing.quantity),
        unit_id: ing.unit_id || '',
        notes: ing.notes || '',
        group_id: ing.group_id || ''
      })))
      // Load cost if editing existing recipe
      if (recipe.recipe_id) {
        loadRecipeCost(recipe.recipe_id)
      }
    } else {
      setName('')
      setInstructions('')
      setServings(1)
      setIngredients([])
      setRecipeCost(null)
    }
  }, [recipe])

  async function loadRecipeCost(recipeId) {
    try {
      const cost = await api.getRecipeCost(recipeId, 1.0)
      setRecipeCost(cost)
    } catch (err) {
      console.error('Failed to load recipe cost:', err)
      setRecipeCost(null)
    }
  }

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

  async function loadIngredientGroups() {
    try {
      const groups = await api.adminListIngredientGroups()
      setIngredientGroups(groups || [])
    } catch (err) {
      console.error('Failed to load ingredient groups:', err)
    }
  }

  function addIngredient() {
    setIngredients([
      ...ingredients,
      { ingredient_id: '', quantity: '', unit_id: '', notes: '', group_id: '' }
    ])
  }

  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function updateIngredient(index, field, value) {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    
    // If ingredient_id is being changed, auto-select its default unit
    if (field === 'ingredient_id' && value) {
      const selectedIngredient = allIngredients.find(ing => ing.ingredient_id === parseInt(value))
      if (selectedIngredient && selectedIngredient.default_unit_id) {
        updated[index].unit_id = selectedIngredient.default_unit_id
      }
    }
    
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
          notes: ing.notes || null,
          group_id: ing.group_id ? parseInt(ing.group_id) : null
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
              gridTemplateColumns: '2fr 1fr 2fr 2fr 1.5fr auto', 
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
                step="0.1"
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
                {/* Group units by category for easier navigation */}
                {selectedUnit && (
                  <optgroup label={`${selectedUnit.category} (Current)`}>
                    {units
                      .filter(u => u.category === selectedUnit.category)
                      .map(u => (
                        <option key={u.unit_id} value={u.unit_id}>
                          {u.name} ({u.abbreviation})
                        </option>
                      ))}
                  </optgroup>
                )}
                {/* Show other categories for switching */}
                {['Volume', 'Dry Volume', 'Liquid Volume', 'Weight', 'Item', 'Temperature']
                  .filter(cat => !selectedUnit || cat !== selectedUnit.category)
                  .map(category => {
                    const categoryUnits = units.filter(u => u.category === category)
                    if (categoryUnits.length === 0) return null
                    return (
                      <optgroup key={category} label={category}>
                        {categoryUnits.map(u => (
                          <option key={u.unit_id} value={u.unit_id}>
                            {u.name} ({u.abbreviation})
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
              </select>
              <input 
                type="text"
                value={ing.notes || ''} 
                onChange={(e) => updateIngredient(idx, 'notes', e.target.value)}
                placeholder="Notes (optional)"
              />
              <select 
                value={ing.group_id || ''} 
                onChange={(e) => updateIngredient(idx, 'group_id', e.target.value)}
              >
                <option value="">No group</option>
                {ingredientGroups.map(g => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.name}
                  </option>
                ))}
              </select>
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
        
        {recipeCost && recipe?.recipe_id && (
          <div style={{ 
            marginTop: '1em', 
            padding: '0.75em', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px' 
          }}>
            <h4 style={{ margin: '0 0 0.5em 0' }}>Cost Information</h4>
            {recipeCost.ingredients_cost && recipeCost.ingredients_cost.length > 0 && (
              <div style={{ marginBottom: '0.5em' }}>
                {recipeCost.ingredients_cost.map((ingCost, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '0.9em',
                    marginBottom: '0.25em'
                  }}>
                    <span>{ingCost.name}:</span>
                    <span>
                      {ingCost.has_price_data ? (
                        `$${ingCost.cost?.toFixed(2) || '0.00'}`
                      ) : (
                        <span style={{ color: '#d9534f' }}>Price not available</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {recipeCost.total_cost !== null ? (
              <div style={{ 
                borderTop: '1px solid #ddd', 
                paddingTop: '0.5em',
                fontWeight: 'bold'
              }}>
                Total: ${recipeCost.total_cost.toFixed(2)}
              </div>
            ) : (
              <div style={{ 
                borderTop: '1px solid #ddd', 
                paddingTop: '0.5em',
                color: '#d9534f'
              }}>
                Total cost cannot be calculated - some prices missing
              </div>
            )}
          </div>
        )}
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