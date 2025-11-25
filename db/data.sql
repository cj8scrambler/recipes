-- 1. Units
-- Base for Weight is Gram (1.0)
-- Base for Dry Volume and Liquid Volume is Milliliter (1.0)
INSERT INTO Units (name, abbreviation, category, `system`, base_conversion_factor) VALUES
-- Weight units
('Gram', 'g', 'Weight', 'Metric', 1.0),
('Kilogram', 'kg', 'Weight', 'Metric', 1000.0),
('Milligram', 'mg', 'Weight', 'Metric', 0.001),
('Ounce', 'oz', 'Weight', 'US Customary', 28.3495),
('Pound', 'lb', 'Weight', 'US Customary', 453.592),
-- Volume units - Metric (used for both dry and liquid)
('Milliliter', 'mL', 'Volume', 'Metric', 1.0),
('Liter', 'L', 'Volume', 'Metric', 1000.0),
-- Dry Volume units - US Customary
('Teaspoon', 'tsp', 'Dry Volume', 'US Customary', 4.9289),
('Tablespoon', 'tbsp', 'Dry Volume', 'US Customary', 14.7868),
('Cup', 'c', 'Dry Volume', 'US Customary', 236.588),
-- Liquid Volume units - US Customary
('Fluid Ounce', 'fl oz', 'Liquid Volume', 'US Customary', 29.5735),
('Cup', 'c', 'Liquid Volume', 'US Customary', 236.588),
('Gallon', 'gal', 'Liquid Volume', 'US Customary', 3785.41),
-- Item units
('Each', 'ea', 'Item', 'Other', NULL),
('Cube', 'cube', 'Item', 'Other', NULL),
-- Temperature units
('Celsius', '°C', 'Temperature', 'Metric', NULL),
('Fahrenheit', '°F', 'Temperature', 'US Customary', NULL);

-- 2. Ingredients
-- Note: price_unit_id FKs refer to the IDs from the Units inserts
-- (e.g., 2 = 'Kilogram', 7 = 'Liter', 14 = 'Each')
-- weight is in grams per default unit
INSERT INTO Ingredients (name, price, price_unit_id, weight, contains_peanuts, gluten_status) VALUES
('Chicken Breast', 15.49, 2, 200, FALSE, 'Gluten-Free'),
('All-Purpose Flour', 3.99, 2, 125, FALSE, 'Contains'),
('Gluten-Free AP Flour', 8.99, 2, 125, FALSE, 'GF_Available'),
('Peanut Butter', 7.50, 2, 16, TRUE, 'Gluten-Free'),
('Olive Oil', 12.99, 7, 0.92, FALSE, 'Gluten-Free'),
('Large Egg', 4.50, 14, 50, FALSE, 'Gluten-Free'),
('Table Salt', 2.99, 2, 6, FALSE, 'Gluten-Free'),
('Water', NULL, NULL, 1, FALSE, 'Gluten-Free'),
('Flour Tortilla', 3.49, 14, 45, FALSE, 'Contains'),
('Corn Tortilla', 4.00, 14, 30, FALSE, 'Gluten-Free');

-- 3. Ingredient_Groups
-- Common group names for organizing ingredients within recipes
INSERT INTO Ingredient_Groups (name, description) VALUES
('Dry Mix', 'Dry ingredients to be mixed together'),
('Wet Mix', 'Wet ingredients to be combined'),
('Spice Mix', 'Spices and seasonings to be mixed'),
('Topping', 'Ingredients for topping or garnish'),
('Sauce', 'Sauce ingredients'),
('Marinade', 'Marinade ingredients');

-- 4. Tags
INSERT INTO Tags (name) VALUES
('Lightweight'),
('No-Cook'),
('Fresh Protein'),
('Vegetarian'),
('Quick');

-- 5. Recipes
INSERT INTO Recipes (name, description, instructions, base_servings, parent_recipe_id, variant_notes) VALUES
('Grilled Chicken', 'Simple grilled chicken breast.', '1. Preheat grill. 2. Season chicken. 3. Grill 6-8 min per side. 4. Check temp (165°F).', 2, NULL, NULL),
('GF Grilled Chicken', 'Simple grilled chicken breast.', '1. Preheat grill. 2. Season chicken with GF seasoning. 3. Grill 6-8 min per side. 4. Check temp (165°F).', 2, 1, 'Gluten-free variant'),
('Backpacker Peanut Butter Wrap', 'Lightweight, no-cook trail lunch.', '1. Lay tortilla flat. 2. Spread peanut butter. 3. Roll it up.', 1, NULL, NULL),
('Simple Scrambled Eggs', 'Classic breakfast.', '1. Crack eggs in bowl, add water, whisk. 2. Heat pan with oil. 3. Pour eggs, stir gently. 4. Add salt.', 1, NULL, NULL);

