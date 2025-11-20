# Database Migration Instructions

## Recipe Cost Tracking Feature - Database Setup

### Do I Need to Run a Migration?

**YES**, if you want to use the new recipe cost tracking features.

**NO**, if you only want existing recipe browsing features - the application is backward compatible and will work without the migration.

### What Happens If I Don't Run the Migration?

The application will work normally for all existing features:
- ✅ Browse recipes
- ✅ View ingredients
- ✅ Edit recipes (admin)
- ✅ Manage ingredients (admin)
- ✅ User authentication

Cost tracking features will simply not be available:
- ❌ No ingredient price management
- ❌ No recipe cost display
- ❌ Cost-related API endpoints return empty data

### Migration Steps

#### Option 1: Existing Database (Recommended)

If you already have a recipes database set up:

```bash
# Navigate to the db directory
cd db/

# Run the migration
mysql -u your_username -p your_database_name < migration_add_ingredient_prices.sql

# You'll be prompted for your password
```

**Example:**
```bash
mysql -u recipeuser -p recipes < migration_add_ingredient_prices.sql
```

#### Option 2: Fresh Database Setup

If you're setting up a completely new database:

```bash
# 1. Create the database (if not already created)
mysql -u your_username -p -e "CREATE DATABASE your_database_name;"

# 2. Run the base schema
mysql -u your_username -p your_database_name < db/db.sql

# 3. Run the migration for cost tracking
mysql -u your_username -p your_database_name < db/migration_add_ingredient_prices.sql

# 4. (Optional) Load sample data
mysql -u your_username -p your_database_name < db/data.sql
```

**Example:**
```bash
mysql -u root -p -e "CREATE DATABASE recipes;"
mysql -u root -p recipes < db/db.sql
mysql -u root -p recipes < db/migration_add_ingredient_prices.sql
mysql -u root -p recipes < db/data.sql
```

#### Option 3: Docker/Containerized Setup

If using Docker:

```bash
# Copy migration into container
docker cp db/migration_add_ingredient_prices.sql mysql_container:/tmp/

# Execute migration
docker exec -i mysql_container mysql -u root -ppassword recipes < /tmp/migration_add_ingredient_prices.sql
```

### Verification

After running the migration, verify it worked:

```bash
# Check if the table exists
mysql -u your_username -p your_database_name -e "SHOW TABLES LIKE 'Ingredient_Prices';"

# Should output:
# +------------------------------------------+
# | Tables_in_recipes (Ingredient_Prices)    |
# +------------------------------------------+
# | Ingredient_Prices                        |
# +------------------------------------------+

# View the table structure
mysql -u your_username -p your_database_name -e "DESCRIBE Ingredient_Prices;"
```

Expected output:
```
+--------------+---------------+------+-----+-------------------+-------------------+
| Field        | Type          | Null | Key | Default           | Extra             |
+--------------+---------------+------+-----+-------------------+-------------------+
| price_id     | int           | NO   | PRI | NULL              | auto_increment    |
| ingredient_id| int           | NO   | MUL | NULL              |                   |
| price        | decimal(10,2) | NO   |     | NULL              |                   |
| unit_id      | int           | NO   | MUL | NULL              |                   |
| price_note   | varchar(255)  | YES  |     | NULL              |                   |
| created_at   | timestamp     | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at   | timestamp     | YES  |     | CURRENT_TIMESTAMP | DEFAULT_GEN...    |
+--------------+---------------+------+-----+-------------------+-------------------+
```

### Troubleshooting

#### Error: "Table 'Ingredient_Prices' already exists"

This is fine! It means you've already run the migration. You can safely ignore this error or drop and recreate the table if needed:

```bash
mysql -u your_username -p your_database_name -e "DROP TABLE IF EXISTS Ingredient_Prices;"
mysql -u your_username -p your_database_name < db/migration_add_ingredient_prices.sql
```

#### Error: "Access denied"

Check your MySQL credentials and permissions:
```bash
# Verify you can connect
mysql -u your_username -p your_database_name -e "SELECT 1;"

# User needs CREATE TABLE permission
```

#### Error: "Can't find database"

Create the database first:
```bash
mysql -u your_username -p -e "CREATE DATABASE your_database_name;"
```

#### Migration runs but features don't work

1. **Restart the backend server** after running the migration
2. **Clear your browser cache** for the frontend
3. **Check backend logs** for any errors
4. **Verify table exists** using the verification commands above

### Rolling Back (If Needed)

To remove the cost tracking feature:

```bash
# Drop the Ingredient_Prices table
mysql -u your_username -p your_database_name -e "DROP TABLE IF EXISTS Ingredient_Prices;"
```

The application will continue to work without cost tracking features.

### Need Help?

If you encounter issues:
1. Check the backend logs for error messages
2. Verify your MySQL version is 5.7 or higher
3. Ensure your database user has CREATE TABLE privileges
4. Check the database connection string in `backend/.env`

For more information about the cost tracking feature, see:
- `RECIPE_COST_FEATURE.md` - Complete feature documentation
- `USAGE_EXAMPLES.md` - Usage examples and best practices
