-- Migration from v1.2.0 to v1.3.0
-- Add admin_notes field to Recipes for admin-only free-form notes

-- ==== UPGRADE ====

ALTER TABLE Recipes ADD COLUMN admin_notes TEXT NULL;

-- ==== DOWNGRADE ====

ALTER TABLE Recipes DROP COLUMN admin_notes;
