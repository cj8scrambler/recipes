import { jsPDF } from 'jspdf'
import { formatRecipeUnits } from './utils'

// Page dimensions in points (72 points per inch)
const PAGE_WIDTH_PT = 612 // 8.5"
const PAGE_HEIGHT_PT = 792 // 11"
const MARGIN_PT = 36
const INNER_MARGIN = 12

// Font sizes for cookbook style
const TITLE_FONT_SIZE = 22
const SECTION_HEADER_SIZE = 12
const BODY_FONT_SIZE = 10
const SMALL_FONT_SIZE = 9
const LINE_HEIGHT = 14

// Colors
const ACCENT_COLOR = [70, 70, 70] // Dark gray for headers
const LIGHT_BG = [245, 245, 245] // Light gray background

/**
 * Group ingredients by group_id
 */
function groupIngredients(ingredients) {
  return ingredients.reduce((acc, ing) => {
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
}

/**
 * Get sorted ingredient groups
 */
function getSortedGroups(scaledIngredients) {
  const grouped = groupIngredients(scaledIngredients)
  return Object.entries(grouped).sort(([keyA], [keyB]) => {
    if (keyA === 'ungrouped') return -1
    if (keyB === 'ungrouped') return 1
    return 0
  })
}

/**
 * Draw a cookbook-style recipe card (rotated 90° for half-page layout)
 * Based on cookbook template style with title, info boxes, two-column layout
 */
function drawRotatedRecipeCard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight, startX, startY, cardWidth, cardHeight, isPackingSection) {
  // All text is rotated 90° CCW
  // startX is our "y" position (increases as we go down the card when rotated)
  // startY is our "x" position (the baseline for rotated text)
  
  let currentX = startX + INNER_MARGIN
  const textY = startY // Y coordinate for all rotated text
  const maxTextWidth = cardHeight - (2 * INNER_MARGIN) // Available width for text when rotated
  
  // === TITLE ===
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('times', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(recipe.name, currentX, textY, { angle: 90 })
  currentX += TITLE_FONT_SIZE + 8
  
  // === DECORATIVE LINE ===
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.5)
  doc.line(currentX, textY, currentX, textY - maxTextWidth)
  currentX += 8
  
  // === INFO BOXES (Weight/Cost and Servings/Tags) ===
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  // Box 1: Weight & Cost
  let infoText1 = ''
  if (recipeWeight && recipeWeight.total_weight !== null) {
    infoText1 += `Weight: ${recipeWeight.total_weight.toFixed(0)}g`
  }
  if (recipeCost && recipeCost.total_cost !== null) {
    if (infoText1) infoText1 += '  |  '
    infoText1 += `Cost: $${recipeCost.total_cost.toFixed(2)}`
  }
  if (infoText1) {
    doc.text(infoText1, currentX, textY, { angle: 90 })
    currentX += LINE_HEIGHT
  }
  
  // Box 2: Servings & Tags
  let infoText2 = `Servings: ${servings}`
  if (recipe.tags && recipe.tags.length > 0) {
    infoText2 += '  |  ' + recipe.tags.map(t => t.name).join(', ')
  }
  doc.text(infoText2, currentX, textY, { angle: 90 })
  currentX += LINE_HEIGHT + 10
  
  // === TWO COLUMN LAYOUT: INGREDIENTS | INSTRUCTIONS ===
  const columnStartX = currentX
  const columnWidth = (cardWidth - columnStartX - INNER_MARGIN) / 2
  
  // --- INGREDIENTS COLUMN ---
  let ingX = columnStartX
  
  // Section header
  doc.setFontSize(SECTION_HEADER_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('INGREDIENTS', ingX, textY, { angle: 90 })
  ingX += SECTION_HEADER_SIZE + 6
  
  // Ingredients list
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  const sortedGroups = getSortedGroups(scaledIngredients)
  
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey === 'ungrouped') {
      // List each ungrouped ingredient with quantity
      for (const ing of group.ingredients) {
        let text = ''
        if (ing.quantity && ing.displayUnit) {
          text = `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} ${ing.name}`
        } else {
          text = ing.name
        }
        if (ing.notes) {
          text += ` (${ing.notes})`
        }
        
        // Wrap if needed
        const lines = doc.splitTextToSize(text, maxTextWidth - 10)
        for (const line of lines) {
          if (ingX < columnStartX + columnWidth - 5) {
            doc.text('• ' + line, ingX, textY, { angle: 90 })
            ingX += LINE_HEIGHT
          }
        }
      }
    } else if (group.name) {
      // For ingredient groups, treat them like individual items (no quantity)
      if (ingX < columnStartX + columnWidth - 5) {
        doc.setFont('helvetica', 'bold')
        doc.text('• ' + group.name, ingX, textY, { angle: 90 })
        doc.setFont('helvetica', 'normal')
        ingX += LINE_HEIGHT
      }
    }
  }
  
  // --- INSTRUCTIONS COLUMN ---
  let instrX = columnStartX + columnWidth + 5
  
  // Section header
  doc.setFontSize(SECTION_HEADER_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_COLOR)
  doc.text(isPackingSection ? 'PACKING NOTES' : 'INSTRUCTIONS', instrX, textY, { angle: 90 })
  instrX += SECTION_HEADER_SIZE + 6
  
  // Instructions text
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  const instructions = recipe.instructions || ''
  const instrLines = doc.splitTextToSize(instructions, maxTextWidth - 10)
  
  for (const line of instrLines) {
    if (instrX < startX + cardWidth - INNER_MARGIN) {
      doc.text(line, instrX, textY, { angle: 90 })
      instrX += LINE_HEIGHT
    }
  }
}

