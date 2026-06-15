-- Migration to v2.2.0
-- Add notes column to Ingredients (was missing from original schema)
ALTER TABLE Ingredients ADD COLUMN notes VARCHAR(255);
