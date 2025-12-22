# Deployment Strategy

This document outlines the deployment strategy for the Recipes application, designed for self-hosting instances with separate production and development environments.

## Taggging a release
```bash
OLD_TAG=v1.0.0
NEW_TAG=v1.1.0
git fetch --prune --prune-tags
git tag -a ${NEW_TAG} -m "Temporary ${NEW_TAG} tag"
cd db/
python3 generate_migration.py --from-tag ${OLD_TAG} --to-tag ${NEW_TAG}
# Verify file is good; manually integrat any table alterations
git add migrations/migrate_${OLD_TAG//./_}_to_${NEW_TAG//./_}.sql
git commit -m "DB migrate ${OLD} -> ${NEW_TAG}"
git tag -d ${NEW_TAG}
git tag -a ${NEW_TAG} -m "Release ${NEW_TAG}"
git push --tags origin HEAD:main
```

## Deploying a release
```bash
CURRENT_TAG=v1.0.0
NEW_TAG=v1.1.0
git checkout ${NEW_TAG}

pushd db
python3 manage_migrations.py apply migrate_${CURRENT_TAG//./_}_to_${NEW_TAG//./_}.sql
popd

pushd docker/
./tag_docker.sh
docker compose down
docker compose build
docker compuse up -d
popd
```

## Overview

The deployment strategy supports:
- **Production environment**: Running stable code with real user data
- **Development environment**: Running latest code with example/test data only
- **Database versioning**: Automated schema migrations with rollback capability
- **Production-ready server**: WSGI server (Gunicorn) instead of Flask development server
- **User authentication**: Session-based authentication with role-based access control

## Architecture

### Database Strategy

The application uses a database versioning system to manage schema changes:

1. **Version Tracking**: A `schema_version` table tracks the current database version
2. **Migration Files**: SQL files in `db/migrations/` directory handle schema changes
3. **Automatic Application**: Migrations are applied automatically on application startup
4. **Rollback Support**: Each migration includes both upgrade and downgrade SQL

## Database Migration System

This project uses a **tag-based migration approach** where migrations are automatically generated between releases.

### Key Principles

1. **`db/db.sql` is the source of truth** - All schema changes are made directly to this file
2. **During development** - Drop and recreate the database from `db.sql` and `data.sql`
3. **At release time** - Generate a single migration file that captures all changes since the previous release
4. **One migration per release** - Each migration upgrades from one tagged version to another

#### Creating a Release

When preparing a new release (e.g., v1.1.0 from v1.0.0):

1. Ensure all schema changes are committed to `db/db.sql`
2. Generate migration file:
   ```bash
   cd db/
   python generate_migration.py --from-tag v1.0.0 --to-tag HEAD
   ```
3. Review `migrations/migrate_1_0_0_to_1_1_0.sql`
4. Edit to add any manual ALTER TABLE statements needed
5. Test the migration on a staging database
6. Commit the migration file
7. Tag the release: `git tag -a v1.1.0 -m "Release 1.1.0"`
8. Push: `git push --follow-tags`

### Migration File Structure

Migration files follow the naming convention: `migrate_{from_version}_to_{to_version}.sql`

Example: `migrate_1_0_0_to_1_1_0.sql`

```sql
-- Migration from v1.0.0 to v1.1.0
-- Generated: 2024-01-15 10:30:00

-- ==== UPGRADE ====
CREATE TABLE new_feature (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

-- ==== DOWNGRADE ====
DROP TABLE IF EXISTS new_feature;
```

### Applying Migrations

To apply a migration in production:

```bash
# Using migration management script
cd backend
python manage_migrations.py apply migrate_1_0_0_to_1_1_0.sql

# Or directly with MySQL
mysql -u user -p -h dbhost recipes_prod < db/migrations/migrate_1_0_0_to_1_1_0.sql
```

To rollback:

```bash
python manage_migrations.py apply migrate_1_0_0_to_1_1_0.sql --downgrade
```