/**
 * Render a recipe with two sections on a single page
 * Top half and bottom half, each rotated 90° for cutting
 */
function renderRecipeTwoSection(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight) {
  doc.setPage(doc.getNumberOfPages())
  
  const halfHeight = PAGE_HEIGHT_PT / 2
  const cardWidth = halfHeight - MARGIN_PT
  const cardHeight = PAGE_WIDTH_PT - (2 * MARGIN_PT)
  
  // Draw horizontal dividing line across middle
  doc.setDrawColor(100, 100, 100)
  doc.setLineWidth(1)
  doc.line(MARGIN_PT, halfHeight, PAGE_WIDTH_PT - MARGIN_PT, halfHeight)
  
  // === TOP HALF (Packing Section) ===
  // Rotated 90° CCW, text baseline near the divider
  const topStartX = MARGIN_PT
  const topStartY = halfHeight - INNER_MARGIN
  drawRotatedRecipeCard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight, 
    topStartX, topStartY, cardWidth, cardHeight, true)
  
  // === BOTTOM HALF (Cooking Section) ===
  // Rotated 90° CCW, text baseline near bottom edge
  const bottomStartX = halfHeight + MARGIN_PT / 2
  const bottomStartY = PAGE_HEIGHT_PT - INNER_MARGIN
  drawRotatedRecipeCard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight,
    bottomStartX, bottomStartY, cardWidth, cardHeight, false)
}

/**
 * Render a recipe in standard full-page cookbook layout (for longer recipes)
 */
