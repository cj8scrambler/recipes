# Debugging Recipe Price Calculation

## Overview

Detailed logging has been added to the backend to help diagnose recipe price calculation issues. The logs will appear in the backend console/logs when a recipe cost is calculated.

## How to Enable Logging

Debug logging is **disabled by default** for performance. To enable it, set the environment variable:

```bash
export ENABLE_COST_DEBUG=true
```

Then restart your backend server. You'll see debug output in:

1. **Development**: Terminal where `flask run` is running
2. **Production**: Check gunicorn/application logs

To disable logging again:
```bash
export ENABLE_COST_DEBUG=false
# or unset ENABLE_COST_DEBUG
```

## Log Patterns

All debug logs will have timestamps and INFO level when enabled:

```
2025-12-16 02:45:30 [INFO] [RECIPE COST DEBUG] ...
```

### 1. Recipe Cost Calculation Start

```
[INFO] [RECIPE COST DEBUG] ========================================
[INFO] [RECIPE COST DEBUG] Calculating cost for recipe: <recipe_name> (id=<recipe_id>)
[INFO] [RECIPE COST DEBUG] Scale factor: <factor>
[INFO] [RECIPE COST DEBUG] Number of ingredients: <count>
[INFO] [RECIPE COST DEBUG] Available units: <count>
```

**What to check:**
- Verify the correct recipe is being processed
- Check that units are loaded (count should be > 0)

### 2. Per-Ingredient Cost Calculation

For each ingredient, you'll see:

```
[RECIPE COST DEBUG] --- Ingredient <n>/<total> ---
[COST DEBUG] Calculating cost for ingredient: <name> (id=<id>)
[COST DEBUG] Recipe uses: <quantity> <unit_name> (<abbreviation>) [category=<category>, unit_id=<id>]
```

**What to check:**
- Verify ingredient name is correct
- Check the unit category (should be Volume, Dry Volume, Liquid Volume, Weight, or Item)
- Note the unit_id for cross-referencing with prices

### 3. Available Prices

```
[COST DEBUG] Ingredient has <count> price(s) defined
[COST DEBUG] Price #1: $<price> per <unit_name> (<abbreviation>) [category=<category>, unit_id=<id>]
```

**What to check:**
- If count is 0, the ingredient has no prices defined
- Compare the price unit category with the recipe unit category
- For volume units, categories don't need to match exactly (Volume, Dry Volume, and Liquid Volume are compatible)

### 4. Unit Compatibility Check

```
[CONVERT DEBUG] Both are volume categories: <from_category> <-> <to_category> ✓
```
OR
```
[CONVERT DEBUG] Category match check: <from_category> == <to_category>? <true/false>
```

**What to check:**
- For volume units (Volume, Dry Volume, Liquid Volume): Should see "Both are volume categories ✓"
- For other units (Weight, Item): Categories must match exactly
- If compatibility fails, price cannot be used

### 5. Unit Conversion

```
[CONVERT DEBUG] Conversion: <qty> <from_unit> × <factor1> = <base_qty> (base) ÷ <factor2> = <result> <to_unit>
```

**What to check:**
- Verify conversion factors are reasonable (e.g., Cup = 236.588 mL, Pound = 453.592 g)
- Check that base quantities make sense
- Ensure no division by zero or null factors

### 6. Final Cost

```
[COST DEBUG] Cost calculation: <converted_qty> × $<price> = $<cost>
[COST DEBUG] ✓ Final cost: $<cost>
```
OR
```
[COST DEBUG] ✗ No matching price found for ingredient <name>
```

**What to check:**
- Verify the calculated cost is reasonable
- If no matching price, review earlier logs to see why prices were rejected

## Common Issues and Solutions

### Issue 1: "Ingredient has 0 price(s) defined"

**Problem:** No prices set in the Ingredient_Prices table

**Solution:**
1. Go to Ingredient Editor in the UI
2. Add prices for the ingredient in relevant units
3. Save the ingredient

### Issue 2: "Units not compatible for conversion"

**Problem:** Recipe uses a unit in one category, but prices are in an incompatible category

**Example:** Recipe uses "Cup" (volume), but price is in "Ounce" (weight)

**Solution:**
- Add a price in a compatible unit (any volume unit for volume recipes)
- OR change the recipe to use a unit compatible with existing prices

### Issue 3: Recipe uses non-base units (e.g., "Cup" from Dry Volume instead of "Milliliter")

**Problem:** Recipe was created before the frontend fix and stores units in Dry/Liquid Volume categories

**Log indicators:**
- Recipe unit shows category="Dry Volume" or "Liquid Volume"
- Price might be in "Volume" or different subcategory

**Solution:**
This should work automatically since volume categories are compatible. If it doesn't:
1. Run the data migration script: `db/migrations/data_migration_normalize_volume_units.sql`
2. See `db/migrations/DATA_MIGRATION_GUIDE.md` for details

### Issue 4: "Missing conversion factors"

**Problem:** Unit in database has NULL base_conversion_factor

**Log indicators:**
```
[CONVERT DEBUG] Missing conversion factors - from: None, to: <value>
```

**Solution:**
Check Units table and ensure all relevant units have base_conversion_factor set:
```sql
SELECT unit_id, name, category, base_conversion_factor 
FROM Units 
WHERE base_conversion_factor IS NULL;
```

Item and Temperature categories can have NULL, but Volume/Weight categories should not.

## Example Debug Session

Here's what a successful price calculation looks like:

```
[RECIPE COST DEBUG] ========================================
[RECIPE COST DEBUG] Calculating cost for recipe: Chocolate Chip Cookies (id=5)
[RECIPE COST DEBUG] Number of ingredients: 3

[RECIPE COST DEBUG] --- Ingredient 1/3 ---
[COST DEBUG] Calculating cost for ingredient: All-Purpose Flour (id=2)
[COST DEBUG] Recipe uses: 473.176 Milliliter (mL) [category=Volume, unit_id=6]
[COST DEBUG] Ingredient has 1 price(s) defined
[COST DEBUG] Price #1: $3.99 per Cup (c) [category=Liquid Volume, unit_id=11]
[CONVERT DEBUG] Both are volume categories: Volume <-> Liquid Volume ✓
[CONVERT DEBUG] Conversion: 473.176 Milliliter × 1.0 = 473.176 (base) ÷ 236.588 = 2.0 Cup
[COST DEBUG] Cost calculation: 2.0 × $3.99 = $7.98
[COST DEBUG] ✓ Final cost: $7.98

[RECIPE COST DEBUG] ✓ Cost available: $7.98
```

## Interpreting the Output

### Success Indicators ✓

- "✓ Cost available" for each ingredient
- "Both are volume categories ✓" for volume conversions
- Reasonable conversion factors and costs
- Total cost calculated at the end

### Failure Indicators ✗

- "✗ No matching price found"
- "✗ Unit conversion failed"
- "Units not compatible"
- "Missing conversion factors"
- "Total cost: N/A"

## Next Steps

1. **Check the logs** when viewing a recipe in the UI
2. **Identify which ingredient** is failing (look for ✗ markers)
3. **Review the specific failure reason** in the logs
4. **Apply the appropriate solution** from the Common Issues section
5. **Re-test** and verify the logs show success

## Getting Help

If the logs don't make the issue clear, please share:
1. The complete log output for the failing recipe
2. The output of: `SELECT * FROM Ingredient_Prices WHERE ingredient_id = <failing_ingredient_id>`
3. The output of: `SELECT * FROM Units WHERE unit_id IN (<recipe_unit_id>, <price_unit_id>)`

This will help diagnose complex issues.
