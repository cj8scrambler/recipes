import { jsPDF } from 'jspdf'
import { formatRecipeUnits } from './utils'
import { VOLUME_CATEGORIES } from './unitConversions'

// Page dimensions in points (72 points per inch)
const PAGE_WIDTH_PT = 612 // 8.5"
const PAGE_HEIGHT_PT = 792 // 11"
const MARGIN_PT = 20 // margin for rotated sections
const SMALL_MARGIN_PT = 10
const LEFT_PADDING = 45 // Extra padding from left edge of each half-page section
const SECTION_SPACING = 15 // Extra vertical space before major sections like Ingredients/Instructions

// Font sizes - scaled up more for better readability
const TITLE_FONT_SIZE = 20
const SECTION_FONT_SIZE = 14
const BODY_FONT_SIZE = 12
const SMALL_FONT_SIZE = 11
const LINE_HEIGHT_FACTOR = 1.35

// Layout thresholds
const TWO_SECTION_LAYOUT_THRESHOLD = 0.45 // Use two-section layout if content fits
const MIN_REMAINING_HEIGHT = 100

// Unit conversion constants
const ML_PER_FL_OZ = 29.5735 // milliliters per fluid ounce

/**
 * Get fluid ounce equivalent text for a volume quantity
 * @param {number} quantity - The quantity in the display unit
 * @param {object} displayUnit - The unit object being displayed
 * @returns {string} - Empty string if already in fl oz, otherwise " (X fl oz)" format
 */
function getFluidOunceEquivalent(quantity, displayUnit) {
  if (!displayUnit || !displayUnit.category || !VOLUME_CATEGORIES.includes(displayUnit.category)) {
    return ''
  }
  
  // If already in fluid ounces, no conversion needed
  if (displayUnit.abbreviation === 'fl oz') {
    return ''
  }
  
  // Convert to base unit (mL) then to fluid ounces
  if (!displayUnit.base_conversion_factor) {
    return ''
  }
  const baseQuantity = quantity * displayUnit.base_conversion_factor
  const flOzQuantity = baseQuantity / ML_PER_FL_OZ
  
  return ` (${formatRecipeUnits(flOzQuantity, 2)} fl oz)`
}

/**
 * Format ingredient text for cooking section
 * Water shows quantity since it's not in the package; other ingredients show name only
 * @param {object} ing - Ingredient object with name, quantity, displayUnit, notes
 * @returns {string} - Formatted ingredient text
 */
function formatIngredientForCooking(ing) {
  if (!ing || !ing.name) {
    return ''
  }
  
  const isWater = ing.name.toLowerCase() === 'water'
  
  let text = ''
  if (isWater && ing.quantity && ing.displayUnit) {
    // Show quantity for water
    text = `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation}`
    text += getFluidOunceEquivalent(ing.quantity, ing.displayUnit)
    text += ' ' + ing.name
  } else {
    text = ing.name
  }
  
  if (ing.notes) {
    text += ` (${ing.notes})`
  }
  
  return text
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
 * Draw recipe header info for packing section (with "Packing Instructions" header)
 */
function drawRotatedPackingHeader(doc, recipe, servings, x, y, maxWidth, recipeCost, recipeWeight) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  let currentX = x
  
  // "Packing Instructions" header
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text('PACKING INSTRUCTIONS', currentX, y, { angle: 90 })
  currentX += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 6
  
  // Recipe name
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(recipe.name, currentX, y, { angle: 90 })
  currentX += TITLE_FONT_SIZE * LINE_HEIGHT_FACTOR + 4
  
  // Meta info line: Servings, Cost, Weight
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  let metaText = `Servings: ${servings}`
  if (recipeCost && recipeCost.total_cost !== null) {
    metaText += `  •  Cost: $${recipeCost.total_cost.toFixed(2)}`
  }
  if (recipeWeight && recipeWeight.total_weight !== null) {
    metaText += `  •  Weight: ${recipeWeight.total_weight.toFixed(0)}g`
  }
  doc.text(metaText, currentX, y, { angle: 90 })
  currentX += lineHeight
  
  // Tags
  if (recipe.tags && recipe.tags.length > 0) {
    const tagsText = 'Tags: ' + recipe.tags.map(t => t.name).join(', ')
    const tagLines = doc.splitTextToSize(tagsText, maxWidth - 20)
    for (const line of tagLines) {
      doc.text(line, currentX, y, { angle: 90 })
      currentX += lineHeight
    }
  }
  
  currentX += 6 // Extra spacing after header
  return currentX
}

/**
 * Draw recipe header info (name, servings, weight, tags) - for cooking section
 * Note: Cost is intentionally excluded from cooking instructions
 */
