-- Migration V002: Add default_unit_id to Ingredients table
-- Description: This field stores the default unit for an ingredient when adding it to a recipe
-- This migration is based on the existing migration_add_default_unit.sql file

-- ==== UPGRADE ====
ALTER TABLE Ingredients ADD COLUMN default_unit_id INT AFTER price_unit_id;
ALTER TABLE Ingredients ADD CONSTRAINT fk_default_unit FOREIGN KEY (default_unit_id) REFERENCES Units(unit_id);

-- ==== DOWNGRADE ====
ALTER TABLE Ingredients DROP FOREIGN KEY fk_default_unit;
ALTER TABLE Ingredients DROP COLUMN default_unit_id;
