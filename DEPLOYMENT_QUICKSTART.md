# Deployment Quick Start Guide

This is a condensed guide for quickly deploying the Recipes application to production. For comprehensive documentation, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Prerequisites

- Linux server (Proxmox instance)
- MySQL database
- Python 3.12+
- Node.js 20+
- Git

## Initial Production Setup

### 1. Clone and Setup (5 minutes)

```bash
# As root or with sudo
useradd -m -s /bin/bash recipes
mkdir -p /opt/recipes
chown recipes:recipes /opt/recipes

# As recipes user
sudo -u recipes bash
cd /opt/recipes
git clone https://github.com/cj8scrambler/recipes.git .
```

### 2. Backend Setup (5 minutes)

```bash
cd /opt/recipes/backend

# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure database connection
cat > .env << EOF
DATABASE_URL=mysql+pymysql://dbuser:dbpass@dbhost:3306/recipes_prod
EOF
chmod 600 .env
```

### 3. Database Initialization (2 minutes)

```bash
# Import schema (first time only)
mysql -u dbuser -p -h dbhost recipes_prod < /opt/recipes/db/db.sql

# Import example data (optional, first time only)
mysql -u dbuser -p -h dbhost recipes_prod < /opt/recipes/db/data.sql

# Initialize migration system
cd /opt/recipes/backend
source .venv/bin/activate
python manage_migrations.py init
```

### 4. Create Admin User (1 minute)

```bash
# Start backend temporarily to create admin user
cd /opt/recipes/backend
source .venv/bin/activate
flask run &
FLASK_PID=$!

# Wait for server to start
sleep 3

# Create admin user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-secure-password","role":"admin"}'

# Stop temporary server
kill $FLASK_PID
```

### 5. Frontend Setup (5 minutes)

```bash
cd /opt/recipes/frontend
npm ci
npm run build
```

### 6. Install Systemd Service (3 minutes)

```bash
# Edit service file with your paths
sudo cp /opt/recipes/deployment/systemd/recipes-backend.service /etc/systemd/system/
sudo nano /etc/systemd/system/recipes-backend.service  # Update User, WorkingDirectory

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable recipes-backend
sudo systemctl start recipes-backend
sudo systemctl status recipes-backend
```

### 7. Setup Nginx (Optional, 10 minutes)

```bash
# Install nginx if needed
sudo apt install nginx

# Configure
sudo cp /opt/recipes/deployment/nginx-example.conf /etc/nginx/sites-available/recipes
sudo nano /etc/nginx/sites-available/recipes  # Update server_name

# Enable and test
sudo ln -s /etc/nginx/sites-available/recipes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Total setup time: ~20-30 minutes**

## Deploying Updates

### Quick Update (1 minute)

```bash
cd /opt/recipes
git pull origin main

cd backend
source .venv/bin/activate
# Apply migration if one exists for this version
python manage_migrations.py list
# python manage_migrations.py apply migrate_X_X_X_to_Y_Y_Y.sql
sudo systemctl restart recipes-backend

cd ../frontend
npm ci
npm run build
```

### Using Deployment Script (30 seconds)

```bash
# Configure deploy.sh first with your server details
./deployment/deploy.sh production v1.2.3
```

## Common Commands

### Database Migrations

```bash
cd /opt/recipes/backend
source .venv/bin/activate

python manage_migrations.py version     # Show current version
python manage_migrations.py list        # List available migration files
python manage_migrations.py apply migrate_1_0_0_to_1_1_0.sql  # Apply specific migration
python manage_migrations.py apply migrate_1_0_0_to_1_1_0.sql --downgrade  # Rollback
```

**Note**: Migrations are generated per release. During development, drop and recreate the database from `db.sql`.

### Service Management

```bash
sudo systemctl status recipes-backend   # Check status
sudo systemctl restart recipes-backend  # Restart service
sudo journalctl -u recipes-backend -f   # View logs (live)
sudo journalctl -u recipes-backend -n 100  # Last 100 log lines
```

### Backup

```bash
cd /opt/recipes
./deployment/backup.sh /var/backups/recipes
```

### Health Check

```bash
# Check if service is running
systemctl is-active recipes-backend

# Test backend endpoint
curl http://localhost:8000/

