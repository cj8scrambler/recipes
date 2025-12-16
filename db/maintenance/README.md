# Database Maintenance Scripts

This directory contains SQL scripts for database maintenance tasks, troubleshooting, and cleanup operations.

## Scripts

### cleanup_orphaned_recipe_ingredients.sql

**Purpose:** Identifies and cleans up orphaned Recipe_Ingredients records that prevent ingredient deletion.

**When to use:**
- When you get an error like: `Duplicate entry 'Ingredient Name' for key 'Ingredients.name'`
- When you can't delete an ingredient even though it doesn't appear in the UI
- When you get foreign key constraint errors (#1451) when trying to delete ingredients manually
- After UI operations that claim success but leave database records behind

**Problem scenario:**
1. User deletes ingredient from UI
2. UI shows success, but database still has the ingredient
3. Recipe_Ingredients table still references the ingredient
4. Foreign key constraint prevents actual deletion
5. User can't re-add the ingredient (duplicate key error)
6. User can't manually delete (foreign key error)

**Solution steps:**
1. **Backup your database first!**
   ```bash
   mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Identify the problem:**
   ```bash
   mysql -u username -p database_name < db/maintenance/cleanup_orphaned_recipe_ingredients.sql
   ```
   Run the STEP 1 queries to see what's orphaned.

3. **Clean up the data:**
   - Review the SELECT query results carefully
   - Uncomment the appropriate DELETE statements in STEP 2
   - Execute the cleanup

4. **Verify the fix:**
   Run the STEP 3 queries to confirm cleanup was successful.

**Example for "Instant Rice" issue:**

```sql
-- 1. See which recipes use this ingredient
SELECT 
    r.name as recipe_name,
    ri.quantity,
    u.name as unit_name
FROM Recipe_Ingredients ri
INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
INNER JOIN Recipes r ON ri.recipe_id = r.recipe_id
LEFT JOIN Units u ON ri.unit_id = u.unit_id
WHERE i.name = 'Instant Rice';

-- 2. If you want to force delete, remove from Recipe_Ingredients first
DELETE ri FROM Recipe_Ingredients ri
INNER JOIN Ingredients i ON ri.ingredient_id = i.ingredient_id
WHERE i.name = 'Instant Rice';

-- 3. Then delete the ingredient
DELETE FROM Ingredients WHERE name = 'Instant Rice';

-- 4. Now you can re-add it through the UI
```

## Best Practices

### Before Running Maintenance Scripts

1. **Always backup first:** Database operations cannot be undone
2. **Test on staging:** If you have a staging environment, test there first
3. **Review the queries:** Understand what each query does before executing
4. **Check during low traffic:** Run maintenance during off-peak hours if possible

### After Running Maintenance Scripts

1. **Verify the fix:** Run verification queries to ensure the issue is resolved
2. **Test the application:** Check that the UI operations work correctly
3. **Document the issue:** Note what caused the problem and how you fixed it
4. **Consider prevention:** Evaluate if database schema or backend logic needs updates

## Common Issues

### "Duplicate entry" Error

**Symptom:** Can't add an ingredient because the name already exists, even though it doesn't show in the UI.

**Cause:** Previous deletion attempt failed but UI showed success.

**Fix:** Use `cleanup_orphaned_recipe_ingredients.sql` to remove the orphaned records.

### "Cannot delete or update a parent row" Error (#1451)

**Symptom:** Foreign key constraint prevents deletion of an ingredient.

**Cause:** Recipe_Ingredients table still references the ingredient.

**Fix:** Remove Recipe_Ingredients records first, then delete the ingredient.

### Orphaned Records

**Symptom:** Records in Recipe_Ingredients reference non-existent recipes or ingredients.

**Cause:** Cascade delete rules not configured properly, or manual deletion without checking dependencies.

**Fix:** Use the orphaned records cleanup queries to identify and remove them.

## Future Improvements

The backend code has been updated to:
- Explicitly query Recipe_Ingredients before allowing ingredient deletion
- Return clear error messages when deletion fails due to foreign key constraints
- Properly handle database errors instead of hiding them

This should prevent these issues from occurring in future UI operations.

## Support

If you encounter issues not covered by these scripts:

1. Check the backend logs for detailed error messages
2. Verify your database schema matches the expected structure in `db/db.sql`
3. Ensure foreign key constraints are properly configured
4. Consider whether the schema should use CASCADE delete rules (with caution)

## Related Documentation

- [Database Schema](../db.sql) - Current database structure
- [Migrations](../migrations/) - Schema migration scripts
- [Backend Code](../../backend/app.py) - API endpoints and business logic