function drawRotatedHeader(doc, recipe, servings, x, y, maxWidth, recipeCost, recipeWeight) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  let currentX = x
  
  // Recipe name
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(recipe.name, currentX, y, { angle: 90 })
  currentX += TITLE_FONT_SIZE * LINE_HEIGHT_FACTOR + 4
  
  // Meta info line: Servings, Weight (no cost)
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  let metaText = `Servings: ${servings}`
  if (recipeWeight && recipeWeight.total_weight !== null) {
    metaText += `  •  Weight: ${recipeWeight.total_weight.toFixed(0)}g`
  }
  doc.text(metaText, currentX, y, { angle: 90 })
  currentX += lineHeight
  
  // Tags
  if (recipe.tags && recipe.tags.length > 0) {
    const tagsText = 'Tags: ' + recipe.tags.map(t => t.name).join(', ')
    const tagLines = doc.splitTextToSize(tagsText, maxWidth - 20)
    for (const line of tagLines) {
      doc.text(line, currentX, y, { angle: 90 })
      currentX += lineHeight
    }
  }
  
  currentX += 6 // Extra spacing after header
  return currentX
}

/**
 * Draw ingredient groups with full ingredients (for packing section)
 * Only ingredient group names are bold, all ingredients are NOT bold
 * Ingredients under a group are indented
 */
function drawRotatedIngredients(doc, scaledIngredients, x, y, maxWidth) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  let currentX = x + SECTION_SPACING // Add extra space before Ingredients section
  
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text('Ingredients', currentX, y, { angle: 90 })
  currentX += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 8
  
  const sortedGroups = getSortedGroups(scaledIngredients)
  
  doc.setFontSize(BODY_FONT_SIZE)
  for (const [groupKey, group] of sortedGroups) {
    // Group name - BOLD
    if (groupKey !== 'ungrouped' && group.name) {
      doc.setFont('helvetica', 'bold')
      doc.text(group.name + ':', currentX, y, { angle: 90 })
      currentX += lineHeight
    }
    
    // Individual ingredients - NOT bold, indented if part of a group
    doc.setFont('helvetica', 'normal')
    const indent = (groupKey !== 'ungrouped') ? 15 : 0
    for (const ing of group.ingredients) {
      let text = '• '
      if (ing.quantity && ing.displayUnit) {
        text += `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} `
      }
      text += ing.name
      if (ing.notes) {
        text += ` (${ing.notes})`
      }
      
      const lines = doc.splitTextToSize(text, maxWidth - 20 - indent)
      for (const line of lines) {
        doc.text(line, currentX, y - indent, { angle: 90 })
        currentX += lineHeight
      }
    }
    currentX += 2 // Small spacing between groups
  }
  
  return currentX
}

/**
 * Draw ingredients summary for the cooking section
 * Lists all ingredients (ungrouped and groups) without quantities
 * Exception: 'water' shows quantity since it's not in the recipe package
 * Ingredient groups are NOT bold - treated same as individual ingredients
 */
function drawRotatedIngredientsSummary(doc, scaledIngredients, x, y, maxWidth) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  let currentX = x + SECTION_SPACING // Add extra space before Ingredients section
  
  // Section header - just "Ingredients"
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text('Ingredients', currentX, y, { angle: 90 })
  currentX += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 10
  
  const sortedGroups = getSortedGroups(scaledIngredients)
  
  // Use consistent font size with rest of document
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey === 'ungrouped') {
      // List each ungrouped ingredient by name only (no quantities - already pre-measured)
      // Exception: water shows quantity since it's not in the package
      for (const ing of group.ingredients) {
        const text = formatIngredientForCooking(ing)
        doc.text('- ' + text, currentX, y, { angle: 90 })
        currentX += lineHeight
      }
    } else if (group.name) {
      // List the group name - NOT bold, treated same as individual ingredients
      doc.text('- ' + group.name, currentX, y, { angle: 90 })
      currentX += lineHeight
    }
  }
  
  currentX += 6 // Extra spacing after ingredients summary
  return currentX
}

/**
 * Draw instructions section
 */
function drawRotatedInstructions(doc, instructions, x, y, maxWidth) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  let currentX = x + SECTION_SPACING // Add extra space before Instructions section
  
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text('Instructions', currentX, y, { angle: 90 })
  currentX += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 8
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  const lines = doc.splitTextToSize(instructions || '', maxWidth - 20)
  for (const line of lines) {
    doc.text(line, currentX, y, { angle: 90 })
    currentX += lineHeight
  }
  
  return currentX
}