-- 6. Recipe_Tags
-- (Recipe 1 'Grilled Chicken' -> Fresh Protein, Quick)
INSERT INTO Recipe_Tags (recipe_id, tag_id) VALUES
(1, 3), (1, 5),
-- (Recipe 2 'GF Grilled Chicken' -> Fresh Protein, Quick)
(2, 3), (2, 5),
-- (Recipe 3 'Backpacker Wrap' -> Lightweight, No-Cook, Vegetarian, Quick)
(3, 1), (3, 2), (3, 4), (3, 5),
-- (Recipe 4 'Scrambled Eggs' -> Fresh Protein, Vegetarian, Quick)
(4, 3), (4, 4), (4, 5);

-- 7. Recipe_Ingredients
-- Note: unit_id FKs refer to the IDs from the Units inserts
-- (e.g., 1 = 'Gram', 5 = 'Pound', 6 = 'Milliliter', 14 = 'Item')
-- group_id FKs refer to Ingredient_Groups (optional - NULL means not in a group)
--
-- Recipe 1: Grilled Chicken (serves 2)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes, group_id) VALUES
(1, 1, 1, 5, 'Approx 1-2 breasts', NULL),  -- 1 lb Chicken Breast
(1, 5, 15, 6, 'For grilling', 6),          -- 15 mL Olive Oil - Marinade group
(1, 7, 3, 1, 'or to taste', 6);             -- 3 g Table Salt - Marinade group

-- Recipe 2: GF Grilled Chicken (variant)
-- (Uses same ingredients, but instructions note GF seasoning)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes, group_id) VALUES
(2, 1, 1, 5, 'Approx 1-2 breasts', NULL),  -- 1 lb Chicken Breast
(2, 5, 15, 6, 'For grilling', 6),          -- 15 mL Olive Oil - Marinade group
(2, 7, 3, 1, 'Use GF blend', 6);           -- 3 g Table Salt - Marinade group

-- Recipe 3: Backpacker Peanut Butter Wrap (serves 1)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes, group_id) VALUES
(3, 9, 1, 14, 'Large 10-inch', NULL),      -- 1 Flour Tortilla
(3, 4, 60, 1, 'Approx 2 tbsp', NULL);      -- 60 g Peanut Butter

-- Recipe 4: Simple Scrambled Eggs (serves 1)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes, group_id) VALUES
(4, 6, 3, 14, NULL, 2),                    -- 3 Large Eggs - Wet Mix group
(4, 8, 15, 6, 'or milk', 2),               -- 15 mL Water - Wet Mix group
(4, 5, 5, 6, 'for the pan', NULL),         -- 5 mL Olive Oil
(4, 7, 1, 1, 'to taste', NULL);            -- 1 g Table Salt

-- 8. Ingredient_Prices
-- Each ingredient needs a price in a unit compatible with the recipe's usage
-- (e.g., 1 = 'Gram', 2 = 'Kilogram', 5 = 'Pound', 6 = 'Milliliter', 7 = 'Liter', 14 = 'Each')
INSERT INTO Ingredient_Prices (ingredient_id, price, unit_id, price_note) VALUES
(1, 15.49, 2, 'Costco bulk'),              -- Chicken Breast: $15.49/kg
(2, 3.99, 2, 'Store brand'),               -- All-Purpose Flour: $3.99/kg
(3, 8.99, 2, 'Specialty brand'),           -- Gluten-Free AP Flour: $8.99/kg
(4, 7.50, 2, 'Jif'),                       -- Peanut Butter: $7.50/kg
(5, 12.99, 7, 'Extra virgin'),             -- Olive Oil: $12.99/L
(6, 0.38, 14, 'Large eggs'),               -- Large Egg: $0.38 each
(7, 2.99, 2, 'Morton'),                    -- Table Salt: $2.99/kg
(9, 0.29, 14, 'Mission brand'),            -- Flour Tortilla: $0.29 each
(10, 0.33, 14, 'Guerrero brand');          -- Corn Tortilla: $0.33 each

-- 9. User Seed Data (OPTIONAL - for development/testing only)
-- WARNING: Change these passwords in production!
-- These are test accounts with bcrypt-hashed passwords for manual testing

-- Admin user: admin@example.com / adminpass
INSERT INTO users (id, email, password_hash, role, settings, created_at, updated_at) VALUES
(
    UUID(),
    'admin@example.com',
    '$2b$12$.TFhW2/APna.nKZrhMRZTuy18z6wqLwbAdafUMS7m8PjS3998zjbu',
    'admin',
    '{"unit": "us"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Regular user: user@example.com / userpass
INSERT INTO users (id, email, password_hash, role, settings, created_at, updated_at) VALUES
(
    UUID(),
    'user@example.com',
    '$2b$12$VYegn8nDk4zMk5nmcEZUk.v5ornpAxYzTQ8dRgRBwtaxR9jtmzPoK',
    'user',
    '{"unit": "metric"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
