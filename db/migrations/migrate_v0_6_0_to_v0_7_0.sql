-- Migration from v0.6.0 to v0.7.0
-- Generated: 2025-11-27
-- 
-- This migration adds support for user recipe lists, allowing users to 
-- create personalized lists of recipes with saved servings and variants.

-- ==== UPGRADE ====
-- Upgrade from v0.6.0 to v0.7.0

-- Create new table: Recipe_Lists
-- Stores user-created recipe lists (e.g., "Weeknight Dinners", "Holiday Meals")
CREATE TABLE Recipe_Lists (
    list_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Create new table: Recipe_List_Items
-- Stores recipes within a user's list with saved configuration (servings, variant)
CREATE TABLE Recipe_List_Items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    list_id INT NOT NULL,
    recipe_id INT NOT NULL,
    servings INT NOT NULL DEFAULT 1,
    variant_id INT,  -- References a recipe variant (another recipe with parent_recipe_id)
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (list_id) REFERENCES Recipe_Lists(list_id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES Recipes(recipe_id) ON DELETE SET NULL,
    UNIQUE KEY unique_list_recipe (list_id, recipe_id),
    INDEX idx_list_id (list_id),
    INDEX idx_recipe_id (recipe_id)
);

-- ==== DOWNGRADE ====
-- Downgrade from v0.7.0 to v0.6.0

-- Drop table: Recipe_List_Items (must be dropped first due to foreign key)
DROP TABLE IF EXISTS Recipe_List_Items;

-- Drop table: Recipe_Lists
DROP TABLE IF EXISTS Recipe_Lists;
