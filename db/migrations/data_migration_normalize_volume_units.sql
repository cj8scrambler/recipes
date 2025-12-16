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
-- Use ORDER BY for deterministic results in case multiple base Volume units exist
SET @milliliter_unit_id = (SELECT unit_id FROM Units WHERE category = 'Volume' AND base_conversion_factor = 1.0 ORDER BY unit_id LIMIT 1);

-- Step 2: Validate that a base Volume unit was found
SELECT CASE 
    WHEN @milliliter_unit_id IS NULL THEN 'ERROR: No base Volume unit found (category=Volume, base_conversion_factor=1.0). Migration aborted.'
    ELSE CONCAT('Base Volume unit found: unit_id = ', @milliliter_unit_id)
END AS validation_status;

-- Step 3: Update Recipe_Ingredients using Dry Volume or Liquid Volume units
-- Convert quantity to base unit (milliliters) and update unit_id
-- Only proceed if base unit was found
UPDATE Recipe_Ingredients ri
INNER JOIN Units u ON ri.unit_id = u.unit_id
SET 
    ri.quantity = ri.quantity * u.base_conversion_factor,
    ri.unit_id = @milliliter_unit_id
WHERE 
    u.category IN ('Dry Volume', 'Liquid Volume')
    AND u.base_conversion_factor IS NOT NULL
    AND @milliliter_unit_id IS NOT NULL;
SET @rows_affected = ROW_COUNT();

-- Display summary of changes
SELECT @rows_affected as rows_normalized;


-- ==== DOWNGRADE ====
-- Downgrade is not supported for this data migration.
-- 
-- Reason: We cannot reliably reverse the conversion because we don't track which 
-- original subcategory (Dry Volume vs Liquid Volume) each ingredient used.
-- 
-- If rollback is needed, restore from database backup taken before migration.
