-- Verification script for migration v0.7.0 to v0.7.1
-- Run this to check if the unique constraint has been successfully removed

-- Check for the unique_list_recipe constraint
SELECT 
    'Checking for unique_list_recipe constraint...' AS Status;

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.statistics
WHERE table_schema = DATABASE()
    AND table_name = 'Recipe_List_Items'
    AND index_name = 'unique_list_recipe';

-- If the above returns no rows, the constraint has been removed successfully
-- If it returns rows, the migration did not apply correctly

-- Show all indexes on the Recipe_List_Items table
SELECT 
    'All indexes on Recipe_List_Items:' AS Status;

SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE,
    INDEX_TYPE
FROM information_schema.statistics
WHERE table_schema = DATABASE()
    AND table_name = 'Recipe_List_Items'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Expected result after migration:
-- - PRIMARY key on item_id (NON_UNIQUE = 0)
-- - idx_list_id on list_id (NON_UNIQUE = 1)
-- - idx_recipe_id on recipe_id (NON_UNIQUE = 1)
-- - Foreign key indexes
-- - NO unique_list_recipe index
