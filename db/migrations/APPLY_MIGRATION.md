# How to Apply Migration v0.7.0 to v0.7.1

This migration removes the unique constraint on `Recipe_List_Items` to allow recipes to be added to lists multiple times.

## Quick Start

If you're running the app with default settings (MySQL database named `recipes`):

```bash
mysql -u myusername -p recipes < db/migrations/migrate_v0_7_0_to_v0_7_1.sql
```

Replace `myusername` with your MySQL username. You'll be prompted for your password.

## Detailed Instructions

### Step 1: Identify Your Database Connection Details

You need:
- Database host (e.g., `localhost`, `db.provider.com`)
- Database name (e.g., `recipes`)
- Username (e.g., `myusername`)
- Password

These are the same credentials you used in your `backend/.env` file.

### Step 2: Apply the Migration

```bash
# From the repository root directory
mysql -u USERNAME -p -h HOSTNAME DATABASE_NAME < db/migrations/migrate_v0_7_0_to_v0_7_1.sql
```

Example:
```bash
mysql -u myuser -p -h localhost recipes < db/migrations/migrate_v0_7_0_to_v0_7_1.sql
```

### Step 3: Verify the Migration

Check that the unique constraint has been removed:

```sql
SHOW INDEX FROM Recipe_List_Items WHERE Key_name = 'unique_list_recipe';
```

This should return **no rows** if the migration was successful.

## Verify Migration Was Applied

After running the migration, verify it worked:

```bash
mysql -u USERNAME -p DATABASE_NAME < db/migrations/VERIFY_MIGRATION.sql
```

The output should **NOT** show any row with `index_name = 'unique_list_recipe'`. If you see that index, the migration didn't apply correctly.

## Troubleshooting

### Still Getting "Duplicate entry" Error After Migration

If you ran the migration but still get errors like:
```
(pymysql.err.IntegrityError) (1062, "Duplicate entry '1-12' for key 'Recipe_List_Items.unique_list_recipe'")
```

**First, verify the constraint still exists:**
```bash
mysql -u USERNAME -p DATABASE_NAME < db/migrations/VERIFY_MIGRATION.sql
```

If you see `unique_list_recipe` in the output, the constraint is still there. Try these solutions:

#### Solution 1: Run SQL command directly in MySQL
Connect to MySQL and run the command manually:

```bash
mysql -u USERNAME -p DATABASE_NAME
```

Then in the MySQL prompt:
```sql
ALTER TABLE Recipe_List_Items DROP INDEX unique_list_recipe;
```

You should see "Query OK, 0 rows affected". Then type `exit` to quit MySQL.

#### Solution 2: Use the force drop script
```bash
mysql -u USERNAME -p DATABASE_NAME < db/migrations/FORCE_DROP_CONSTRAINT.sql
```

#### Solution 3: Try the alternative direct migration
```bash
mysql -u USERNAME -p DATABASE_NAME < db/migrations/migrate_v0_7_0_to_v0_7_1_direct.sql
```

**Check you're using the correct database:**
```sql
-- Connect to MySQL and run:
SELECT DATABASE();
```
Make sure this matches the database your app is using (check `backend/.env` file).

**After successful constraint removal:**

1. Verify the constraint is gone:
```bash
mysql -u USERNAME -p DATABASE_NAME < db/migrations/VERIFY_MIGRATION.sql
```
The output should NOT show `unique_list_recipe`.

2. Restart your backend application:
```bash
# Stop the backend (Ctrl+C)
# Then restart it:
cd backend
. .venv/bin/activate
flask run
```

SQLAlchemy may cache table metadata, so restarting is required.

### Error: "Access denied"
- Check your username and password
- Ensure your user has ALTER privileges on the database

### Error: "Table doesn't exist"
- Make sure you're connected to the correct database
- Check that `Recipe_List_Items` table exists: `SHOW TABLES LIKE 'Recipe_List_Items';`

### Migration Already Applied
If the constraint doesn't exist, the migration will output:
```
Index does not exist
```
This is safe - it means the constraint has already been removed.

## Rolling Back (Downgrade)

⚠️ **WARNING**: You can only rollback if you don't have duplicate recipes in any lists.

To rollback to v0.7.0 (re-add the unique constraint):

```bash
# Extract and run only the DOWNGRADE section
sed -n '/==== DOWNGRADE ====/,$ p' db/migrations/migrate_v0_7_0_to_v0_7_1.sql | mysql -u USERNAME -p DATABASE_NAME
```

If you have duplicates, see the instructions in the migration file for cleaning them up first.
