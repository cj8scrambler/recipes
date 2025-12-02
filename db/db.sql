-- 1. Units Table (Corrected)
CREATE TABLE Units (
    unit_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    category ENUM('Weight', 'Volume', 'Dry Volume', 'Liquid Volume', 'Temperature', 'Item') NOT NULL,
    `system` ENUM('Metric', 'US Customary', 'Other') NOT NULL,
    base_conversion_factor DECIMAL(10, 5),
    UNIQUE KEY unique_unit (name, category, `system`)
);

-- 2. Ingredient_Types Table
-- Stores ingredient category types (e.g., Dairy, Vegetables, Spices)
CREATE TABLE Ingredient_Types (
    type_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 3. Ingredients Table
CREATE TABLE Ingredients (
    ingredient_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    price DECIMAL(10, 2),
    price_unit_id INT,
    default_unit_id INT,
    weight DECIMAL(10, 2),
    contains_peanuts BOOLEAN NOT NULL DEFAULT FALSE,
    gluten_status ENUM('Contains', 'Gluten-Free', 'GF_Available') NOT NULL DEFAULT 'Gluten-Free',
    type_id INT,
    FOREIGN KEY (price_unit_id) REFERENCES Units(unit_id),
    FOREIGN KEY (default_unit_id) REFERENCES Units(unit_id),
    FOREIGN KEY (type_id) REFERENCES Ingredient_Types(type_id) ON DELETE SET NULL
);

-- 4. Recipes Table
CREATE TABLE Recipes (
    recipe_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    base_servings INT NOT NULL DEFAULT 4,
    parent_recipe_id INT,
    variant_notes VARCHAR(255),
    FOREIGN KEY (parent_recipe_id) REFERENCES Recipes(recipe_id) ON DELETE SET NULL
);

-- 5. Ingredient_Groups Table
-- Stores reusable group names for organizing ingredients within recipes
CREATE TABLE Ingredient_Groups (
    group_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 6. Recipe_Ingredients (Junction Table)
-- Note: Uses auto-increment id to allow same ingredient multiple times in a recipe
CREATE TABLE Recipe_Ingredients (
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

-- 7. Tags Table
CREATE TABLE Tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 8. Recipe_Tags (Junction Table)
CREATE TABLE Recipe_Tags (
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags(tag_id) ON DELETE CASCADE
);

-- 9. Ingredient_Prices Table
-- Stores multiple price entries per ingredient for different unit types
CREATE TABLE Ingredient_Prices (
    price_id INT PRIMARY KEY AUTO_INCREMENT,
    ingredient_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    price_note VARCHAR(255),  -- Free-form text for time/location/notes about the price
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES Units(unit_id),
    UNIQUE KEY unique_ingredient_unit_price (ingredient_id, unit_id),
    INDEX idx_ingredient_prices_ingredient (ingredient_id)
);

-- 10. Users Table
-- Stores user accounts with authentication and role information
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,  -- UUID stored as string
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    settings JSON,  -- User preferences stored as JSON (e.g., {"unit": "metric"})
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- 11. Sessions Table
-- Stores active user sessions for session-based authentication
CREATE TABLE sessions (
    session_id CHAR(36) PRIMARY KEY,  -- UUID stored as string
    user_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- 12. Recipe Lists Table
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

-- 13. Recipe List Items Table
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