function renderRecipeStandard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight) {
  const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT)
  let y = MARGIN_PT
  
  // === TITLE ===
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('times', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(recipe.name, PAGE_WIDTH_PT / 2, y + TITLE_FONT_SIZE, { align: 'center' })
  y += TITLE_FONT_SIZE + 12
  
  // === DECORATIVE LINE ===
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.5)
  doc.line(MARGIN_PT + 50, y, PAGE_WIDTH_PT - MARGIN_PT - 50, y)
  y += 15
  
  // === INFO BOXES ===
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  // Weight & Cost
  let infoLine1 = ''
  if (recipeWeight && recipeWeight.total_weight !== null) {
    infoLine1 += `Weight: ${recipeWeight.total_weight.toFixed(0)}g`
  }
  if (recipeCost && recipeCost.total_cost !== null) {
    if (infoLine1) infoLine1 += '    |    '
    infoLine1 += `Cost: $${recipeCost.total_cost.toFixed(2)}`
  }
  if (infoLine1) {
    doc.text(infoLine1, PAGE_WIDTH_PT / 2, y, { align: 'center' })
    y += LINE_HEIGHT
  }
  
  // Servings & Tags
  let infoLine2 = `Servings: ${servings}`
  if (recipe.tags && recipe.tags.length > 0) {
    infoLine2 += '    |    Tags: ' + recipe.tags.map(t => t.name).join(', ')
  }
  doc.text(infoLine2, PAGE_WIDTH_PT / 2, y, { align: 'center' })
  y += 25
  
  // === TWO COLUMN LAYOUT ===
  const colWidth = (contentWidth - 20) / 2
  const leftColX = MARGIN_PT
  const rightColX = MARGIN_PT + colWidth + 20
  
  // --- INGREDIENTS (Left Column) ---
  let ingY = y
  
  doc.setFontSize(SECTION_HEADER_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('INGREDIENTS', leftColX, ingY)
  ingY += SECTION_HEADER_SIZE + 8
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  const sortedGroups = getSortedGroups(scaledIngredients)
  
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey === 'ungrouped') {
      for (const ing of group.ingredients) {
        let text = ''
        if (ing.quantity && ing.displayUnit) {
          text = `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} ${ing.name}`
        } else {
          text = ing.name
        }
        if (ing.notes) {
          text += ` (${ing.notes})`
        }
        
        const lines = doc.splitTextToSize('• ' + text, colWidth - 10)
        for (const line of lines) {
          doc.text(line, leftColX, ingY)
          ingY += LINE_HEIGHT
        }
      }
    } else if (group.name) {
      // Ingredient group as single item
      doc.setFont('helvetica', 'bold')
      doc.text('• ' + group.name, leftColX, ingY)
      doc.setFont('helvetica', 'normal')
      ingY += LINE_HEIGHT
    }
  }
  
  // --- INSTRUCTIONS (Right Column) ---
  let instrY = y
  
  doc.setFontSize(SECTION_HEADER_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('INSTRUCTIONS', rightColX, instrY)
  instrY += SECTION_HEADER_SIZE + 8
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  const instructions = recipe.instructions || ''
  const instrLines = doc.splitTextToSize(instructions, colWidth - 10)
  
  for (const line of instrLines) {
    if (instrY < PAGE_HEIGHT_PT - MARGIN_PT) {
      doc.text(line, rightColX, instrY)
      instrY += LINE_HEIGHT
    } else {
      // Need a new page
      doc.addPage()
      instrY = MARGIN_PT
      doc.text(line, MARGIN_PT, instrY)
      instrY += LINE_HEIGHT
    }
  }
}

/**
 * Estimate if content will fit in two-section layout
 */
function estimateFitsInTwoSections(recipe, scaledIngredients, doc) {
  const halfPageWidth = (PAGE_HEIGHT_PT / 2) - MARGIN_PT
  const availableLines = Math.floor(halfPageWidth / LINE_HEIGHT) - 8 // Reserve space for headers
  
  // Count ingredient items (ungrouped ingredients + group names)
  let ingredientItems = 0
  const sortedGroups = getSortedGroups(scaledIngredients)
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey === 'ungrouped') {
      ingredientItems += group.ingredients.length
    } else if (group.name) {
      ingredientItems += 1 // Group counts as one item
    }
  }
  
  // Count instruction lines
  doc.setFontSize(BODY_FONT_SIZE)
  const textWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT) - 20
  const instructionLines = doc.splitTextToSize(recipe.instructions || '', textWidth).length
  
  // Check if both fit in half-page columns
  const halfColumnLines = availableLines / 2
  return ingredientItems < halfColumnLines && instructionLines < availableLines
}

/**
 * Generate a PDF containing one or more recipes
 * @param {Array} recipes - Array of recipe objects with their scaled ingredients
 *   Each item should have: { recipe, scaledIngredients, servings, recipeCost, recipeWeight }
 * @param {string} filename - Output filename
 */
export function generateRecipesPDF(recipes, filename = 'recipes.pdf') {
  if (!recipes || recipes.length === 0) {
    throw new Error('No recipes provided')
  }
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  })
  
  for (let i = 0; i < recipes.length; i++) {
    const { recipe, scaledIngredients, servings, recipeCost, recipeWeight } = recipes[i]
    
    if (i > 0) {
      doc.addPage()
    }
    
    const fitsInTwoSections = estimateFitsInTwoSections(recipe, scaledIngredients, doc)
    
    if (fitsInTwoSections) {
      renderRecipeTwoSection(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight)
    } else {
      renderRecipeStandard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight)
    }
  }
  
  doc.save(filename)
}

/**
 * Generate a PDF for a single recipe
 */
export function generateSingleRecipePDF(recipe, scaledIngredients, servings, filename, recipeCost, recipeWeight) {
  const recipeName = recipe.name.replace(/[^a-zA-Z0-9]/g, '_')
  generateRecipesPDF(
    [{ recipe, scaledIngredients, servings, recipeCost, recipeWeight }],
    filename || `${recipeName}.pdf`
  )
}
