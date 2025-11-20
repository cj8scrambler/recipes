# Recipe Cost Tracking - Usage Examples

## Example 1: Adding Price Data to an Ingredient

### Scenario
You want to track the cost of flour which you buy in pounds but use in cups.

### Steps
1. **Navigate to Admin Dashboard**
   - Log in as admin
   - Click "Admin Dashboard" in navigation
   - Go to "Ingredients" tab

2. **Edit the Flour Ingredient**
   - Click "Edit" next to "All-purpose flour"

3. **Add Price in Pounds**
   - Scroll to "Prices per Unit" section
   - Click "+ Add Price"
   - Select "pound (lb)" from unit dropdown
   - Enter price: `4.50` (for a 5lb bag, that's $0.90/lb)
   - Add note: "Costco 5lb bag, Jan 2024"
   - Click "Save Ingredient"

4. **Add Price in Cups** (optional)
   - Edit flour again
   - Click "+ Add Price"
   - Select "cup (c)" from unit dropdown
   - Enter price: `0.50` (cost per cup)
   - Add note: "Calculated from 5lb bag"
   - Click "Save Ingredient"

### Result
Now recipes using flour in either pounds or cups can calculate costs automatically!

## Example 2: Creating a Recipe with Cost Tracking

### Scenario
You're creating a cookie recipe and want to see the total cost.

### Steps
1. **Create the Recipe**
   - Go to Admin Dashboard → Recipes
   - Click "+ New Recipe"
   - Name: "Chocolate Chip Cookies"
   - Base servings: 24 (cookies)

2. **Add Ingredients with Prices Already Set**
   - Flour: 2 cups
   - Sugar: 1 cup
   - Butter: 0.5 cups
   - Chocolate chips: 2 cups

3. **Save and View Cost**
   - Click "Save Recipe"
   - The cost information will appear below ingredients
   - Shows per-ingredient costs:
     - Flour: $1.00
     - Sugar: $0.75
     - Butter: $2.50
     - Chocolate chips: Price not available (red text)
   - Total: Cannot calculate (missing prices)

4. **Add Missing Price**
   - Edit chocolate chips ingredient
   - Add price: $8.00 per bag (2 cups)
   - That's $4.00 per cup
   - Save ingredient

5. **View Updated Cost**
   - Edit recipe again
   - Now shows:
     - Flour: $1.00
     - Sugar: $0.75
     - Butter: $2.50
     - Chocolate chips: $8.00
   - **Total: $12.25** (for 24 cookies = $0.51/cookie)

## Example 3: Viewing Recipe Cost as a User

### Scenario
A regular user wants to see how much a recipe costs before making it.

### Steps
1. **Browse Recipes**
   - Log in as regular user
   - View recipe list on home page

2. **Select Recipe**
   - Click on "Chocolate Chip Cookies"
   - Recipe details appear

3. **View Cost**
   - Look below the servings control
   - See: "Estimated Cost: $12.25"

4. **Adjust Servings**
   - Change servings from 24 to 48 (double batch)
   - Cost automatically updates to: "Estimated Cost: $24.50"

5. **Missing Price Warning**
   - If any ingredient is missing price data:
   - Shows: "Cost information incomplete: Some ingredient prices are not available"

## Example 4: Tracking Prices from Different Stores

### Scenario
You shop at multiple stores and want to track which has the best prices.

### Steps
1. **Add Multiple Prices for Same Ingredient**
   - Edit "Sugar" ingredient
   - First price:
     - Unit: cup
     - Price: $0.75
     - Note: "Whole Foods, Jan 2024"
   
   Note: You can only have ONE price per unit type. To track different stores:
   
   - Method 1: Update the existing price with the better deal
   - Method 2: Use the note field to track store and keep the best price
   - Method 3: Create separate ingredients (e.g., "Sugar (Whole Foods)" vs "Sugar (Costco)")

### Recommended Approach
Use the note field and update price when you find a better deal:
```
Current: $0.75/cup at Whole Foods
Better deal found: Update to $0.60/cup, note "Costco, Feb 2024"
```

## Example 5: Converting Between Volume and Weight

### Scenario
Your recipe uses cups but you buy by weight (pounds).

### Steps
1. **Research Conversion**
   - 1 cup all-purpose flour ≈ 4.5 oz ≈ 0.28 lb
   - If flour costs $0.90/lb
   - Cost per cup = 0.28 × $0.90 = $0.25

2. **Add Both Price Types** (System Will Handle Conversion)
   - Option A: Add price in pounds only
     - The system will convert recipe cups to pounds automatically
   
   - Option B: Add calculated price per cup
     - Easier for recipes that use cups
     - No conversion needed

### Automatic Conversion
The system handles this automatically:
- Recipe uses: 2 cups flour
- Price available: $0.90 per pound
- System converts: 2 cups → 0.56 pounds
- Calculates: 0.56 × $0.90 = $0.50

## Example 6: Handling Missing Prices

### Scenario
You haven't entered prices for all ingredients yet.

### What You'll See

**In Admin Recipe Editor:**
```
Cost Information:
  Flour: $1.00
  Sugar: $0.75
  Butter: Price not available (in red)
  Eggs: Price not available (in red)

Total cost cannot be calculated - some prices missing
```

**In User View:**
```
Cost information incomplete: Some ingredient prices are not available
```

### How to Fix
1. Go to Admin Dashboard → Ingredients
2. For each missing ingredient:
   - Click "Edit"
   - Add at least one price
   - Save
3. Return to recipe - costs now display!

## Example 7: Bulk Cooking Cost Analysis

### Scenario
You want to know if making a large batch is more economical.

### Steps
1. **View Single Batch**
   - Recipe: "Marinara Sauce"
   - Servings: 4
   - Cost: $8.00
   - Per serving: $2.00

2. **Scale Up**
   - Adjust servings to 16 (4x batch)
   - New cost: $32.00
   - Per serving: still $2.00

3. **Analyze**
   - Cost scales linearly with servings
   - To save money, look for bulk ingredient pricing
   - Update ingredient prices with bulk purchase costs

### Adding Bulk Prices
- Edit ingredient
- Update price with bulk cost
- Add note: "Bulk purchase from restaurant supply"
- Recipe costs will automatically recalculate

## Tips and Best Practices

### 1. Keep Notes Updated
Always include in price notes:
- Store name
- Purchase date (Month/Year)
- Any special deals (bulk, sale, etc.)

### 2. Regular Price Updates
- Review prices quarterly
- Update when you find better deals
- Use notes to track price history

### 3. Unit Selection
- Use the same units you typically buy in
- For flour: pounds (if you buy 5lb bags)
- For spices: ounces (if you buy small jars)
- For liquids: fluid ounces or milliliters

### 4. Accuracy
- Be consistent with your source (same store)
- Account for waste/spillage if desired
- Round to 2 decimal places

### 5. Start Simple
- Begin with your most-used ingredients
- Add prices as you shop
- Don't worry about having complete data immediately

### 6. Cost Per Serving
Calculate yourself:
```
Total Recipe Cost: $12.25
Servings: 24 cookies
Cost per serving: $12.25 ÷ 24 = $0.51 per cookie
```

## Common Questions

**Q: Can I have multiple prices for the same unit?**
A: No, only one price per unit type. Update the existing price with new information.

**Q: What if I buy in ounces but recipe uses grams?**
A: As long as both are weight units, the system will convert automatically.

**Q: Do prices include tax?**
A: That's up to you! Be consistent - either always include tax or never include it.

**Q: Can I track prices over time?**
A: Not yet - the current version keeps only the latest price. Use notes to track history.

**Q: Why doesn't my cost show?**
A: Check that:
1. Ingredient has a price entered
2. Price unit is compatible with recipe unit (volume→volume, weight→weight)
3. All ingredients in recipe have prices

**Q: Can I export cost data?**
A: Not in current version - this could be a future enhancement.
