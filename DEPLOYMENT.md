# Deployment Strategy

This document outlines the deployment strategy for the Recipes application, designed for self-hosted Proxmox instances with separate production and development environments.

## Overview

The deployment strategy supports:
- **Production environment**: Running stable code with real user data
- **Development environment**: Running latest code with example/test data only
- **Database versioning**: Automated schema migrations with rollback capability
- **Production-ready server**: WSGI server (Gunicorn) instead of Flask development server
- **User authentication**: Session-based authentication with role-based access control

## Architecture

### Environment Separation

#### Production Environment
- Runs stable, tested code
- Uses production database with real user data
- Deployed via controlled push process
- Runs on production Proxmox instance

#### Development Environment
- Runs latest development code
- Uses separate database with only example data
- Automatically updated from main/development branch
- Runs on development Proxmox instance

### Database Strategy

The application uses a database versioning system to manage schema changes:

1. **Version Tracking**: A `schema_version` table tracks the current database version
2. **Migration Files**: SQL files in `db/migrations/` directory handle schema changes
3. **Automatic Application**: Migrations are applied automatically on application startup
4. **Rollback Support**: Each migration includes both upgrade and downgrade SQL

## Database Migration System

### Schema Version Table

The `schema_version` table tracks the current database version:

```sql
CREATE TABLE IF NOT EXISTS schema_version (
    version INT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migration File Structure

Migration files follow the naming convention: `V{version}_{description}.sql`

Example: `V002_add_user_preferences.sql`

Each migration file contains both upgrade and downgrade SQL:

```sql
-- Migration V002: Add user preferences table
-- Description: Adds a new table for storing user preferences

-- ==== UPGRADE ====
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'light',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ==== DOWNGRADE ====
DROP TABLE IF EXISTS user_preferences;
```

### Creating New Migrations

1. Create a new migration file in `db/migrations/`:
   ```bash
   touch db/migrations/V003_your_description.sql
   ```

2. Add both upgrade and downgrade SQL separated by the markers:
   - `-- ==== UPGRADE ====` (SQL to apply the change)
   - `-- ==== DOWNGRADE ====` (SQL to revert the change)

3. Test the migration:
   ```bash
   cd backend
   python manage_migrations.py check
   ```

## Production Server Setup

### Using Gunicorn (WSGI Server)

For production, use Gunicorn instead of Flask's development server:

1. **Install Gunicorn**:
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn**:
   ```bash
   cd backend
   gunicorn -c gunicorn.conf.py app:app
   ```

3. **Gunicorn Configuration** (`backend/gunicorn.conf.py`):
   - Worker processes: 4
   - Bind address: 0.0.0.0:8000
   - Timeout: 120 seconds
   - Access logs enabled

### Systemd Service (Linux)

For automatic startup and management, use systemd:

1. **Copy service files**:
   ```bash
   sudo cp deployment/systemd/recipes-backend.service /etc/systemd/system/
   sudo cp deployment/systemd/recipes-frontend.service /etc/systemd/system/
   ```

2. **Update service files** with your paths and user

3. **Enable and start**:
   ```bash
   sudo systemctl enable recipes-backend
   sudo systemctl start recipes-backend
   sudo systemctl status recipes-backend
   ```

## Deployment Workflows

### Initial Setup

#### Production Instance

1. **Clone repository**:
   ```bash
   git clone https://github.com/cj8scrambler/recipes.git /opt/recipes
   cd /opt/recipes
   ```

2. **Setup backend**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure database connection**:
   ```bash
   echo "DATABASE_URL=mysql+pymysql://user:pass@dbhost:3306/recipes_prod" > .env
   ```

4. **Initialize database**:
   ```bash
   # Import base schema
   mysql -u user -p -h dbhost recipes_prod < db/db.sql
   
   # Import initial data (if first time)
   mysql -u user -p -h dbhost recipes_prod < db/data.sql
   
   # Initialize versioning (marks current state as V001)
   python manage_migrations.py init
   ```

5. **Create admin user** (for authentication):
   ```bash
   # The application includes session-based authentication
   # Create first admin user via the API after starting the backend:
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your-secure-password","role":"admin"}'
   ```

6. **Setup frontend**:
   ```bash
   cd ../frontend
   npm ci
   npm run build
   ```

7. **Start services**:
   ```bash
   sudo systemctl start recipes-backend
   sudo systemctl start recipes-frontend
   ```

#### Development Instance

Same as production, but:
- Use different database: `recipes_dev`
- Always use example data: `db/data.sql`
- Can use Flask development server: `flask run`
- Optional: Set up auto-deployment from git

### Pushing Code to Production

#### Option 1: Manual Deployment (Recommended for Small Teams)

1. **Test in development first**:
   ```bash
   # On dev instance
   cd /opt/recipes
   git pull origin main
   cd backend
   source .venv/bin/activate
   python manage_migrations.py check  # Check for pending migrations
   python manage_migrations.py upgrade  # Apply migrations
   flask run  # Test the application
   ```

2. **Deploy to production**:
   ```bash
   # SSH to production instance
   ssh production-server
   
   cd /opt/recipes
   git pull origin main  # Or specific tag/release
   
   # Apply migrations
   cd backend
   source .venv/bin/activate
   python manage_migrations.py check
   python manage_migrations.py upgrade
   
   # Restart services
   sudo systemctl restart recipes-backend
   
   # Update frontend if needed
   cd ../frontend
   npm ci
   npm run build
   sudo systemctl restart recipes-frontend
   ```

#### Option 2: Automated Deployment Script

Use the provided deployment script:

```bash
# On your local machine or CI/CD server
./deployment/deploy.sh production v1.2.3
```

The script will:
- SSH to the production server
- Pull the specified version
- Apply database migrations
- Build frontend
- Restart services
- Verify deployment

#### Option 3: CI/CD Pipeline (Advanced)

Set up automated deployments using GitHub Actions, GitLab CI, or Jenkins:

1. Commit to `main` branch triggers tests
2. Create a release tag (e.g., `v1.2.3`)
3. CI/CD automatically deploys to production
4. Includes automated rollback on failure

See `deployment/ci-cd-examples/` for sample configurations.

### Rolling Back Changes

If a deployment causes issues:

1. **Quick rollback** (revert to previous git version):
   ```bash
   cd /opt/recipes
   git checkout v1.2.2  # Previous working version
   
   cd backend
   source .venv/bin/activate
   python manage_migrations.py downgrade  # Revert migrations
   sudo systemctl restart recipes-backend
   ```

2. **Database rollback only** (if code is fine but schema change failed):
   ```bash
   cd /opt/recipes/backend
   source .venv/bin/activate
   python manage_migrations.py downgrade --target V005  # Revert to specific version
   ```

3. **Full system restore** (worst case):
   - Restore database from backup
   - Checkout last known good version
   - Restart services

### Migration Management Commands

```bash
# Check current database version
python manage_migrations.py version

