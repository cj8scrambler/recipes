-- Migration from v1.0.0 to v1.1.0
-- Allow the same ingredient to appear more than once in a recipe
-- (e.g., water added at different steps)
--
-- Replaces the composite primary key (recipe_id, ingredient_id) on
-- Recipe_Ingredients with a surrogate auto-increment id column.

-- ==== UPGRADE ====

-- Add the replacement index first so the recipe_id FK always has a supporting index
ALTER TABLE Recipe_Ingredients ADD INDEX idx_recipe_ingredient (recipe_id, ingredient_id);
ALTER TABLE Recipe_Ingredients DROP PRIMARY KEY;
ALTER TABLE Recipe_Ingredients ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;

-- ==== DOWNGRADE ====
-- WARNING: will fail if any recipe currently has duplicate ingredient entries.

ALTER TABLE Recipe_Ingredients DROP PRIMARY KEY, DROP COLUMN id;
ALTER TABLE Recipe_Ingredients ADD PRIMARY KEY (recipe_id, ingredient_id);
ALTER TABLE Recipe_Ingredients DROP INDEX idx_recipe_ingredient;
