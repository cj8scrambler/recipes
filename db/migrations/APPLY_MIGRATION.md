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

## Troubleshooting

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
