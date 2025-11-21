-- Migration V003: Add ingredient grouping support
-- Description: Adds a table for ingredient group names and links them to recipe ingredients

-- ==== UPGRADE ====
-- 1. Create Ingredient_Groups table to store reusable group names
CREATE TABLE Ingredient_Groups (
    group_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 2. Add group_id column to Recipe_Ingredients table
ALTER TABLE Recipe_Ingredients ADD COLUMN group_id INT AFTER notes;

-- 3. Add foreign key constraint
ALTER TABLE Recipe_Ingredients ADD CONSTRAINT fk_ingredient_group 
    FOREIGN KEY (group_id) REFERENCES Ingredient_Groups(group_id) ON DELETE SET NULL;

-- 4. Add some common default groups
INSERT INTO Ingredient_Groups (name, description) VALUES
    ('Dry Mix', 'Dry ingredients to be mixed together'),
    ('Wet Mix', 'Wet ingredients to be combined'),
    ('Spice Mix', 'Spices and seasonings to be mixed'),
    ('Topping', 'Ingredients for topping or garnish'),
    ('Sauce', 'Sauce ingredients'),
    ('Marinade', 'Marinade ingredients');

-- ==== DOWNGRADE ====
-- Remove foreign key constraint
ALTER TABLE Recipe_Ingredients DROP FOREIGN KEY fk_ingredient_group;

-- Remove group_id column from Recipe_Ingredients
ALTER TABLE Recipe_Ingredients DROP COLUMN group_id;

-- Drop Ingredient_Groups table
DROP TABLE IF EXISTS Ingredient_Groups;
