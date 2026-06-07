-- Migration from v1.1.0 to v1.2.0
-- Add density field to Ingredients for volume<->weight conversion
--
-- density (g/mL) allows calculating weight when a recipe specifies an ingredient
-- by volume but the ingredient's default unit is weight (or vice versa).
-- NULL means no density data available; weight calculation will return has_weight:False
-- for ingredients that need it.
--
-- To downgrade:
--   ALTER TABLE Ingredients DROP COLUMN density;

ALTER TABLE Ingredients ADD COLUMN density DECIMAL(8, 4) NULL AFTER weight;
