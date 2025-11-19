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

-- 2. Ingredients Table
CREATE TABLE Ingredients (
    ingredient_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    price DECIMAL(10, 2),
    price_unit_id INT,
    contains_peanuts BOOLEAN NOT NULL DEFAULT FALSE,
    gluten_status ENUM('Contains', 'Gluten-Free', 'GF_Available') NOT NULL DEFAULT 'Gluten-Free',
    FOREIGN KEY (price_unit_id) REFERENCES Units(unit_id)
);

-- 3. Recipes Table
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

-- 4. Recipe_Ingredients (Junction Table)
CREATE TABLE Recipe_Ingredients (
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    notes VARCHAR(255),
    PRIMARY KEY (recipe_id, ingredient_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id),
    FOREIGN KEY (unit_id) REFERENCES Units(unit_id)
);

-- 5. Tags Table
CREATE TABLE Tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 6. Recipe_Tags (Junction Table)
CREATE TABLE Recipe_Tags (
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES Recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags(tag_id) ON DELETE CASCADE
);
