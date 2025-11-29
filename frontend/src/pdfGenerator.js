import { jsPDF } from 'jspdf'
import { formatRecipeUnits } from './utils'

// Page dimensions in points (72 points per inch)
const PAGE_WIDTH_PT = 612 // 8.5"
const PAGE_HEIGHT_PT = 792 // 11"
const MARGIN_PT = 36 // 0.5" margin

// Font sizes
const TITLE_FONT_SIZE = 18
const SECTION_FONT_SIZE = 14
const BODY_FONT_SIZE = 11
const LINE_HEIGHT_FACTOR = 1.4

/**
 * Estimate the height needed for a recipe's content
 * @param {Object} recipe - Recipe object
 * @param {Array} scaledIngredients - Pre-scaled ingredients
 * @param {number} servings - Number of servings
 * @param {jsPDF} doc - PDF document for text measurement
 * @returns {Object} - Heights for ingredients and instructions sections
 */
function estimateContentHeight(recipe, scaledIngredients, servings, doc) {
  const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT)
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  
  // Calculate ingredients height
  let ingredientsHeight = SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 10 // Section header + spacing
  const grouped = groupIngredients(scaledIngredients)
  
  for (const [groupKey, group] of Object.entries(grouped)) {
    if (groupKey !== 'ungrouped' && group.name) {
      ingredientsHeight += lineHeight + 5 // Group header
    }
    // Each ingredient line
    ingredientsHeight += group.ingredients.length * lineHeight
    ingredientsHeight += 10 // Group spacing
  }
  
  // Calculate instructions height
  doc.setFontSize(BODY_FONT_SIZE)
  const instructions = recipe.instructions || ''
  const instructionsLines = doc.splitTextToSize(instructions, contentWidth)
  const instructionsHeight = SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 10 + // Section header
    (instructionsLines.length * lineHeight)
  
  // Calculate header height (title + servings)
  const headerHeight = TITLE_FONT_SIZE * LINE_HEIGHT_FACTOR + 30
  
  return {
    headerHeight,
    ingredientsHeight,
    instructionsHeight,
    totalHeight: headerHeight + ingredientsHeight + instructionsHeight
  }
}

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
 * Draw a recipe section (ingredients or instructions) at the specified position
 * @param {jsPDF} doc - PDF document
 * @param {string} title - Section title
 * @param {string|Array} content - Content to render
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Available width
 * @param {boolean} isIngredients - Whether this is the ingredients section
 * @param {Array} scaledIngredients - Pre-scaled ingredients (for ingredients section)
 * @returns {number} - Final Y position after rendering
 */
function drawSection(doc, title, content, x, y, width, isIngredients = false, scaledIngredients = []) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  
  // Section header
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, y)
  y += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 5
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  if (isIngredients) {
    const grouped = groupIngredients(scaledIngredients)
    const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
      if (keyA === 'ungrouped') return -1
      if (keyB === 'ungrouped') return 1
      return 0
    })
    
    for (const [groupKey, group] of sortedGroups) {
      if (groupKey !== 'ungrouped' && group.name) {
        doc.setFont('helvetica', 'bold')
        doc.text(group.name, x, y)
        doc.setFont('helvetica', 'normal')
        y += lineHeight
      }
      
      for (const ing of group.ingredients) {
        const indent = groupKey !== 'ungrouped' ? 10 : 0
        let text = '• '
        if (ing.quantity && ing.displayUnit) {
          text += `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} `
        }
        text += ing.name
        if (ing.notes) {
          text += ` — ${ing.notes}`
        }
        
        // Wrap text if needed
        const lines = doc.splitTextToSize(text, width - indent)
        for (const line of lines) {
          doc.text(line, x + indent, y)
          y += lineHeight
        }
      }
      y += 5 // Spacing between groups
    }
  } else {
    // Instructions - wrap text
    const lines = doc.splitTextToSize(content, width)
    for (const line of lines) {
      doc.text(line, x, y)
      y += lineHeight
    }
  }
  
  return y
}

/**
 * Draw a rotated section (for the compact layout)
 * Text is rotated 90° counter-clockwise
 */
function drawRotatedSection(doc, title, content, x, y, width, height, isIngredients = false, scaledIngredients = []) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  
  // For rotated text, we draw from the starting position
  // Text flows downward (which appears as left-to-right when rotated)
  let textY = y + SECTION_FONT_SIZE
  
  // Section header
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, textY, { angle: 90 })
  textY += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 5
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  if (isIngredients) {
    const grouped = groupIngredients(scaledIngredients)
    const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
      if (keyA === 'ungrouped') return -1
      if (keyB === 'ungrouped') return 1
      return 0
    })
    
    for (const [groupKey, group] of sortedGroups) {
      if (groupKey !== 'ungrouped' && group.name) {
        doc.setFont('helvetica', 'bold')
        doc.text(group.name, x, textY, { angle: 90 })
        doc.setFont('helvetica', 'normal')
        textY += lineHeight
      }
      
      for (const ing of group.ingredients) {
        let text = '• '
        if (ing.quantity && ing.displayUnit) {
          text += `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} `
        }
        text += ing.name
        if (ing.notes) {
          text += ` — ${ing.notes}`
        }
        
        // Wrap text if needed (height becomes max text width when rotated)
        const lines = doc.splitTextToSize(text, height - 40)
        for (const line of lines) {
          doc.text(line, x, textY, { angle: 90 })
          textY += lineHeight
        }
      }
      textY += 3 // Spacing between groups
    }
  } else {
    // Instructions - wrap text
    const lines = doc.splitTextToSize(content, height - 40)
    for (const line of lines) {
      doc.text(line, x, textY, { angle: 90 })
      textY += lineHeight
    }
  }
  
  return textY
}

