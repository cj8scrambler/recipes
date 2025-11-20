# Recipe Cost Tracking Feature

## Overview
This feature adds support for tracking ingredient prices and calculating recipe costs. It allows users to:
- Store multiple prices per ingredient (for different units)
- View total recipe cost in the user view
- View detailed ingredient costs and total cost in the admin recipe editor
- Get notified when price data is incomplete

## Database Changes

### New Table: Ingredient_Prices
```sql
CREATE TABLE Ingredient_Prices (
    price_id INT PRIMARY KEY AUTO_INCREMENT,
    ingredient_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    price_note VARCHAR(255),  -- Free-form text for time/location/notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES Units(unit_id),
    UNIQUE KEY unique_ingredient_unit_price (ingredient_id, unit_id)
);
```

### Migration
Run the migration script to add the new table:
```bash
mysql -u username -p database_name < db/migration_add_ingredient_prices.sql
```

## Backend API Changes

### New Endpoints

#### Get Ingredient Prices
```
GET /api/ingredients/{ingredient_id}/prices
```
Returns all prices for a specific ingredient.

#### Create Ingredient Price
```
POST /api/ingredients/{ingredient_id}/prices
Body: {
  "price": 3.50,
  "unit_id": 1,
  "price_note": "Grocery store, Jan 2024"
}
```

#### Update Ingredient Price
```
PUT /api/ingredients/{ingredient_id}/prices/{price_id}
Body: {
  "price": 3.75,
  "unit_id": 1,
  "price_note": "Updated price"
}
```

#### Delete Ingredient Price
```
DELETE /api/ingredients/{ingredient_id}/prices/{price_id}
```

#### Get Recipe Cost
```
GET /api/recipes/{recipe_id}/cost?scale=1.0
```
Returns cost information including:
- `total_cost`: Total recipe cost (null if any prices missing)
- `ingredients_cost`: Array of per-ingredient costs
- `has_missing_prices`: Boolean indicating if any prices are unavailable

## Cost Calculation Logic

### Unit Conversion
The system automatically converts between compatible units:
- **Volume units** (Volume, Dry Volume, Liquid Volume) can all convert between each other
- **Weight units** must match the same category
- **Item and Temperature units** don't convert

### Ingredient Cost Calculation
For each ingredient in a recipe:
1. Find a price entry for the ingredient with a compatible unit
2. Convert the recipe quantity to the price unit
3. Multiply by the price to get the cost
4. Scale by the serving size factor

### Recipe Total Cost
- Sum all ingredient costs
- If any ingredient is missing price data, the total cost is `null`
- The `has_missing_prices` flag indicates incomplete data

## Frontend Changes

### Ingredient Editor (Admin)
- New "Prices per Unit" section
- Add/remove multiple prices for different units
- Each price includes:
  - Unit selection (dropdown)
  - Price amount
  - Optional note (store/date/location)

### Recipe Editor (Admin)
- Shows "Cost Information" section when editing existing recipes
- Displays cost for each ingredient
- Shows total recipe cost
- Indicates when prices are missing with red text
- Updates automatically when recipe is loaded

### User Recipe View
- Shows "Estimated Cost" banner above ingredients
- Updates when serving size is adjusted
- Shows warning when price data is incomplete
- Only displays total cost (not per-ingredient breakdown)

## Usage Example

### Adding Ingredient Prices
1. Go to Admin Dashboard → Ingredients
2. Edit an ingredient
3. Scroll to "Prices per Unit"
4. Click "+ Add Price"
5. Select unit (e.g., "cup")
6. Enter price (e.g., "3.50")
7. Add optional note (e.g., "Whole Foods, Jan 2024")
8. Save ingredient

### Viewing Recipe Costs
**As User:**
1. Select a recipe from the list
2. Cost appears below the servings control
3. Adjust servings to see cost update

**As Admin:**
1. Edit a recipe
2. Cost information shows below ingredients list
3. See per-ingredient costs and total
4. Identifies missing prices in red

## Design Decisions

### Multiple Prices per Ingredient
Ingredients can have multiple price entries for different units because:
- Some recipes use volume measurements (cups)
- Other recipes use weight measurements (grams)
- Allows flexibility in how ingredients are purchased and measured

### Price Notes
Free-form text field for context about the price:
- Store name or location
- Date of purchase
- Brand or quality notes
- Bulk vs. retail pricing

### Missing Price Handling
When price data is incomplete:
- Per-ingredient costs still calculated for available data
- Total cost set to `null` (not zero)
- Clear indication to user that data is incomplete
- Encourages complete price data entry

### Unit Compatibility
Cost calculation only works when:
- Ingredient has a price in a compatible unit
- Recipe unit can convert to price unit
- Example: Recipe uses "tablespoons", price is per "cup" → Works!
- Example: Recipe uses "grams", price is per "cup" → Does NOT work

This ensures accurate cost calculations and prevents mixing incompatible units.

## Testing

### Backend Tests
Run the demonstration script to verify cost calculations:
```bash
cd backend
. .venv/bin/activate
python3 /tmp/test_cost_calculation.py
```

### Frontend Tests
1. Build the frontend to check for syntax errors:
```bash
cd frontend
npm run build
```

2. Manual testing:
   - Create ingredients with multiple prices
   - Create recipes using those ingredients
   - Verify costs display correctly
   - Test with missing prices
   - Test with different serving scales

## Future Enhancements

Potential improvements for future versions:
- Price history tracking over time
- Automatic price updates from external sources
- Cost per serving display
- Price comparison across stores
- Bulk discount calculations
- Currency conversion support
