-- Alternative direct migration from v0.7.0 to v0.7.1
-- Use this if the main migration script doesn't work
-- 
-- This version directly drops the constraint without checking if it exists first.
-- If the constraint doesn't exist, you'll get an error, but that's OK - it means
-- the constraint is already gone.

-- ==== UPGRADE ====
-- Drop the unique constraint on (list_id, recipe_id)
ALTER TABLE Recipe_List_Items DROP INDEX unique_list_recipe;

-- If you get an error "Can't DROP 'unique_list_recipe'; check that column/key exists"
-- That means the constraint is already removed - you can ignore this error.
