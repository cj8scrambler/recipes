-- Migration from v0.7.0 to v0.8.0
-- Generated: 2025-12-02
-- 
-- This migration allows the same ingredient to appear multiple times in a recipe
-- by changing Recipe_Ingredients primary key from composite (recipe_id, ingredient_id)
-- to an auto-increment id column.

-- ==== UPGRADE ====
-- Upgrade from v0.7.0 to v0.8.0

-- Step 1: Drop the existing composite primary key
ALTER TABLE Recipe_Ingredients DROP PRIMARY KEY;

-- Step 2: Add the new auto-increment id column as primary key
ALTER TABLE Recipe_Ingredients ADD COLUMN id INT PRIMARY KEY AUTO_INCREMENT FIRST;

-- Step 3: Add indexes for the columns that were part of the composite primary key
ALTER TABLE Recipe_Ingredients ADD INDEX idx_recipe_ingredients_recipe (recipe_id);
ALTER TABLE Recipe_Ingredients ADD INDEX idx_recipe_ingredients_ingredient (ingredient_id);

-- ==== DOWNGRADE ====
-- Downgrade from v0.8.0 to v0.7.0
-- WARNING: This will fail if there are duplicate ingredient entries for the same recipe!
-- You must first manually remove duplicate entries before running this downgrade.

-- Step 1: Drop the indexes we added
ALTER TABLE Recipe_Ingredients DROP INDEX idx_recipe_ingredients_recipe;
ALTER TABLE Recipe_Ingredients DROP INDEX idx_recipe_ingredients_ingredient;

-- Step 2: Drop the id column (this also removes the primary key)
ALTER TABLE Recipe_Ingredients DROP COLUMN id;

-- Step 3: Restore the composite primary key
ALTER TABLE Recipe_Ingredients ADD PRIMARY KEY (recipe_id, ingredient_id);
