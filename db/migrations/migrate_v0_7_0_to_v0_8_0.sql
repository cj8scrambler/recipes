-- Migration from v0.7.0 to v0.8.0
-- Generated: 2025-12-02
-- 
-- This migration allows the same ingredient to appear multiple times in a recipe
-- by changing Recipe_Ingredients primary key from composite (recipe_id, ingredient_id)
-- to an auto-increment id column.

-- ==== UPGRADE ====
-- Upgrade from v0.7.0 to v0.8.0

-- Step 1: Create new table with auto-increment id
CREATE TABLE Recipe_Ingredients_New (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    notes VARCHAR(255),
    group_id INT,
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id),
    FOREIGN KEY (unit_id) REFERENCES Units(unit_id),
    FOREIGN KEY (group_id) REFERENCES Ingredient_Groups(group_id) ON DELETE SET NULL,
    INDEX idx_recipe_ingredients_recipe (recipe_id),
    INDEX idx_recipe_ingredients_ingredient (ingredient_id)
);

-- Step 2: Copy existing data
INSERT INTO Recipe_Ingredients_New (recipe_id, ingredient_id, quantity, unit_id, notes, group_id)
SELECT recipe_id, ingredient_id, quantity, unit_id, notes, group_id
FROM Recipe_Ingredients;

-- Step 3: Drop old table
DROP TABLE Recipe_Ingredients;

-- Step 4: Rename new table
ALTER TABLE Recipe_Ingredients_New RENAME TO Recipe_Ingredients;

-- ==== DOWNGRADE ====
-- Downgrade from v0.8.0 to v0.7.0
-- WARNING: This will fail if there are duplicate ingredient entries for the same recipe!

-- Step 1: Create table with original schema
CREATE TABLE Recipe_Ingredients_Old (
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    notes VARCHAR(255),
    group_id INT,
    PRIMARY KEY (recipe_id, ingredient_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id),
    FOREIGN KEY (unit_id) REFERENCES Units(unit_id),
    FOREIGN KEY (group_id) REFERENCES Ingredient_Groups(group_id) ON DELETE SET NULL
);

-- Step 2: Copy data (only one entry per recipe+ingredient will be kept)
-- Using a subquery to get the entry with the highest id for each recipe+ingredient combination
INSERT INTO Recipe_Ingredients_Old (recipe_id, ingredient_id, quantity, unit_id, notes, group_id)
SELECT r.recipe_id, r.ingredient_id, r.quantity, r.unit_id, r.notes, r.group_id
FROM Recipe_Ingredients r
INNER JOIN (
    SELECT recipe_id, ingredient_id, MAX(id) as max_id
    FROM Recipe_Ingredients
    GROUP BY recipe_id, ingredient_id
) latest ON r.id = latest.max_id;

-- Step 3: Drop new table
DROP TABLE Recipe_Ingredients;

-- Step 4: Rename old table
ALTER TABLE Recipe_Ingredients_Old RENAME TO Recipe_Ingredients;
