-- Migration to v2.1.0
-- Replace free-form variant_notes with a Variant_Types lookup table

CREATE TABLE Variant_Types (
    variant_type_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_protected BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed the built-in Base type (protected — cannot be deleted)
INSERT INTO Variant_Types (name, is_protected) VALUES ('Base', TRUE);

-- Add variant_type_id FK to Recipes
ALTER TABLE Recipes
    ADD COLUMN variant_type_id INT,
    ADD CONSTRAINT fk_recipes_variant_type
        FOREIGN KEY (variant_type_id) REFERENCES Variant_Types(variant_type_id) ON DELETE SET NULL;

-- Set all existing recipes to Base
UPDATE Recipes SET variant_type_id = 1;

-- Add index on parent_recipe_id while we're here
ALTER TABLE Recipes
    ADD INDEX idx_parent_recipe (parent_recipe_id);

-- Drop the old free-form column
ALTER TABLE Recipes DROP COLUMN variant_notes;