/**
 * Render a recipe with two sections on a single page
 * Top half: Ingredients section (rotated 90°)
 * Bottom half: Instructions section (rotated 90°)
 * Horizontal divider line across middle
 * When cut in half, each section is portrait-oriented
 */
function renderRecipeTwoSection(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight) {
  doc.setPage(doc.getNumberOfPages())
  
  const halfHeight = PAGE_HEIGHT_PT / 2
  const sectionWidth = halfHeight - (2 * MARGIN_PT) // Width available for rotated text
  
  // Draw horizontal dividing line across middle
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(1)
  doc.line(MARGIN_PT, halfHeight, PAGE_WIDTH_PT - MARGIN_PT, halfHeight)
  
  // === TOP HALF: PACKING/INGREDIENTS SECTION ===
  // Text is rotated 90° CCW, so it reads correctly when the top half is rotated
  // Start from left edge with extra padding, text goes upward (toward top of page when rotated)
  let topX = MARGIN_PT + LEFT_PADDING
  const topY = halfHeight - SMALL_MARGIN_PT - LEFT_PADDING // Offset from divider to add left margin when rotated
  
  topX = drawRotatedPackingHeader(doc, recipe, servings, topX, topY, sectionWidth, recipeCost, recipeWeight)
  topX = drawRotatedIngredients(doc, scaledIngredients, topX, topY, sectionWidth)
  
  // === BOTTOM HALF: COOKING/INSTRUCTIONS SECTION ===
  // Same rotation, positioned in bottom half with extra padding
  let bottomX = MARGIN_PT + LEFT_PADDING
  const bottomY = PAGE_HEIGHT_PT - SMALL_MARGIN_PT - LEFT_PADDING // Offset from edge to add left margin when rotated
  
  bottomX = drawRotatedHeader(doc, recipe, servings, bottomX, bottomY, sectionWidth, recipeCost, recipeWeight)
  bottomX = drawRotatedIngredientsSummary(doc, scaledIngredients, bottomX, bottomY, sectionWidth)
  bottomX = drawRotatedInstructions(doc, recipe.instructions, bottomX, bottomY, sectionWidth)
}

/**
 * Draw standard page header with recipe info
 * Cost is shown for packing instructions but not for cooking instructions
 */
function drawStandardHeader(doc, recipe, servings, recipeCost, recipeWeight, sectionTitle) {
  const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT)
  let y = MARGIN_PT + LEFT_PADDING
  const isCookingSection = sectionTitle === 'COOKING INSTRUCTIONS'
  
  // Section title (PACKING INSTRUCTIONS or COOKING INSTRUCTIONS)
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(sectionTitle, PAGE_WIDTH_PT / 2, y, { align: 'center' })
  y += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 8
  
  // Recipe Title
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(recipe.name, PAGE_WIDTH_PT / 2, y, { align: 'center' })
  y += TITLE_FONT_SIZE * LINE_HEIGHT_FACTOR + 8
  
  // Meta info - exclude cost for cooking section
  doc.setFontSize(SMALL_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  let metaText = `Servings: ${servings}`
  if (!isCookingSection && recipeCost && recipeCost.total_cost !== null) {
    metaText += `  •  Cost: $${recipeCost.total_cost.toFixed(2)}`
  }
  if (recipeWeight && recipeWeight.total_weight !== null) {
    metaText += `  •  Weight: ${recipeWeight.total_weight.toFixed(0)}g`
  }
  doc.text(metaText, PAGE_WIDTH_PT / 2, y, { align: 'center' })
  y += 12
  
  // Tags
  if (recipe.tags && recipe.tags.length > 0) {
    const tagsText = 'Tags: ' + recipe.tags.map(t => t.name).join(', ')
    doc.text(tagsText, PAGE_WIDTH_PT / 2, y, { align: 'center' })
    y += 15
  } else {
    y += 8
  }
  
  return y
}

/**
 * Draw standard (non-rotated) section for full-page layout
 */
