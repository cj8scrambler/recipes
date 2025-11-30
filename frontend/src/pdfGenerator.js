import { jsPDF } from 'jspdf'
import { formatRecipeUnits } from './utils'

// Page dimensions in points (72 points per inch)
const PAGE_WIDTH_PT = 612 // 8.5"
const PAGE_HEIGHT_PT = 792 // 11"
const MARGIN = 30
const PADDING = 15

// Font sizes for cookbook style
const TITLE_FONT_SIZE = 18
const SUBTITLE_FONT_SIZE = 11
const SECTION_HEADER_SIZE = 11
const BODY_FONT_SIZE = 9
const SMALL_FONT_SIZE = 8
const LINE_HEIGHT = 12

// Colors
const ACCENT_COLOR = [80, 80, 80]

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
 * Draw a single cookbook-style recipe card section
 * This draws content rotated 90° so when cut and rotated, it reads normally
 * 
 * @param {jsPDF} doc - The PDF document
 * @param {Object} recipe - Recipe data
 * @param {Array} scaledIngredients - Scaled ingredients
 * @param {number} servings - Number of servings
 * @param {Object} recipeCost - Cost data
 * @param {Object} recipeWeight - Weight data
 * @param {number} originX - X origin for the section
 * @param {number} originY - Y origin for the section (bottom-left when rotated)
 * @param {number} sectionWidth - Width of the section (becomes height when rotated)
 * @param {number} sectionHeight - Height of the section (becomes width when rotated)
 * @param {string} sectionType - 'packing' or 'cooking'
 */
function drawRotatedSection(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight, originX, originY, sectionWidth, sectionHeight, sectionType) {
  // When rotated 90° CCW:
  // - X becomes vertical position (down from origin)
  // - Y becomes horizontal position (left from origin, so we use negative offsets)
  
  const availableWidth = sectionHeight - (2 * PADDING) // This is the "width" of content when rotated
  const availableHeight = sectionWidth - (2 * PADDING) // This is the "height" of content when rotated
  
  let xPos = originX + PADDING // Vertical position (moves down)
  const yBase = originY - PADDING // Horizontal starting point (moves left with negative)
  
  // === SECTION TYPE LABEL (at the very top) ===
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  const sectionLabel = sectionType === 'packing' ? '[ PACKING INSTRUCTIONS ]' : '[ COOKING INSTRUCTIONS ]'
  doc.text(sectionLabel, xPos, yBase, { angle: 90 })
  xPos += SMALL_FONT_SIZE + 8
  
  // === RECIPE TITLE ===
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('times', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(recipe.name, xPos, yBase, { angle: 90 })
  xPos += TITLE_FONT_SIZE + 4
  
  // === DECORATIVE LINE ===
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.5)
  doc.line(xPos, yBase, xPos, yBase - availableWidth)
  xPos += 6
  
  // === INFO ROW (Servings | Weight | Cost) ===
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  
  let infoItems = [`Servings: ${servings}`]
  if (recipeWeight && recipeWeight.total_weight !== null) {
    infoItems.push(`Weight: ${recipeWeight.total_weight.toFixed(0)}g`)
  }
  if (recipeCost && recipeCost.total_cost !== null) {
    infoItems.push(`Cost: $${recipeCost.total_cost.toFixed(2)}`)
  }
  doc.text(infoItems.join('   |   '), xPos, yBase, { angle: 90 })
  xPos += LINE_HEIGHT
  
  // === TAGS ROW ===
  if (recipe.tags && recipe.tags.length > 0) {
    doc.text('Tags: ' + recipe.tags.map(t => t.name).join(', '), xPos, yBase, { angle: 90 })
    xPos += LINE_HEIGHT
  }
  
  xPos += 8 // Extra space before content
  
  // === TWO COLUMN CONTENT ===
  const columnGap = 15
  const leftColWidth = availableWidth * 0.4
  const rightColWidth = availableWidth * 0.6 - columnGap
  const contentStartX = xPos
  
  // --- LEFT COLUMN: INGREDIENTS ---
  let leftX = contentStartX
  const leftY = yBase
  
  doc.setFontSize(SECTION_HEADER_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('INGREDIENTS', leftX, leftY, { angle: 90 })
  leftX += SECTION_HEADER_SIZE + 6
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setTextColor(0, 0, 0)
  
  const sortedGroups = getSortedGroups(scaledIngredients)
  
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey === 'ungrouped') {
      // Individual ingredients with quantities
      for (const ing of group.ingredients) {
        if (leftX > originX + sectionWidth - PADDING - 20) break // Don't overflow
        
        let text = ''
        if (ing.quantity && ing.displayUnit) {
          text = `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} ${ing.name}`
        } else {
          text = ing.name
        }
        if (ing.notes) {
          text += ` (${ing.notes})`
        }
        
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(text, leftColWidth - 15)
        for (const line of lines) {
          if (leftX > originX + sectionWidth - PADDING - 20) break
          doc.text('• ' + line, leftX, leftY, { angle: 90 })
          leftX += LINE_HEIGHT
        }
      }
    } else if (group.name) {
      // Ingredient group name (no quantity)
      if (leftX > originX + sectionWidth - PADDING - 20) break
      doc.setFont('helvetica', 'bold')
      doc.text('• ' + group.name, leftX, leftY, { angle: 90 })
      doc.setFont('helvetica', 'normal')
      leftX += LINE_HEIGHT
    }
  }
  
  // --- RIGHT COLUMN: INSTRUCTIONS ---
  let rightX = contentStartX
  const rightY = yBase - leftColWidth - columnGap
  
  doc.setFontSize(SECTION_HEADER_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('INSTRUCTIONS', rightX, rightY, { angle: 90 })
  rightX += SECTION_HEADER_SIZE + 6
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  const instructions = recipe.instructions || ''
  const instrLines = doc.splitTextToSize(instructions, rightColWidth - 10)
  
  for (const line of instrLines) {
    if (rightX > originX + sectionWidth - PADDING - 10) break
    doc.text(line, rightX, rightY, { angle: 90 })
    rightX += LINE_HEIGHT
  }
}

