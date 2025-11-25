-- Migration to add ingredient types support
-- This adds a table for categorizing ingredients (e.g., Dairy, Vegetables, Spices)
-- Different from Ingredient Groups which organize ingredients within a recipe
-- Run this on an existing database, or use the updated db.sql for fresh setup

-- 1. Create Ingredient_Types table to store ingredient categories
CREATE TABLE Ingredient_Types (
    type_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 2. Add type_id column to Ingredients table
-- This links an ingredient to an optional ingredient type
ALTER TABLE Ingredients ADD COLUMN type_id INT AFTER gluten_status;

-- 3. Add foreign key constraint
ALTER TABLE Ingredients ADD CONSTRAINT fk_ingredient_type 
    FOREIGN KEY (type_id) REFERENCES Ingredient_Types(type_id) ON DELETE SET NULL;

-- 4. Add some common default ingredient types
INSERT INTO Ingredient_Types (name, description) VALUES
    ('Dairy', 'Milk, cheese, butter, and other dairy products'),
    ('Vegetables', 'Fresh and dried vegetables'),
    ('Fruits', 'Fresh and dried fruits'),
    ('Grains', 'Rice, pasta, bread, and other grain products'),
    ('Proteins', 'Meat, poultry, fish, and plant-based proteins'),
    ('Spices', 'Herbs, spices, and seasonings'),
    ('Oils & Fats', 'Cooking oils, butter, and other fats'),
    ('Sweeteners', 'Sugar, honey, and other sweeteners'),
    ('Baking', 'Flour, baking powder, yeast, and other baking essentials'),
    ('Condiments', 'Sauces, dressings, and condiments');
