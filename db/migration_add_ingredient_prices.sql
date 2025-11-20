-- Migration: Add Ingredient_Prices table for tracking costs
-- This allows multiple price entries per ingredient, each for a different unit type

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
    -- Ensure only one price per ingredient per unit
    UNIQUE KEY unique_ingredient_unit_price (ingredient_id, unit_id)
);

-- Add index for faster lookups
CREATE INDEX idx_ingredient_prices_ingredient ON Ingredient_Prices(ingredient_id);
