-- Migration to add default_unit_id to Ingredients table
-- This field stores the default unit for an ingredient when adding it to a recipe
-- Run this on an existing database, or use the updated db.sql for fresh setup

ALTER TABLE Ingredients ADD COLUMN default_unit_id INT AFTER price_unit_id;
ALTER TABLE Ingredients ADD CONSTRAINT fk_default_unit FOREIGN KEY (default_unit_id) REFERENCES Units(unit_id);
