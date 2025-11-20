# Database Migrations

This directory contains versioned SQL migration files for the Recipes application.

## Migration File Format

Migration files follow the naming convention: `V{version}_{description}.sql`

- `{version}`: Zero-padded 3-digit version number (e.g., 002, 003, 010)
- `{description}`: Snake_case description of the migration

Example: `V002_add_default_unit.sql`

## Migration File Structure

Each migration file must contain both upgrade and downgrade SQL, separated by markers:

```sql
-- Migration V002: Add default_unit_id to Ingredients table
-- Description: This field stores the default unit for an ingredient

-- ==== UPGRADE ====
ALTER TABLE Ingredients ADD COLUMN default_unit_id INT;
ALTER TABLE Ingredients ADD CONSTRAINT fk_default_unit 
    FOREIGN KEY (default_unit_id) REFERENCES Units(unit_id);

-- ==== DOWNGRADE ====
ALTER TABLE Ingredients DROP FOREIGN KEY fk_default_unit;
ALTER TABLE Ingredients DROP COLUMN default_unit_id;
```

## Creating a New Migration

1. Determine the next version number:
   ```bash
   cd backend
   python manage_migrations.py version
   ```

2. Create the migration file:
   ```bash
   touch db/migrations/V003_your_description.sql
   ```

3. Add upgrade and downgrade SQL with proper markers

4. Test the migration:
   ```bash
   python manage_migrations.py check
   python manage_migrations.py upgrade
   python manage_migrations.py downgrade
   python manage_migrations.py upgrade  # Verify it works both ways
   ```

## Migration Guidelines

### DO:
- Keep migrations small and focused
- Test both upgrade and downgrade paths
- Include descriptive comments
- Use proper SQL formatting
- Test on dev environment before production

### DON'T:
- Modify existing migration files after they've been applied
- Include data modifications that could fail (use separate data migrations)
- Use database-specific syntax if possible (stay portable)
- Forget to handle existing data when adding NOT NULL constraints

## Common Migration Patterns

### Adding a Column
```sql
-- ==== UPGRADE ====
ALTER TABLE TableName ADD COLUMN new_column VARCHAR(100);

-- ==== DOWNGRADE ====
ALTER TABLE TableName DROP COLUMN new_column;
```

### Adding a Column with Default
```sql
-- ==== UPGRADE ====
ALTER TABLE TableName ADD COLUMN new_column VARCHAR(100) DEFAULT 'default_value';

-- ==== DOWNGRADE ====
ALTER TABLE TableName DROP COLUMN new_column;
```

### Creating a New Table
```sql
-- ==== UPGRADE ====
CREATE TABLE NewTable (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==== DOWNGRADE ====
DROP TABLE IF EXISTS NewTable;
```

### Adding Foreign Key
```sql
-- ==== UPGRADE ====
ALTER TABLE ChildTable 
    ADD CONSTRAINT fk_parent 
    FOREIGN KEY (parent_id) 
    REFERENCES ParentTable(id);

-- ==== DOWNGRADE ====
ALTER TABLE ChildTable DROP FOREIGN KEY fk_parent;
```

### Adding Index
```sql
-- ==== UPGRADE ====
CREATE INDEX idx_column_name ON TableName(column_name);

-- ==== DOWNGRADE ====
DROP INDEX idx_column_name ON TableName;
```

### Modifying Column Type
```sql
-- ==== UPGRADE ====
ALTER TABLE TableName MODIFY COLUMN column_name TEXT;

-- ==== DOWNGRADE ====
ALTER TABLE TableName MODIFY COLUMN column_name VARCHAR(255);
```

## Version History

- V001: Initial schema (base from db.sql)
- V002: Add default_unit_id to Ingredients table

## Troubleshooting

### Migration fails during upgrade
1. Check the error message in the output
2. Review the SQL in the migration file
3. Test the SQL manually in MySQL
4. Fix the migration file or database state
5. Use `force-version` if needed (last resort)

### Migration fails during downgrade
1. Ensure downgrade SQL is the exact opposite of upgrade
2. Check for data that might prevent the rollback
3. May need to manually fix database state

### Need to skip a migration
Don't skip migrations. Instead:
1. Create a new migration that undoes the problematic one
2. Or fix the migration and apply it properly

### Applied migration with wrong SQL
1. Create a new migration to fix the issue
2. Don't modify the existing migration file
3. The new migration becomes part of the version history