/**
 * Render a recipe with two sections on a single page (top and bottom halves)
 * Each section is rotated 90° so when the page is cut horizontally and each half
 * is rotated, it reads as a normal portrait card
 */
function renderRecipeTwoSection(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight) {
  doc.setPage(doc.getNumberOfPages())
  
  const halfHeight = PAGE_HEIGHT_PT / 2
  
  // Draw horizontal dividing line across middle of page
  doc.setDrawColor(120, 120, 120)
  doc.setLineWidth(1)
  doc.line(MARGIN, halfHeight, PAGE_WIDTH_PT - MARGIN, halfHeight)
  
  // === TOP HALF: PACKING SECTION ===
  // Content is rotated 90° CCW, origin at bottom-left of top section
  // When this half is cut and rotated 90° CW, it becomes a portrait card
  drawRotatedSection(
    doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight,
    MARGIN,                    // originX: left edge
    halfHeight - 5,            // originY: just above divider line  
    halfHeight - MARGIN - 5,   // sectionWidth (vertical space)
    PAGE_WIDTH_PT - (2 * MARGIN), // sectionHeight (horizontal space)
    'packing'
  )
  
  // === BOTTOM HALF: COOKING SECTION ===
  // Content is rotated 90° CCW, origin at bottom-left of bottom section
  drawRotatedSection(
    doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight,
    halfHeight + 5,            // originX: just below divider line
    PAGE_HEIGHT_PT - MARGIN,   // originY: near bottom of page
    halfHeight - MARGIN - 5,   // sectionWidth (vertical space)
    PAGE_WIDTH_PT - (2 * MARGIN), // sectionHeight (horizontal space)
    'cooking'
  )
}

/**
 * Render a recipe in standard full-page cookbook layout (for longer recipes)
 */
function renderRecipeStandard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight) {
  const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN)
  let y = MARGIN
  
  // === TITLE ===
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('times', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(recipe.name, PAGE_WIDTH_PT / 2, y + TITLE_FONT_SIZE, { align: 'center' })
  y += TITLE_FONT_SIZE + 12
  
  // === DECORATIVE LINE ===
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.5)
  doc.line(MARGIN + 50, y, PAGE_WIDTH_PT - MARGIN - 50, y)
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
  const leftColX = MARGIN
  const rightColX = MARGIN + colWidth + 20
  
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
    if (instrY < PAGE_HEIGHT_PT - MARGIN) {
      doc.text(line, rightColX, instrY)
      instrY += LINE_HEIGHT
    } else {
      // Need a new page
      doc.addPage()
      instrY = MARGIN
      doc.text(line, MARGIN, instrY)
      instrY += LINE_HEIGHT
    }
  }
}

/**
 * Estimate if content will fit in two-section layout
 */
function estimateFitsInTwoSections(recipe, scaledIngredients, doc) {
  const halfPageWidth = (PAGE_HEIGHT_PT / 2) - MARGIN
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
  const textWidth = PAGE_WIDTH_PT - (2 * MARGIN) - 20
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
