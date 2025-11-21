-- Migration V004: Add ingredient price tracking
-- Description: Adds a table for storing multiple price entries per ingredient for different units

-- ==== UPGRADE ====
CREATE TABLE Ingredient_Prices (
    price_id INT PRIMARY KEY AUTO_INCREMENT,
    ingredient_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit_id INT NOT NULL,
    price_note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES Ingredients(ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES Units(unit_id),
    UNIQUE KEY unique_ingredient_unit_price (ingredient_id, unit_id),
    INDEX idx_ingredient_prices_ingredient (ingredient_id)
);

-- ==== DOWNGRADE ====
DROP TABLE IF EXISTS Ingredient_Prices;