# Check database connection
mysql -u dbuser -p -h dbhost recipes_prod -e "SELECT COUNT(*) FROM Recipes;"
```

## Rollback

### Quick Rollback (2 minutes)

```bash
cd /opt/recipes
git checkout v1.2.2  # Previous version

cd backend
source .venv/bin/activate
python manage_migrations.py downgrade  # Rollback database
sudo systemctl restart recipes-backend
```

## Creating a New Migration

```bash
# 1. Create migration file
cd /opt/recipes
touch db/migrations/V003_add_new_feature.sql

# 2. Edit file with both upgrade and downgrade SQL
nano db/migrations/V003_add_new_feature.sql

# 3. Test migration
cd backend
source .venv/bin/activate
python manage_migrations.py check
python manage_migrations.py upgrade
```

**Migration file template:**

```sql
-- Migration V003: Description of change
-- Description: More detailed explanation

-- ==== UPGRADE ====
ALTER TABLE TableName ADD COLUMN new_field VARCHAR(100);

-- ==== DOWNGRADE ====
ALTER TABLE TableName DROP COLUMN new_field;
```

## Development Environment Setup

Same as production, but:

1. Use different database: `recipes_dev`
2. Always use example data: Load `db/data.sql` frequently
3. Can use Flask dev server: `flask run` (no systemd needed)
4. Pull latest code frequently: `git pull origin develop`

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u recipes-backend -n 50

# Test manually
cd /opt/recipes/backend
source .venv/bin/activate
gunicorn -c gunicorn.conf.py app:app
```

### Database Connection Failed

```bash
# Test connection
mysql -u dbuser -p -h dbhost recipes_prod

# Verify .env file
cat /opt/recipes/backend/.env
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :8000
sudo kill -9 <PID>
```

### Migration Failed

```bash
# Check current version
python manage_migrations.py version

# Review failed migration
cat db/migrations/V00X_failed.sql

# Force version if needed (CAREFUL!)
python manage_migrations.py force-version V00X
```

## File Locations

```
/opt/recipes/                    # Application root
├── backend/
│   ├── .env                     # Database credentials (DO NOT COMMIT)
│   ├── app.py                   # Flask application
│   └── manage_migrations.py     # Migration tool
├── frontend/
│   └── dist/                    # Built frontend files
├── db/
│   ├── db.sql                   # Base schema
│   ├── data.sql                 # Example data
│   └── migrations/              # Migration files
└── deployment/
    ├── deploy.sh                # Deployment script
    ├── backup.sh                # Backup script
    └── systemd/                 # Service files
```

## Security Checklist

- [ ] `.env` file has restricted permissions (600)
- [ ] Database credentials not in git
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] SSL/TLS enabled
- [ ] Regular backups configured
- [ ] Service running as non-root user
- [ ] Nginx reverse proxy configured
- [ ] Keep dependencies updated

## Daily Operations

```bash
# Morning checks
sudo systemctl status recipes-backend
sudo journalctl -u recipes-backend --since "1 hour ago" | grep -i error

# Deploy update
cd /opt/recipes && git pull && cd backend && \
  source .venv/bin/activate && \
  python manage_migrations.py upgrade && \
  sudo systemctl restart recipes-backend

# Check deployment success
curl http://localhost:8000/
sudo systemctl status recipes-backend
```

## Get Help

- Full documentation: [DEPLOYMENT.md](DEPLOYMENT.md)
- Migration guide: [db/migrations/README.md](db/migrations/README.md)
- CI/CD setup: [deployment/ci-cd-examples/README.md](deployment/ci-cd-examples/README.md)
- Deployment tools: [deployment/README.md](deployment/README.md)

## Quick Reference

| Task | Command |
|------|---------|
| Check version | `python manage_migrations.py version` |
| Apply migrations | `python manage_migrations.py upgrade` |
| Restart service | `sudo systemctl restart recipes-backend` |
| View logs | `sudo journalctl -u recipes-backend -f` |
| Backup database | `./deployment/backup.sh` |
| Deploy update | `./deployment/deploy.sh production v1.2.3` |
| Rollback | `git checkout v1.2.2 && python manage_migrations.py downgrade` |

---

**Need more details?** See the comprehensive [DEPLOYMENT.md](DEPLOYMENT.md) guide.
