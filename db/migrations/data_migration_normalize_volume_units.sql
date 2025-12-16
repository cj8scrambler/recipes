-- Data Migration: Normalize Volume Subcategory Units
-- Generated: 2025-12-16
-- 
-- This migration normalizes Recipe_Ingredients that use volume subcategory units
-- (Dry Volume or Liquid Volume) to use the base Volume unit (Milliliter).
-- 
-- This addresses the issue where recipes created before the frontend fix might have
-- stored ingredients in Dry Volume or Liquid Volume units instead of the normalized
-- base Volume unit, which could cause cost calculation inconsistencies.
--
-- NOTE: This migration is idempotent - it can be run multiple times safely.
-- Recipe ingredients already using base Volume units (Milliliter) will not be affected.

-- ==== UPGRADE ====
-- Normalize volume subcategory units to base Volume unit

-- Step 1: Get the unit_id for Milliliter (base Volume unit)
SET @milliliter_unit_id = (SELECT unit_id FROM Units WHERE category = 'Volume' AND base_conversion_factor = 1.0 LIMIT 1);

-- Step 2: Update Recipe_Ingredients using Dry Volume or Liquid Volume units
-- Convert quantity to base unit (milliliters) and update unit_id
UPDATE Recipe_Ingredients ri
INNER JOIN Units u ON ri.unit_id = u.unit_id
SET 
    ri.quantity = ri.quantity * u.base_conversion_factor,
    ri.unit_id = @milliliter_unit_id
WHERE 
    u.category IN ('Dry Volume', 'Liquid Volume')
    AND u.base_conversion_factor IS NOT NULL
    AND @milliliter_unit_id IS NOT NULL;

-- Display summary of changes (number of rows actually modified by the UPDATE)
SELECT ROW_COUNT() as rows_normalized;


-- ==== DOWNGRADE ====
-- Downgrade is not supported for this data migration.
-- 
-- Reason: We cannot reliably reverse the conversion because we don't track which 
-- original subcategory (Dry Volume vs Liquid Volume) each ingredient used.
-- 
-- If rollback is needed, restore from database backup taken before migration.