/**
 * Render a recipe on a single page with rotated sections
 * Each section (ingredients, instructions) is rotated 90° so it appears portrait-oriented
 * Both sections fit side-by-side on a single portrait 8.5x11 page
 */
function renderRecipeRotated(doc, recipe, scaledIngredients, servings) {
  doc.setPage(doc.getNumberOfPages())
  
  // For rotated layout, the page is divided into two halves
  // Each half has content rotated 90° counter-clockwise
  // Left half: Ingredients (rotated)
  // Right half: Instructions (rotated)
  
  const halfWidth = PAGE_WIDTH_PT / 2
  const contentHeight = PAGE_HEIGHT_PT - (2 * MARGIN_PT)
  
  // Draw centered title at the top (not rotated)
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  let headerY = MARGIN_PT + TITLE_FONT_SIZE
  doc.text(recipe.name, PAGE_WIDTH_PT / 2, headerY, { align: 'center' })
  headerY += TITLE_FONT_SIZE + 5
  
  // Servings info (not rotated)
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.text(`Servings: ${servings}`, PAGE_WIDTH_PT / 2, headerY, { align: 'center' })
  headerY += 15
  
  // Draw a dividing line down the middle
  doc.setDrawColor(200, 200, 200)
  doc.line(halfWidth, headerY, halfWidth, PAGE_HEIGHT_PT - MARGIN_PT)
  
  // Left section - Ingredients (rotated 90° CCW)
  // For 90° CCW rotation, we start from bottom-left of the section area and text goes upward
  const leftSectionX = MARGIN_PT + BODY_FONT_SIZE + 5
  const leftSectionY = headerY + 10
  const leftSectionHeight = PAGE_HEIGHT_PT - headerY - MARGIN_PT - 10
  const leftSectionWidth = halfWidth - MARGIN_PT - 15
  
  drawRotatedSection(doc, 'Ingredients', '', leftSectionX, leftSectionY, leftSectionWidth, leftSectionHeight, true, scaledIngredients)
  
  // Right section - Instructions (rotated 90° CCW)
  const rightSectionX = halfWidth + MARGIN_PT + BODY_FONT_SIZE + 5
  drawRotatedSection(doc, 'Instructions', recipe.instructions || '', rightSectionX, leftSectionY, leftSectionWidth, leftSectionHeight, false)
}

/**
 * Render a recipe across one or more pages in standard portrait layout
 */
function renderRecipeStandard(doc, recipe, scaledIngredients, servings) {
  const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT)
  let y = MARGIN_PT
  
  // Title
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(recipe.name, PAGE_WIDTH_PT / 2, y + TITLE_FONT_SIZE, { align: 'center' })
  y += TITLE_FONT_SIZE * LINE_HEIGHT_FACTOR + 10
  
  // Servings info
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.text(`Servings: ${servings}`, PAGE_WIDTH_PT / 2, y, { align: 'center' })
  y += 25
  
  // Ingredients section
  y = drawSection(doc, 'Ingredients', '', MARGIN_PT, y, contentWidth, true, scaledIngredients)
  y += 15
  
  // Check if we need a new page for instructions
  const remainingHeight = PAGE_HEIGHT_PT - y - MARGIN_PT
  doc.setFontSize(BODY_FONT_SIZE)
  const instructionsLines = doc.splitTextToSize(recipe.instructions || '', contentWidth)
  const instructionsHeight = SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 10 + 
    (instructionsLines.length * BODY_FONT_SIZE * LINE_HEIGHT_FACTOR)
  
  if (instructionsHeight > remainingHeight && remainingHeight < 100) {
    doc.addPage()
    y = MARGIN_PT
  }
  
  // Instructions section
  drawSection(doc, 'Instructions', recipe.instructions || '', MARGIN_PT, y, contentWidth, false)
}

/**
 * Generate a PDF containing one or more recipes
 * @param {Array} recipes - Array of recipe objects with their scaled ingredients
 *   Each item should have: { recipe, scaledIngredients, servings }
 * @param {string} filename - Output filename
 */
export function generateRecipesPDF(recipes, filename = 'recipes.pdf') {
  if (!recipes || recipes.length === 0) {
    throw new Error('No recipes provided')
  }
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter' // 8.5" x 11"
  })
  
  for (let i = 0; i < recipes.length; i++) {
    const { recipe, scaledIngredients, servings } = recipes[i]
    
    if (i > 0) {
      doc.addPage()
    }
    
    // Estimate content height to determine layout
    const heights = estimateContentHeight(recipe, scaledIngredients, servings, doc)
    const availableHeight = PAGE_HEIGHT_PT - (2 * MARGIN_PT)
    
    // If content fits in about half the page height, use rotated side-by-side layout
    // Otherwise use standard vertical layout
    const fitsOnHalfPage = heights.totalHeight < (availableHeight * 0.55)
    
    if (fitsOnHalfPage) {
      renderRecipeRotated(doc, recipe, scaledIngredients, servings)
    } else {
      renderRecipeStandard(doc, recipe, scaledIngredients, servings)
    }
  }
  
  doc.save(filename)
}

/**
 * Generate a PDF for a single recipe
 */
export function generateSingleRecipePDF(recipe, scaledIngredients, servings, filename) {
  const recipeName = recipe.name.replace(/[^a-zA-Z0-9]/g, '_')
  generateRecipesPDF(
    [{ recipe, scaledIngredients, servings }],
    filename || `${recipeName}.pdf`
  )
}
