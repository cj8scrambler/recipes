-- Cleanup Script for Orphaned Recipe_Ingredients
-- 
-- This script helps identify and clean up orphaned records in Recipe_Ingredients
-- that prevent ingredient deletion due to foreign key constraints.
-- 
-- USE WITH CAUTION: Always backup your database before running cleanup scripts!

-- ==== STEP 1: IDENTIFY ORPHANED RECORDS ====

-- Check for Recipe_Ingredients that reference non-existent recipes
SELECT 
    ri.recipe_id,
    ri.ingredient_id,
    i.name as ingredient_name,
    'Recipe does not exist' as issue
FROM Recipe_Ingredients ri
LEFT JOIN Recipes r ON ri.recipe_id = r.recipe_id
INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
WHERE r.recipe_id IS NULL;

-- Check for Recipe_Ingredients that reference non-existent ingredients
SELECT 
    ri.recipe_id,
    ri.ingredient_id,
    r.name as recipe_name,
    'Ingredient does not exist' as issue
FROM Recipe_Ingredients ri
LEFT JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
INNER JOIN Recipes r ON ri.recipe_id = r.recipe_id
WHERE i.ingredient_id IS NULL;

-- Check for specific ingredient that's causing issues (e.g., "Instant Rice")
-- Replace 'Instant Rice' with the actual ingredient name
SELECT 
    ri.recipe_id,
    ri.ingredient_id,
    r.name as recipe_name,
    i.name as ingredient_name,
    ri.quantity,
    u.name as unit_name
FROM Recipe_Ingredients ri
INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
INNER JOIN Recipes r ON ri.recipe_id = r.recipe_id
LEFT JOIN Units u ON ri.unit_id = u.unit_id
WHERE i.name = 'Instant Rice';


-- ==== STEP 2: CLEAN UP ORPHANED RECORDS ====

-- WARNING: These DELETE statements will permanently remove data!
-- Only run these after verifying the SELECT queries above show the correct records.

-- Delete Recipe_Ingredients where the recipe no longer exists
-- Uncomment to execute:
-- DELETE ri FROM Recipe_Ingredients ri
-- LEFT JOIN Recipes r ON ri.recipe_id = r.recipe_id
-- WHERE r.recipe_id IS NULL;

-- Delete Recipe_Ingredients where the ingredient no longer exists
-- Uncomment to execute:
-- DELETE ri FROM Recipe_Ingredients ri
-- LEFT JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
-- WHERE i.ingredient_id IS NULL;

-- Delete Recipe_Ingredients for a specific ingredient by name
-- This is useful when you want to force-delete an ingredient
-- Uncomment and replace 'Instant Rice' with the actual ingredient name:
-- DELETE ri FROM Recipe_Ingredients ri
-- INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
-- WHERE i.name = 'Instant Rice';

-- After cleanup, you can delete the ingredient itself:
-- DELETE FROM Ingredients WHERE name = 'Instant Rice';


-- ==== STEP 3: VERIFY CLEANUP ====

-- Count remaining orphaned Recipe_Ingredients (should be 0)
SELECT 
    COUNT(*) as orphaned_recipe_ingredients
FROM Recipe_Ingredients ri
LEFT JOIN Recipes r ON ri.recipe_id = r.recipe_id
LEFT JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
WHERE r.recipe_id IS NULL OR i.ingredient_id IS NULL;

-- Verify the ingredient can now be deleted (should return 0 rows)
-- Replace 'Instant Rice' with the actual ingredient name:
-- SELECT 
--     COUNT(*) as remaining_usages
-- FROM Recipe_Ingredients ri
-- INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
-- WHERE i.name = 'Instant Rice';


-- ==== PREVENTION: Add CASCADE to foreign key (Optional) ====

-- NOTE: This requires dropping and recreating the foreign key constraint.
-- This is an advanced operation and should only be done with DBA approval.
-- 
-- To prevent this issue in the future, you could modify the Recipe_Ingredients
-- foreign key to use ON DELETE CASCADE, but this means deleting a recipe will
-- automatically delete all its ingredients from Recipe_Ingredients.
-- 
-- Current constraint (from db.sql line 66):
-- FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id)
-- 
-- Proposed change:
-- FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id) ON DELETE CASCADE
-- 
-- However, this may not be desired behavior - you might want to prevent
-- ingredient deletion if it's used in recipes. The backend check should
-- handle this properly instead.


-- ==== NOTES ====

-- This issue occurs when:
-- 1. An ingredient is "deleted" through the UI
-- 2. The backend fails to properly check Recipe_Ingredients references
-- 3. The database constraint prevents deletion, but the error is hidden
-- 4. The UI shows the ingredient as deleted, but it remains in the database
-- 5. Recipe_Ingredients records remain orphaned
-- 
-- The backend fix ensures:
-- - Explicit query of Recipe_Ingredients before allowing deletion
-- - Proper error messages returned to the UI
-- - Foreign key constraint errors are caught and explained to users
