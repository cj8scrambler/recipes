# Database Migrations

This directory contains versioned SQL migration files for the Recipes application.

## Migration Strategy

This project uses a **tag-based migration approach** where migrations are generated automatically from git tag differences.

### Key Concepts

1. **db.sql is the source of truth**: All schema changes are made directly to `db/db.sql`
2. **Development**: During development, developers drop and recreate the database using `db.sql` and `data.sql`
3. **Releases**: When a release is tagged, a migration file is generated that captures changes since the previous tag
4. **One migration per release**: Each migration file upgrades from one tagged version to another

## Workflow

### During Development (Between Releases)

When making database schema changes:

1. Edit `db/db.sql` directly with your schema changes
2. Optionally update `db/data.sql` if sample data needs changes
3. Drop and recreate your development database:
   ```bash
   mysql -u user -p -h dbhost recipes_dev -e "DROP DATABASE IF EXISTS recipes_dev; CREATE DATABASE recipes_dev;"
   mysql -u user -p -h dbhost recipes_dev < db/db.sql
   mysql -u user -p -h dbhost recipes_dev < db/data.sql
   ```

**No migration files are created during development.**

### Creating a Release

When creating a new release (e.g., v1.1.0 from v1.0.0):

1. Ensure all schema changes are committed to `db/db.sql`
2. Generate migration file:
   ```bash
   cd backend
   python generate_migration.py --from-tag v1.0.0 --to-tag HEAD
   ```
3. Review the generated migration file in `db/migrations/migrate_1_0_0_to_1_1_0.sql`
4. Edit the migration file to add any manual ALTER TABLE statements needed
5. Test the migration on a development database
6. Commit the migration file
7. Tag the release: `git tag -a v1.1.0 -m "Release 1.1.0"`
8. Push with tags: `git push --follow-tags`

### Applying Migrations in Production

When deploying a new release to production:

```bash
# The migration file name tells you what versions it migrates between
mysql -u user -p -h dbhost recipes_prod < db/migrations/migrate_1_0_0_to_1_1_0.sql
```

Or use the deployment script which applies migrations automatically:
```bash
./deployment/deploy.sh production v1.1.0
```

### Rolling Back

To rollback from v1.1.0 to v1.0.0:

```bash
# Extract DOWNGRADE section from migration file
sed -n '/==== DOWNGRADE ====/,$ p' db/migrations/migrate_1_0_0_to_1_1_0.sql | mysql -u user -p -h dbhost recipes_prod
```

## Migration File Format

Migration files follow the naming convention: `migrate_{from_version}_to_{to_version}.sql`

Example: `migrate_1_0_0_to_1_1_0.sql`

Each migration file contains:

```sql
-- Migration from v1.0.0 to v1.1.0
-- Generated: 2024-01-15 10:30:00

-- ==== UPGRADE ====
-- Upgrade from v1.0.0 to v1.1.0

CREATE TABLE new_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

ALTER TABLE existing_table ADD COLUMN new_field VARCHAR(100);

-- ==== DOWNGRADE ====
-- Downgrade from v1.1.0 to v1.0.0

ALTER TABLE existing_table DROP COLUMN new_field;

DROP TABLE IF EXISTS new_table;
```

## Initial Setup (v1.0.0)

For the initial release (v1.0.0), no migration file is needed. Simply:

```bash
mysql -u user -p -h dbhost recipes_prod < db/db.sql
mysql -u user -p -h dbhost recipes_prod < db/data.sql
```

This establishes the baseline schema that future migrations will build upon.

## Automated Migration Generation

The `backend/generate_migration.py` script:

1. Compares `db/db.sql` between two git tags
2. Detects new tables, dropped tables, and modified tables
3. Generates appropriate CREATE TABLE and DROP TABLE statements
4. Flags modified tables for manual review (ALTER TABLE statements)
5. Creates both upgrade and downgrade sections

### Limitations

The script can automatically detect:
- ✅ New tables
- ✅ Dropped tables
- ⚠️ Modified tables (flags for manual review)

You must manually add ALTER TABLE statements for:
- Adding/removing/modifying columns
- Adding/removing constraints
- Adding/removing indexes
- Changing column types or properties

## Examples

### Example 1: Adding a New Table

In `db/db.sql`, add:
```sql
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Generate migration:
```bash
python backend/generate_migration.py --from-tag v1.0.0 --to-tag HEAD
```

The script will automatically create the CREATE TABLE and DROP TABLE statements.

### Example 2: Adding a Column

In `db/db.sql`, modify:
```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    settings JSON,
    last_login TIMESTAMP,  -- NEW COLUMN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ...
);
```

Generate migration:
```bash
python backend/generate_migration.py --from-tag v1.0.0 --to-tag HEAD
```

The script will flag the `users` table as modified. You must manually edit the migration file to add:
```sql
-- ==== UPGRADE ====
ALTER TABLE users ADD COLUMN last_login TIMESTAMP AFTER settings;

-- ==== DOWNGRADE ====
ALTER TABLE users DROP COLUMN last_login;
```

## Best Practices

### For Developers

1. **Always update db.sql**: All schema changes go into `db/db.sql`
2. **Drop and recreate**: Don't try to manually ALTER your dev database
3. **Test with fresh database**: Regularly test that db.sql creates a working schema
4. **Document changes**: Add comments to complex schema changes

### For Release Managers

1. **Review generated migrations**: Always review and test before releasing
2. **Add manual ALTER statements**: The script can't generate all ALTER statements
3. **Test upgrade and downgrade**: Test both directions before release
4. **Backup before migration**: Always backup production before applying migrations
5. **Version control migrations**: Commit migration files before tagging

### For Production Deployments

1. **Backup first**: Always backup the database before applying migrations
2. **Test on staging**: Apply migrations to staging environment first
3. **Use provided scripts**: Use deployment scripts that handle migrations
4. **Monitor after upgrade**: Check logs and functionality after migration
5. **Have rollback plan**: Keep backups and test downgrade paths

## Troubleshooting

### Migration generation shows no changes but schema changed

The script only detects table-level changes. Column modifications within tables require manual review. Check the generated migration file for "TODO" comments.

### Need to rollback but migration file is complex

1. Restore from database backup (safest option)
2. Or extract and run the DOWNGRADE section carefully
3. Always test rollback on staging first

### Migration fails during production deployment

1. Check error message in logs
2. Verify migration was tested on staging
3. Check for data conflicts (e.g., adding NOT NULL column with existing rows)
4. Rollback using backup if needed
5. Fix migration and create a new release

### Development database out of sync

Simply drop and recreate from db.sql:
```bash
mysql -u user -p recipes_dev -e "DROP DATABASE recipes_dev; CREATE DATABASE recipes_dev;"
mysql -u user -p recipes_dev < db/db.sql
mysql -u user -p recipes_dev < db/data.sql
```

## Migration vs db.sql

| Aspect | db.sql | Migration Files |
|--------|--------|-----------------|
| Purpose | Full schema definition | Delta between versions |
| When used | Initial setup, development | Production upgrades |
| Updated | Every schema change | Only at release time |
| Generated | Manually maintained | Auto-generated from git diff |
| Contains | Complete schema | Only changes |

## Version History

- v1.0.0: Initial schema (baseline)
- Future releases will have migration files generated automatically

## See Also

- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Full deployment guide
- [generate_migration.py](../../backend/generate_migration.py) - Migration generation script
- [db.sql](../db.sql) - Current schema definition
