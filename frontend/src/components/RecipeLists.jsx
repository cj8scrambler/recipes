import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { formatRecipeUnits } from '../utils'
import { getDisplayUnit, toBaseUnit } from '../unitConversions'
import { generateRecipesPDF } from '../pdfGenerator'

export default function RecipeLists({ user }) {
  const [lists, setLists] = useState([])
  const [selectedList, setSelectedList] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [units, setUnits] = useState([])
  const [recipes, setRecipes] = useState([])
  
  // List totals state
  const [listTotals, setListTotals] = useState({ cost: null, weight: null, loading: false })
  
  // PDF generation state
  const [pdfLoading, setPdfLoading] = useState(false)
  // Per-item cost and weight state (keyed by item_id)
  const [itemCosts, setItemCosts] = useState({})
  const [itemWeights, setItemWeights] = useState({})
  
  // Form states
  const [newListName, setNewListName] = useState('')
  const [editingListId, setEditingListId] = useState(null)
  const [editingListName, setEditingListName] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  
  const preferredSystem = user?.settings?.unit === 'metric' ? 'Metric' : 'US Customary'

  useEffect(() => {
    loadLists()
    loadUnits()
    loadRecipes()
  }, [])

  async function loadLists() {
    setLoading(true)
    try {
      const data = await api.listRecipeLists()
      setLists(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  async function loadRecipes() {
    try {
      const rs = await api.listRecipes()
      setRecipes(rs || [])
    } catch (err) {
      console.error('Failed to load recipes:', err)
    }
  }

  // Calculate total cost and weight for all items in the selected list
  // Also stores per-item costs and weights for display
  async function loadListTotals(listItems) {
    if (!listItems || listItems.length === 0) {
      setListTotals({ cost: null, weight: null, loading: false })
      setItemCosts({})
      setItemWeights({})
      return
    }

    setListTotals(prev => ({ ...prev, loading: true }))
    
    try {
      // For each item, get the cost and weight using the variant_id if present, otherwise recipe_id
      // Scale is based on the item's servings divided by recipe's base_servings
      const costPromises = listItems.map(async (item) => {
        const recipeId = item.variant_id || item.recipe_id
        try {
          // Get the recipe to find base_servings
          const recipe = await api.getRecipe(recipeId)
          const scale = item.servings / (recipe.base_servings || 1)
          const costData = await api.getRecipeCost(recipeId, scale)
          return { itemId: item.item_id, cost: costData?.total_cost }
        } catch {
          return { itemId: item.item_id, cost: null }
        }
      })

      const weightPromises = listItems.map(async (item) => {
        const recipeId = item.variant_id || item.recipe_id
        try {
          const recipe = await api.getRecipe(recipeId)
          const scale = item.servings / (recipe.base_servings || 1)
          const weightData = await api.getRecipeWeight(recipeId, scale)
          return { itemId: item.item_id, weight: weightData?.total_weight }
        } catch {
          return { itemId: item.item_id, weight: null }
        }
      })

      const costResults = await Promise.all(costPromises)
      const weightResults = await Promise.all(weightPromises)

      // Store per-item costs and weights
      const newItemCosts = {}
      const newItemWeights = {}
      costResults.forEach(r => { newItemCosts[r.itemId] = r.cost })
      weightResults.forEach(r => { newItemWeights[r.itemId] = r.weight })
      setItemCosts(newItemCosts)
      setItemWeights(newItemWeights)

      // Sum up the totals, ignoring null values
      const costs = costResults.map(r => r.cost)
      const weights = weightResults.map(r => r.weight)
      const validCosts = costs.filter(c => c !== null && c !== undefined)
      const validWeights = weights.filter(w => w !== null && w !== undefined)

      const totalCost = validCosts.length === listItems.length 
        ? validCosts.reduce((sum, c) => sum + c, 0) 
        : null // Only show total if all items have costs

      const totalWeight = validWeights.length === listItems.length
        ? validWeights.reduce((sum, w) => sum + w, 0)
        : null // Only show total if all items have weights

      setListTotals({ 
        cost: totalCost, 
        weight: totalWeight, 
        loading: false,
        partialCost: validCosts.length > 0 && validCosts.length < listItems.length,
        partialWeight: validWeights.length > 0 && validWeights.length < listItems.length
      })
    } catch (err) {
      console.error('Failed to load list totals:', err)
      setListTotals({ cost: null, weight: null, loading: false })
      setItemCosts({})
      setItemWeights({})
    }
  }

  async function selectList(list) {
    setSelectedRecipe(null)
    setEditingItem(null)
    setListTotals({ cost: null, weight: null, loading: true })
    setItemCosts({})
    setItemWeights({})
    try {
      const full = await api.getRecipeList(list.list_id)
      setSelectedList(full)
      // Load totals after getting the list
      loadListTotals(full.items)
    } catch (err) {
      setError(err.message)
      setListTotals({ cost: null, weight: null, loading: false })
    }
  }

  async function createList(e) {
    e.preventDefault()
    if (!newListName.trim()) return
    
    setLoading(true)
    try {
      await api.createRecipeList({ name: newListName.trim() })
      setNewListName('')
      await loadLists()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateListName(e) {
    e.preventDefault()
    if (!editingListName.trim() || !editingListId) return
    
    setLoading(true)
    try {
      await api.updateRecipeList(editingListId, { name: editingListName.trim() })
      setEditingListId(null)
      setEditingListName('')
      await loadLists()
      if (selectedList?.list_id === editingListId) {
        const updated = await api.getRecipeList(editingListId)
        setSelectedList(updated)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteList(listId) {
    setLoading(true)
    try {
      await api.deleteRecipeList(listId)
      setShowDeleteConfirm(null)
      if (selectedList?.list_id === listId) {
        setSelectedList(null)
      }
      await loadLists()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateItem(itemId, updates) {
    setLoading(true)
    try {
      await api.updateRecipeListItem(selectedList.list_id, itemId, updates)
      const updated = await api.getRecipeList(selectedList.list_id)
      setSelectedList(updated)
      setEditingItem(null)
      // Recalculate totals after updating item
      loadListTotals(updated.items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function removeItem(itemId) {
    setLoading(true)
    try {
      await api.removeRecipeFromList(selectedList.list_id, itemId)
      const updated = await api.getRecipeList(selectedList.list_id)
      setSelectedList(updated)
      // Recalculate totals after removing item
      loadListTotals(updated.items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function viewRecipeFromList(item) {
    try {
      // Fetch the recipe (or variant if one is selected)
      const recipeId = item.variant_id || item.recipe_id
      const full = await api.getRecipe(recipeId)
      setSelectedRecipe({
        ...full,
        listServings: item.servings,
        listItem: item
      })
    } catch (err) {
      setError(err.message)
    }
  }

  function scaledIngredients(recipe) {
    if (!recipe || !units.length) return []
    const factor = (recipe.listServings || 1) / (recipe.base_servings || 1)
    
    return (recipe.ingredients || []).map(i => {
      const originalUnit = units.find(u => u.unit_id === i.unit_id)
      if (!originalUnit) {
        return { ...i, quantity: i.quantity ? (i.quantity * factor) : i.quantity }
      }
      
      const scaledQuantity = i.quantity * factor
      
      if (originalUnit.category === 'Item' || originalUnit.category === 'Temperature') {
        return {
          ...i,
          quantity: scaledQuantity,
          displayUnit: originalUnit
        }
      }
      
      const baseQuantity = toBaseUnit(scaledQuantity, originalUnit)
      const { quantity: displayQuantity, unit: displayUnit } = getDisplayUnit(
        baseQuantity,
        originalUnit.category,
        units,
        preferredSystem
      )
      
      return {
        ...i,
        quantity: displayQuantity,
        displayUnit: displayUnit || originalUnit
      }
    })
  }

  // Get variants for a recipe
  function getRecipeVariants(recipeId) {
    return recipes.filter(r => r.parent_recipe_id === recipeId)
  }

  // Generate PDF for all recipes in the selected list
  async function generateListPDF() {
    if (!selectedList || !selectedList.items || selectedList.items.length === 0) {
      return
    }

    setPdfLoading(true)
    setError(null)

    try {
      // Fetch full recipe data for each item in the list
      const recipeDataPromises = selectedList.items.map(async (item) => {
        const recipeId = item.variant_id || item.recipe_id
        const recipe = await api.getRecipe(recipeId)
        const servings = item.servings || 1
        const factor = servings / (recipe.base_servings || 1)

        // Fetch cost and weight data
        let recipeCost = null
        let recipeWeight = null
        try {
          recipeCost = await api.getRecipeCost(recipeId, factor)
        } catch (e) { /* ignore */ }
        try {
          recipeWeight = await api.getRecipeWeight(recipeId, factor)
        } catch (e) { /* ignore */ }

        // Scale ingredients for this recipe
        const scaledIngredients = (recipe.ingredients || []).map(ing => {
          const originalUnit = units.find(u => u.unit_id === ing.unit_id)
          if (!originalUnit) {
            return { ...ing, quantity: ing.quantity ? (ing.quantity * factor) : ing.quantity }
          }

          const scaledQuantity = ing.quantity * factor

          if (originalUnit.category === 'Item' || originalUnit.category === 'Temperature') {
            return {
              ...ing,
              quantity: scaledQuantity,
              displayUnit: originalUnit
            }
          }

          const baseQuantity = toBaseUnit(scaledQuantity, originalUnit)
          const { quantity: displayQuantity, unit: displayUnit } = getDisplayUnit(
            baseQuantity,
            originalUnit.category,
            units,
            preferredSystem
          )

          return {
            ...ing,
            quantity: displayQuantity,
            displayUnit: displayUnit || originalUnit
          }
        })

        return {
          recipe,
          scaledIngredients,
          servings,
          recipeCost,
          recipeWeight
        }
      })

      const recipeData = await Promise.all(recipeDataPromises)
      
      // Generate the PDF with all recipes
      const filename = `${selectedList.name.replace(/[^a-zA-Z0-9]/g, '_')}_recipes.pdf`
      generateRecipesPDF(recipeData, filename)
    } catch (err) {
      setError('Failed to generate PDF: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  // Helper function to get cost for an item
  function getItemCost(itemId) {
    const cost = itemCosts[itemId]
    return cost !== undefined && cost !== null ? cost : null
  }

  // Helper function to get weight for an item
  function getItemWeight(itemId) {
    const weight = itemWeights[itemId]
    return weight !== undefined && weight !== null ? weight : null
  }

  return (
    <div className="recipe-lists-container">
      <div className="lists-sidebar">
        <h2>My Recipe Lists</h2>
        
        <form onSubmit={createList} className="create-list-form">
          <input
            type="text"
            placeholder="New list name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="submit" disabled={loading || !newListName.trim()}>
            Create
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        
        <ul className="lists-list">
          {lists.length === 0 && (
            <li className="empty-state">
              <p className="text-muted">No recipe lists yet. Create one above!</p>
            </li>
          )}
          {lists.map(list => (
            <li 
              key={list.list_id}
              className={selectedList?.list_id === list.list_id ? 'active' : ''}
            >
              {editingListId === list.list_id ? (
                <form onSubmit={updateListName} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input
                    type="text"
                    value={editingListName}
                    onChange={(e) => setEditingListName(e.target.value)}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="small">Save</button>
                  <button 
                    type="button" 
                    className="small secondary"
                    onClick={() => { setEditingListId(null); setEditingListName('') }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button 
                    className="link-button"
                    onClick={() => selectList(list)}
                  >
                    {list.name}
                    <span className="item-count">({list.item_count})</span>
                  </button>
                  <div className="list-actions">
                    <button 
                      className="small secondary"
                      onClick={() => { setEditingListId(list.list_id); setEditingListName(list.name) }}
                      title="Rename list"
                    >
                      ✏️
                    </button>
                    <button 
                      className="small danger"
                      onClick={() => setShowDeleteConfirm(list.list_id)}
                      title="Delete list"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="lists-content">
        {!selectedList && !selectedRecipe && (
          <div className="empty-state">
            <p>Select a recipe list to view its recipes.</p>
          </div>
        )}

        {selectedList && !selectedRecipe && (
          <div className="list-detail">
            <div className="list-header">
              <div>
                <h2>{selectedList.name}</h2>
                <p className="text-muted">{selectedList.items?.length || 0} recipes</p>
              </div>
              {selectedList.items && selectedList.items.length > 0 && (
                <button
                  className="pdf-button"
                  onClick={generateListPDF}
                  disabled={pdfLoading}
                  title="Generate PDF with all recipes"
                >
                  {pdfLoading ? '📄 Generating...' : '📄 Download PDF'}
                </button>
              )}
            </div>
            
            {/* List Totals */}
            {selectedList.items && selectedList.items.length > 0 && (
              <div className="list-totals">
                {listTotals.loading ? (
                  <span className="text-muted">Calculating totals...</span>
                ) : (
                  <>
                    {listTotals.cost !== null ? (
                      <div className="total-item">
                        <span className="total-label">💰 Total Cost</span>
                        <span className="total-value">${listTotals.cost.toFixed(2)}</span>
                      </div>
                    ) : listTotals.partialCost ? (
                      <div className="total-item incomplete">
                        <span className="total-label">💰 Cost</span>
                        <span className="total-value text-muted">incomplete</span>
                      </div>
                    ) : null}
                    {listTotals.weight !== null ? (
                      <div className="total-item">
                        <span className="total-label">⚖️ Total Weight</span>
                        <span className="total-value">{listTotals.weight.toFixed(0)}g</span>
                      </div>
                    ) : listTotals.partialWeight ? (
                      <div className="total-item incomplete">
                        <span className="total-label">⚖️ Weight</span>
                        <span className="total-value text-muted">incomplete</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
            
            {(!selectedList.items || selectedList.items.length === 0) && (
              <div className="empty-state">
                <p>No recipes in this list yet.</p>
                <p className="text-muted">Browse recipes and add them to this list!</p>
              </div>
            )}
            
            <ul className="list-items">
              {selectedList.items?.map(item => (
                <li key={item.item_id}>
                  {editingItem?.item_id === item.item_id ? (
                    <div className="edit-item-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Servings</label>
                          <input
                            type="number"
                            min="1"
                            value={editingItem.servings}
                            onChange={(e) => setEditingItem({
                              ...editingItem,
                              servings: parseInt(e.target.value) || 1
                            })}
                          />
                        </div>
                        {getRecipeVariants(item.recipe_id).length > 0 && (
                          <div className="form-group">
                            <label>Variant</label>
                            <select
                              value={editingItem.variant_id || ''}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                variant_id: e.target.value ? parseInt(e.target.value) : null
                              })}
                            >
                              <option value="">Original</option>
                              {getRecipeVariants(item.recipe_id).map(v => (
                                <option key={v.recipe_id} value={v.recipe_id}>
                                  {v.variant_notes || v.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <input
                          type="text"
                          value={editingItem.notes || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            notes: e.target.value
                          })}
                          placeholder="Optional notes..."
                        />
                      </div>
                      <div className="button-row">
                        <button 
                          onClick={() => updateItem(item.item_id, {
                            servings: editingItem.servings,
                            variant_id: editingItem.variant_id,
                            notes: editingItem.notes
                          })}
                        >
                          Save
                        </button>
                        <button 
                          className="secondary"
                          onClick={() => setEditingItem(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="item-info" onClick={() => viewRecipeFromList(item)}>
                        <span className="recipe-name">{item.recipe_name}</span>
                        <span className="recipe-meta">
                          {item.servings} servings
                          {item.variant_name && ` • ${item.variant_name}`}
                          {getItemCost(item.item_id) !== null && (
                            ` • $${getItemCost(item.item_id).toFixed(2)}`
                          )}
                          {getItemWeight(item.item_id) !== null && (
                            ` • ${getItemWeight(item.item_id).toFixed(0)}g`
                          )}
                        </span>
                        {item.notes && <span className="recipe-notes">{item.notes}</span>}
                      </div>
                      <div className="item-actions">
                        <button 
                          className="small secondary"
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item) }}
                          title="Edit configuration"
                        >
                          ✏️
                        </button>
                        <button 
                          className="small danger"
                          onClick={(e) => { e.stopPropagation(); removeItem(item.item_id) }}
                          title="Remove from list"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedRecipe && (
          <article className="recipe-from-list">
            <button 
              className="back-button secondary"
              onClick={() => setSelectedRecipe(null)}
            >
              ← Back to list
            </button>
            
            <h2>{selectedRecipe.name}</h2>
            
            <div className="meta" style={{ flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ marginBottom: 0 }}>Servings (from list)</label>
                <span style={{ fontWeight: 600 }}>{selectedRecipe.listServings}</span>
              </div>
              {getItemCost(selectedRecipe.listItem?.item_id) !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ marginBottom: 0 }}>Estimated Cost</label>
                  <span style={{ fontWeight: 600, fontSize: '1.1em' }}>${getItemCost(selectedRecipe.listItem?.item_id).toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)' }}>
                  <label style={{ marginBottom: 0 }}>Cost</label>
                  <span style={{ fontSize: '0.9em' }}>incomplete</span>
                </div>
              )}
              {getItemWeight(selectedRecipe.listItem?.item_id) !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ marginBottom: 0 }}>Total Weight</label>
                  <span style={{ fontWeight: 600, fontSize: '1.1em' }}>{getItemWeight(selectedRecipe.listItem?.item_id).toFixed(0)}g</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)' }}>
                  <label style={{ marginBottom: 0 }}>Weight</label>
                  <span style={{ fontSize: '0.9em' }}>incomplete</span>
                </div>
              )}
              {selectedRecipe.listItem?.notes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexBasis: '100%', marginTop: '0.5rem' }}>
                  <label style={{ marginBottom: 0 }}>Notes</label>
                  <span>{selectedRecipe.listItem.notes}</span>
                </div>
              )}
              {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ marginBottom: 0 }}>Tags</label>
                  {selectedRecipe.tags.map(tag => (
                    <span 
                      key={tag.tag_id}
                      style={{
                        padding: '0.2em 0.6em',
                        borderRadius: '1em',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '0.85em',
                        fontWeight: 500
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <section>
              <h3>Ingredients</h3>
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1.25rem', 
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                {(() => {
                  const grouped = scaledIngredients(selectedRecipe).reduce((acc, ing) => {
                    const groupKey = ing.group_id || 'ungrouped'
                    if (!acc[groupKey]) {
                      acc[groupKey] = {
                        name: ing.group_name,
                        ingredients: []
                      }
                    }
                    acc[groupKey].ingredients.push(ing)
                    return acc
                  }, {})
                  
                  const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
                    if (keyA === 'ungrouped') return -1
                    if (keyB === 'ungrouped') return 1
                    return 0
                  })
                  
                  return sortedGroups.map(([groupKey, group], index) => {
                    const isLastGroup = index === sortedGroups.length - 1
                    return (
                      <div key={groupKey} style={{ marginBottom: isLastGroup ? 0 : '1em' }}>
                        {groupKey !== 'ungrouped' && group.name && (
                          <h4 style={{ 
                            fontSize: '1em', 
                            fontWeight: 600, 
                            marginTop: '0.5em', 
                            marginBottom: '0.5em',
                            color: 'var(--gray-700)'
                          }}>
                            {group.name}
                          </h4>
                        )}
                        <ul style={{ paddingLeft: groupKey !== 'ungrouped' ? '1.5rem' : 0 }}>
                          {group.ingredients.map((ing, idx) => (
                            <li key={idx}>
                              <span>
                                {ing.quantity && ing.displayUnit ? (
                                  <strong>{formatRecipeUnits(ing.quantity, 2)} {ing.displayUnit.abbreviation}</strong>
                                ) : ''} {ing.name}
                                {ing.notes ? <span className="text-muted"> — {ing.notes}</span> : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })
                })()}
              </div>
            </section>

            <section>
              <h3>Instructions</h3>
              <div className="instructions">{selectedRecipe.instructions}</div>
            </section>
          </article>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Recipe List?</h3>
            <p>Are you sure you want to delete this recipe list? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="danger"
                onClick={() => deleteList(showDeleteConfirm)}
              >
                Delete
              </button>
              <button 
                className="secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