function drawStandardSection(doc, title, content, x, y, width, isIngredients = false, scaledIngredients = [], showQuantities = true) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  
  // Add extra space before section
  y += SECTION_SPACING
  
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, y)
  y += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 8
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  if (isIngredients) {
    const sortedGroups = getSortedGroups(scaledIngredients)
    
    for (const [groupKey, group] of sortedGroups) {
      // Group name - BOLD (only for packing list with showQuantities=true)
      if (groupKey !== 'ungrouped' && group.name) {
        if (showQuantities) {
          doc.setFont('helvetica', 'bold')
        }
        doc.text(group.name + ':', x, y)
        doc.setFont('helvetica', 'normal')
        y += lineHeight
      }
      
      // Individual ingredients
      const indent = (groupKey !== 'ungrouped' && showQuantities) ? 15 : 0
      for (const ing of group.ingredients) {
        let text = '• '
        if (showQuantities && ing.quantity && ing.displayUnit) {
          text += `${formatRecipeUnits(ing.quantity, 2)} ${ing.displayUnit.abbreviation} `
        }
        text += ing.name
        if (ing.notes) {
          text += ` (${ing.notes})`
        }
        
        const lines = doc.splitTextToSize(text, width - indent)
        for (const line of lines) {
          doc.text(line, x + indent, y)
          y += lineHeight
          
          // Check if we need a new page
          if (y > PAGE_HEIGHT_PT - MARGIN_PT - 20) {
            doc.addPage()
            y = MARGIN_PT + LEFT_PADDING
          }
        }
      }
      y += 5
    }
  } else {
    const lines = doc.splitTextToSize(content, width)
    for (const line of lines) {
      doc.text(line, x, y)
      y += lineHeight
      
      // Check if we need a new page
      if (y > PAGE_HEIGHT_PT - MARGIN_PT - 20) {
        doc.addPage()
        y = MARGIN_PT + LEFT_PADDING
      }
    }
  }
  
  return y
}

/**
 * Draw ingredient summary for cooking section (names only, no quantities)
 * Exception: 'water' shows quantity since it's not in the recipe package
 */
function drawStandardIngredientsSummary(doc, scaledIngredients, x, y, width) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  
  // Add extra space before section
  y += SECTION_SPACING
  
  doc.setFontSize(SECTION_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.text('Ingredients', x, y)
  y += SECTION_FONT_SIZE * LINE_HEIGHT_FACTOR + 8
  
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setFont('helvetica', 'normal')
  
  const sortedGroups = getSortedGroups(scaledIngredients)
  
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey === 'ungrouped') {
      // List each ungrouped ingredient by name only
      // Exception: water shows quantity since it's not in the package
      for (const ing of group.ingredients) {
        const text = formatIngredientForCooking(ing)
        doc.text('- ' + text, x, y)
        y += lineHeight
      }
    } else if (group.name) {
      // List the group name only
      doc.text('- ' + group.name, x, y)
      y += lineHeight
    }
  }
  
  return y
}

/**
 * Render a recipe in standard full-page layout (for longer recipes)
 * Creates TWO pages: one for packing instructions, one for cooking instructions
 */
function renderRecipeStandard(doc, recipe, scaledIngredients, servings, recipeCost, recipeWeight) {
  const contentWidth = PAGE_WIDTH_PT - (2 * MARGIN_PT) - LEFT_PADDING
  const leftMargin = MARGIN_PT + LEFT_PADDING
  
  // === PAGE 1: PACKING INSTRUCTIONS ===
  let y = drawStandardHeader(doc, recipe, servings, recipeCost, recipeWeight, 'PACKING INSTRUCTIONS')
  
  // Full ingredients with quantities and groups
  y = drawStandardSection(doc, 'Ingredients', '', leftMargin, y, contentWidth, true, scaledIngredients, true)
  
  // === PAGE 2: COOKING INSTRUCTIONS ===
  doc.addPage()
  y = drawStandardHeader(doc, recipe, servings, recipeCost, recipeWeight, 'COOKING INSTRUCTIONS')
  
  // Ingredient summary (names only, no quantities)
  y = drawStandardIngredientsSummary(doc, scaledIngredients, leftMargin, y, contentWidth)
  y += SECTION_SPACING
  
  // Full instructions
  drawStandardSection(doc, 'Instructions', recipe.instructions || '', leftMargin, y, contentWidth, false)
}

/**
 * Estimate if content will fit in two-section layout
 */
function estimateFitsInTwoSections(recipe, scaledIngredients, doc) {
  const lineHeight = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR
  const sectionHeight = (PAGE_HEIGHT_PT / 2) - (2 * MARGIN_PT)
  const maxLines = Math.floor(sectionHeight / lineHeight)
  
  // Count ingredient lines
  let ingredientLines = 5 // Header lines
  const sortedGroups = getSortedGroups(scaledIngredients)
  for (const [groupKey, group] of sortedGroups) {
    if (groupKey !== 'ungrouped' && group.name) ingredientLines++
    ingredientLines += group.ingredients.length
  }
  
  // Count instruction lines
  doc.setFontSize(BODY_FONT_SIZE)
  const instructionLines = doc.splitTextToSize(recipe.instructions || '', PAGE_WIDTH_PT - 60).length + 8
  
  // Check if both sections fit
  return ingredientLines < maxLines * 0.85 && instructionLines < maxLines * 0.85
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
