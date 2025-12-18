-- Migration from v0.7.0 to v0.7.1
-- Generated: 2025-12-18
-- 
-- This migration removes the unique constraint on Recipe_List_Items to allow
-- the same recipe to be added to a list multiple times (for different meals).

-- ==== UPGRADE ====
-- Upgrade from v0.7.0 to v0.7.1

-- Drop the unique constraint on (list_id, recipe_id)
-- Note: MySQL doesn't support DROP INDEX IF EXISTS in ALTER TABLE,
-- so we check if the index exists first
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'Recipe_List_Items'
    AND index_name = 'unique_list_recipe'
);

SET @drop_statement = IF(@constraint_exists > 0,
    'ALTER TABLE Recipe_List_Items DROP INDEX unique_list_recipe',
    'SELECT "Index does not exist" AS message'
);

PREPARE stmt FROM @drop_statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ==== DOWNGRADE ====
-- Downgrade from v0.7.1 to v0.7.0

-- Re-add the unique constraint on (list_id, recipe_id)
-- WARNING: This will fail if there are duplicate (list_id, recipe_id) pairs in the table
ALTER TABLE Recipe_List_Items ADD UNIQUE KEY unique_list_recipe (list_id, recipe_id);
