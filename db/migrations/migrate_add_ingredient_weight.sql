-- Migration: Add weight column to Ingredients and rename units
-- Generated: 2025-01-01
-- 
-- This migration adds a weight column to the Ingredients table and renames
-- the 'Item' unit to 'Each' and the 'Slice' unit to 'Cube'.

-- ==== UPGRADE ====

-- Add weight column to Ingredients table
ALTER TABLE Ingredients ADD COLUMN weight DECIMAL(10, 2) AFTER default_unit_id;

-- Rename unit 'Item' to 'Each'
UPDATE Units SET name = 'Each', abbreviation = 'ea' WHERE name = 'Item' AND category = 'Item';

-- Rename unit 'Slice' to 'Cube'
UPDATE Units SET name = 'Cube', abbreviation = 'cube' WHERE name = 'Slice' AND category = 'Item';

-- ==== DOWNGRADE ====

-- Remove weight column from Ingredients table
ALTER TABLE Ingredients DROP COLUMN weight;

-- Rename unit 'Each' back to 'Item'
UPDATE Units SET name = 'Item', abbreviation = 'item' WHERE name = 'Each' AND category = 'Item';

-- Rename unit 'Cube' back to 'Slice'
UPDATE Units SET name = 'Slice', abbreviation = 'slice' WHERE name = 'Cube' AND category = 'Item';
