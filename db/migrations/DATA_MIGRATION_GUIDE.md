# Data Migration Guide: Volume Unit Normalization

## Purpose

This data migration normalizes existing `Recipe_Ingredients` records that use volume subcategory units (Dry Volume or Liquid Volume, such as "Cup" or "Tablespoon") to use the base Volume unit (Milliliter).

## Background

### The Issue

Prior to the frontend fix (this PR), the RecipeEditor would sometimes store recipe ingredients using volume subcategory units (e.g., unit_id for "Cup" in Dry Volume category) instead of converting to the base Volume unit (Milliliter).

This could cause issues when:
1. An ingredient has a price in one volume subcategory (e.g., Cup in Liquid Volume)
2. The recipe uses the same ingredient in a different volume subcategory (e.g., Cup in Dry Volume)
3. Even though the backend's `can_convert_units` treats these as compatible, having consistent base unit storage is cleaner and more reliable

### The Fix

The frontend fix ensures that **new recipes** always convert volume subcategory units to the base Volume unit (Milliliter) when saving. However, **existing recipes** in the database may still have non-normalized units.

## Who Needs This Migration?

You need to run this migration if:

- ✅ You had a production database **before** the frontend fix was deployed
- ✅ Users created recipes with volume-based ingredients (cups, tablespoons, etc.)
- ✅ You want to ensure consistent unit storage for reliability

You **do not** need this migration if:

- ❌ This is a fresh installation with no existing data
- ❌ All recipes were created after the frontend fix was deployed

## How to Run

### 1. Backup First (Required)

**Always backup your database before running data migrations:**

```bash
mysqldump -u username -p database_name > backup_before_volume_normalization_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run the Migration

```bash
mysql -u username -p database_name < db/migrations/data_migration_normalize_volume_units.sql
```

### 3. Verify Results

The migration will display a summary of how many recipe ingredients were normalized. You can also manually verify:

```sql
-- Check if any Recipe_Ingredients still use volume subcategory units
SELECT ri.*, u.name, u.category 
FROM Recipe_Ingredients ri
INNER JOIN Units u ON ri.unit_id = u.unit_id
WHERE u.category IN ('Dry Volume', 'Liquid Volume');

-- This should return 0 rows after migration
```

## What This Migration Does

### Before Migration

```
Recipe_Ingredients:
- recipe_id: 1, ingredient_id: 5, quantity: 2.0, unit_id: 10 (Cup - Dry Volume)
- recipe_id: 2, ingredient_id: 5, quantity: 1.0, unit_id: 11 (Cup - Liquid Volume)
```

### After Migration

```
Recipe_Ingredients:
- recipe_id: 1, ingredient_id: 5, quantity: 473.176, unit_id: 6 (Milliliter - Volume)
- recipe_id: 2, ingredient_id: 5, quantity: 236.588, unit_id: 6 (Milliliter - Volume)
```

Both recipes now use the same base unit, ensuring consistent cost calculations.

## Technical Details

### Conversion Logic

1. Identifies all `Recipe_Ingredients` using units with category 'Dry Volume' or 'Liquid Volume'
2. Converts quantity to base unit: `new_quantity = old_quantity × base_conversion_factor`
3. Updates unit_id to the base Volume unit (Milliliter)

### Idempotency

This migration is **idempotent** - it can be safely run multiple times:
- Recipe ingredients already using base Volume units (Milliliter) are not affected
- Only ingredients with subcategory volume units are converted

### Rollback

**Rollback is not supported** for this data migration because we don't track which original subcategory each ingredient used. If rollback is needed, restore from your database backup.

## Testing

### Test on Staging First

Always test migrations on a staging environment before production:

1. Copy production data to staging
2. Run migration on staging
3. Verify recipe cost calculations work correctly
4. Test recipe editing and saving
5. Only then proceed to production

### Validation Queries

After running the migration, verify data integrity:

```sql
-- 1. Check that all volume units are now in base Volume category
SELECT COUNT(*) as remaining_subcategory_units
FROM Recipe_Ingredients ri
INNER JOIN Units u ON ri.unit_id = u.unit_id
WHERE u.category IN ('Dry Volume', 'Liquid Volume');
-- Should return 0

-- 2. Verify quantities are in reasonable ranges (in milliliters)
SELECT r.name, i.name, ri.quantity, u.name, u.abbreviation
FROM Recipe_Ingredients ri
INNER JOIN Recipes r ON ri.recipe_id = r.recipe_id
INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
INNER JOIN Units u ON ri.unit_id = u.unit_id
WHERE u.category = 'Volume'
ORDER BY ri.quantity DESC
LIMIT 20;
-- Verify quantities look reasonable

-- 3. Test cost calculation for affected recipes
-- (Run through application or API endpoint)
```

## Troubleshooting

### Migration shows 0 changes but I expected some

This means either:
- No recipes were using volume subcategory units (already normalized)
- The Units table doesn't have a base Volume unit (check: `SELECT * FROM Units WHERE category = 'Volume' AND base_conversion_factor = 1.0`)

### Quantities look too large/small after migration

Double-check the base_conversion_factor values in your Units table. The exact values from the sample data are:
- Milliliter (mL): 1.0 (base unit)
- Cup (c): 236.588 (US cup)
- Tablespoon (tbsp): 14.7868 (US tablespoon)
- Teaspoon (tsp): 4.9289 (US teaspoon)
- Fluid Ounce (fl oz): 29.5735 (US fluid ounce)

**Important:** These are the exact conversion factors used in the migration. Your database may have slightly different values if metric or other unit systems are used. Verify with:
```sql
SELECT name, abbreviation, category, base_conversion_factor 
FROM Units 
WHERE category IN ('Volume', 'Dry Volume', 'Liquid Volume')
ORDER BY category, base_conversion_factor;
```

### Cost calculations still not working

Ensure:
1. Ingredient prices exist in compatible units (any volume category)
2. Backend's `can_convert_units` function is working correctly
3. Frontend fix has been deployed
4. Clear any application caches

## Related Changes

- **Frontend Fix**: PR "Fix recipe cost calculation for volume subcategories"
- **Backend Support**: The `can_convert_units` function already treats volume subcategories as compatible
- **Schema**: No schema changes required, this is data-only migration

## Questions?

If you encounter issues or have questions about this migration, please refer to the PR discussion or contact the development team.
