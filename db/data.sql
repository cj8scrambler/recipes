-- 1. Units
-- Base for Weight is Gram (1.0)
-- Base for Volume is Milliliter (1.0)
INSERT INTO Units (name, abbreviation, category, `system`, base_conversion_factor) VALUES
('Gram', 'g', 'Weight', 'Metric', 1.0),
('Kilogram', 'kg', 'Weight', 'Metric', 1000.0),
('Ounce', 'oz', 'Weight', 'US Customary', 28.3495),
('Pound', 'lb', 'Weight', 'US Customary', 453.592),
('Milliliter', 'mL', 'Volume', 'Metric', 1.0),
('Liter', 'L', 'Volume', 'Metric', 1000.0),
('US Teaspoon', 'tsp', 'Volume', 'US Customary', 4.9289),
('US Tablespoon', 'tbsp', 'Volume', 'US Customary', 14.7868),
('US Cup', 'c', 'Volume', 'US Customary', 236.588),
('Item', 'item', 'Item', 'Other', NULL),
('Slice', 'slice', 'Item', 'Other', NULL),
('Celsius', '°C', 'Temperature', 'Metric', NULL),
('Fahrenheit', '°F', 'Temperature', 'US Customary', NULL);

-- 2. Ingredients
-- Note: price_unit_id FKs refer to the IDs from the Units inserts
-- (e.g., 2 = 'Kilogram', 6 = 'Liter', 10 = 'Item')
INSERT INTO Ingredients (name, price, price_unit_id, contains_peanuts, gluten_status) VALUES
('Chicken Breast', 15.49, 2, FALSE, 'Gluten-Free'),
('All-Purpose Flour', 3.99, 2, FALSE, 'Contains'),
('Gluten-Free AP Flour', 8.99, 2, FALSE, 'GF_Available'),
('Peanut Butter', 7.50, 2, TRUE, 'Gluten-Free'),
('Olive Oil', 12.99, 6, FALSE, 'Gluten-Free'),
('Large Egg', 4.50, 10, FALSE, 'Gluten-Free'),
('Table Salt', 2.99, 2, FALSE, 'Gluten-Free'),
('Water', NULL, NULL, FALSE, 'Gluten-Free'),
('Flour Tortilla', 3.49, 10, FALSE, 'Contains'),
('Corn Tortilla', 4.00, 10, FALSE, 'Gluten-Free');

-- 3. Tags
INSERT INTO Tags (name) VALUES
('Lightweight'),
('No-Cook'),
('Fresh Protein'),
('Vegetarian'),
('Quick');

-- 4. Recipes
INSERT INTO Recipes (name, description, instructions, base_servings, parent_recipe_id, variant_notes) VALUES
('Grilled Chicken', 'Simple grilled chicken breast.', '1. Preheat grill. 2. Season chicken. 3. Grill 6-8 min per side. 4. Check temp (165°F).', 2, NULL, NULL),
('GF Grilled Chicken', 'Simple grilled chicken breast.', '1. Preheat grill. 2. Season chicken with GF seasoning. 3. Grill 6-8 min per side. 4. Check temp (165°F).', 2, 1, 'Gluten-free variant'),
('Backpacker Peanut Butter Wrap', 'Lightweight, no-cook trail lunch.', '1. Lay tortilla flat. 2. Spread peanut butter. 3. Roll it up.', 1, NULL, NULL),
('Simple Scrambled Eggs', 'Classic breakfast.', '1. Crack eggs in bowl, add water, whisk. 2. Heat pan with oil. 3. Pour eggs, stir gently. 4. Add salt.', 1, NULL, NULL);

-- 5. Recipe_Tags
-- (Recipe 1 'Grilled Chicken' -> Fresh Protein, Quick)
INSERT INTO Recipe_Tags (recipe_id, tag_id) VALUES
(1, 3), (1, 5),
-- (Recipe 2 'GF Grilled Chicken' -> Fresh Protein, Quick)
(2, 3), (2, 5),
-- (Recipe 3 'Backpacker Wrap' -> Lightweight, No-Cook, Vegetarian, Quick)
(3, 1), (3, 2), (3, 4), (3, 5),
-- (Recipe 4 'Scrambled Eggs' -> Fresh Protein, Vegetarian, Quick)
(4, 3), (4, 4), (4, 5);

-- 6. Recipe_Ingredients
-- Note: unit_id FKs refer to the IDs from the Units inserts
-- (e.g., 1 = 'Gram', 4 = 'Pound', 5 = 'Milliliter', 10 = 'Item')
--
-- Recipe 1: Grilled Chicken (serves 2)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes) VALUES
(1, 1, 1, 4, 'Approx 1-2 breasts'),  -- 1 lb Chicken Breast
(1, 5, 15, 5, 'For grilling'),      -- 15 mL Olive Oil
(1, 7, 3, 1, 'or to taste');         -- 3 g Table Salt

-- Recipe 2: GF Grilled Chicken (variant)
-- (Uses same ingredients, but instructions note GF seasoning)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes) VALUES
(2, 1, 1, 4, 'Approx 1-2 breasts'),  -- 1 lb Chicken Breast
(2, 5, 15, 5, 'For grilling'),      -- 15 mL Olive Oil
(2, 7, 3, 1, 'Use GF blend');       -- 3 g Table Salt

-- Recipe 3: Backpacker Peanut Butter Wrap (serves 1)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes) VALUES
(3, 9, 1, 10, 'Large 10-inch'),      -- 1 Flour Tortilla
(3, 4, 60, 1, 'Approx 2 tbsp');      -- 60 g Peanut Butter

-- Recipe 4: Simple Scrambled Eggs (serves 1)
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit_id, notes) VALUES
(4, 6, 3, 10, NULL),                 -- 3 Large Eggs
(4, 8, 15, 5, 'or milk'),           -- 15 mL Water
(4, 5, 5, 5, 'for the pan'),         -- 5 mL Olive Oil
(4, 7, 1, 1, 'to taste');            -- 1 g Table Salt