# Check for pending migrations
python manage_migrations.py check

# Apply all pending migrations
python manage_migrations.py upgrade

# Rollback to previous version
python manage_migrations.py downgrade

# Rollback to specific version
python manage_migrations.py downgrade --target V003

# Initialize versioning system (one-time)
python manage_migrations.py init
```

## Best Practices

### Development Workflow

1. **Make changes** in feature branch
2. **Create migration** if schema changes needed
3. **Test locally** with example data
4. **Test in dev environment** with dev database
5. **Create pull request** and review
6. **Merge to main** after approval
7. **Deploy to production** using deployment script

### Database Changes

1. **Always create migration files** for schema changes
2. **Test both upgrade and downgrade** SQL
3. **Keep migrations small** and focused
4. **Never modify applied migrations** - create new ones
5. **Backup database** before major migrations

### Version Control

1. **Tag releases**: `git tag -a v1.2.3 -m "Release 1.2.3"`
2. **Use semantic versioning**: MAJOR.MINOR.PATCH
3. **Keep changelog**: Document changes in each version
4. **Production deploys from tags**, not branches

### Monitoring

1. **Check application logs**: `journalctl -u recipes-backend -f`
2. **Monitor database**: Watch for slow queries, connection issues
3. **Set up alerts**: For service failures, errors
4. **Regular backups**: Automated database backups

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u recipes-backend -n 50

# Check if port is in use
sudo netstat -tlnp | grep 8000

# Verify configuration
cd /opt/recipes/backend
source .venv/bin/activate
python -c "from app import app; print('Config OK')"
```

### Migration fails

```bash
# Check current version
python manage_migrations.py version

# Review migration file
cat db/migrations/V00X_failing_migration.sql

# Try manual SQL if needed
mysql -u user -p -h dbhost recipes_prod < fix.sql

# Force version update (use with caution)
python manage_migrations.py force-version V00X
```

### Database connection issues

```bash
# Test connection
mysql -u user -p -h dbhost recipes_prod

# Verify .env file
cat backend/.env

# Check firewall
sudo ufw status
```

## Security Considerations

1. **Database credentials**: Store in `.env` file, never commit
2. **File permissions**: Restrict `.env` to owner only (`chmod 600`)
3. **Firewall rules**: Only allow necessary ports
4. **Regular updates**: Keep dependencies updated
5. **SSL/TLS**: Use HTTPS for production (reverse proxy)
6. **Backup encryption**: Encrypt database backups

## Additional Resources

- **Gunicorn Documentation**: https://docs.gunicorn.org/
- **Systemd Service Management**: `man systemd.service`
- **MySQL Backup**: `mysqldump` documentation
- **Nginx Reverse Proxy**: See `deployment/nginx-example.conf`
