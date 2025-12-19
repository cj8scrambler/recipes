-- FORCE DROP CONSTRAINT for v0.7.1 migration
-- This file contains a simple, direct command to drop the unique constraint
-- Use this if the other migration scripts didn't work
--
-- Run this in MySQL command line or via mysql client

-- Drop the unique constraint
ALTER TABLE Recipe_List_Items DROP INDEX unique_list_recipe;

-- You should see: "Query OK, 0 rows affected"
-- If you get an error "Can't DROP 'unique_list_recipe'; check that column/key exists"
-- then the constraint is already gone (which is good)
