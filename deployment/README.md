# Deployment Files

This directory contains deployment configuration files and scripts for the Recipes application.

## Contents

### Scripts

- **deploy.sh** - Automated deployment script for pushing updates to production, staging, or development environments

### Configuration

- **config/** - Environment-specific configuration files (production, development, staging)
  - See [config/README.md](config/README.md) for setup instructions
  - Copy `.conf.example` files to `.conf` and customize

### Systemd Service Files

- **systemd/recipes-backend.service** - Systemd service configuration for the backend (Gunicorn)
- **systemd/recipes-frontend.service** - Systemd service configuration for the frontend (optional)

### Configuration Examples

- **nginx-example.conf** - Example Nginx reverse proxy configuration with SSL support
- **nginx-frontend.conf** - Nginx configuration for frontend Docker container

## Quick Start

### 1. Initial Server Setup

On your Proxmox instance (production or development):

```bash
# Create application user
sudo useradd -m -s /bin/bash recipes

# Install dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip nodejs npm mysql-client nginx

# Clone repository
sudo mkdir -p /opt/recipes
sudo chown recipes:recipes /opt/recipes
sudo -u recipes git clone https://github.com/cj8scrambler/recipes.git /opt/recipes
```

### 2. Setup Backend

```bash
cd /opt/recipes/backend
sudo -u recipes python3 -m venv .venv
sudo -u recipes .venv/bin/pip install -r requirements.txt

# Configure database connection
sudo -u recipes bash -c 'echo "DATABASE_URL=mysql+pymysql://user:pass@dbhost:3306/recipes" > .env'

# Initialize database
mysql -u user -p -h dbhost recipes < /opt/recipes/db/db.sql
mysql -u user -p -h dbhost recipes < /opt/recipes/db/data.sql

# Initialize migration system
sudo -u recipes .venv/bin/python manage_migrations.py init
```

### 3. Setup Frontend

```bash
cd /opt/recipes/frontend
sudo -u recipes npm ci
sudo -u recipes npm run build
```

### 4. Install Systemd Services

```bash
# Copy service files
sudo cp /opt/recipes/deployment/systemd/recipes-backend.service /etc/systemd/system/

# Edit service file to match your setup (update User, Group, WorkingDirectory)
sudo nano /etc/systemd/system/recipes-backend.service

# Reload systemd and enable services
sudo systemctl daemon-reload
sudo systemctl enable recipes-backend
sudo systemctl start recipes-backend

# Check status
sudo systemctl status recipes-backend
```

### 5. Setup Nginx (Optional but Recommended)

```bash
# Copy and customize nginx config
sudo cp /opt/recipes/deployment/nginx-example.conf /etc/nginx/sites-available/recipes
sudo nano /etc/nginx/sites-available/recipes  # Update server_name and paths

# Enable site
sudo ln -s /etc/nginx/sites-available/recipes /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 6. Setup SSL with Let's Encrypt (Optional)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d recipes.example.com
```

## Deployment Workflows

### Setup Configuration (First Time)

Before using the deployment script, create your environment configuration:

```bash
# Create production config
cd deployment/config
cp production.conf.example production.conf
nano production.conf
```

Edit with your actual values:
```bash
DEPLOY_HOST="your-server.example.com"
DEPLOY_USER="recipes"
DEPLOY_PATH="/opt/recipes"
SERVICE_NAME="recipes-backend"
```

**Note**: Configuration files (without `.example` suffix) are excluded from git for security.

### Deploying to Production

Before deploying to production:

1. **Test in development environment first**
2. **Tag the release**: `git tag -a v1.2.3 -m "Release 1.2.3"`
3. **Push tags**: `git push origin v1.2.3`

Then deploy:

```bash
# From your local machine
cd /opt/recipes/deployment
./deploy.sh production v1.2.3
```

The script will:
- Load configuration from `config/production.conf`
- SSH to the server
- Pull the specified version
- Apply migrations
- Restart services

### Manual Deployment

If you prefer manual deployment:

```bash
# SSH to server
ssh recipes@production.example.com

# Pull latest code
cd /opt/recipes
git pull origin main  # or: git checkout v1.2.3

# Update backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage_migrations.py upgrade
sudo systemctl restart recipes-backend

# Update frontend
cd ../frontend
npm ci
npm run build
```

### Rollback

To rollback to a previous version:

```bash
# On production server
cd /opt/recipes
git checkout v1.2.2  # Previous version

cd backend
source .venv/bin/activate
python manage_migrations.py downgrade  # Rollback database changes
sudo systemctl restart recipes-backend
```

## Customizing deploy.sh

Edit the `deploy.sh` script to configure your server details:

```bash
# Edit these lines in deploy.sh
production)
    DEPLOY_HOST="your-production-server.com"  # Your server hostname/IP
    DEPLOY_USER="recipes"                      # Your deployment user
    DEPLOY_PATH="/opt/recipes"                 # Installation path
    SERVICE_NAME="recipes-backend"             # Systemd service name
    ;;
```

### SSH Key Setup

For automated deployments, set up SSH key authentication:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "deployment@recipes"
ssh-copy-id recipes@production.example.com

# Test connection
ssh recipes@production.example.com
```

## Monitoring and Logs

### View Backend Logs

```bash
# Real-time logs
sudo journalctl -u recipes-backend -f

# Last 100 lines
sudo journalctl -u recipes-backend -n 100

# Logs since yesterday
sudo journalctl -u recipes-backend --since yesterday
```

### View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/recipes-access.log

# Error logs
sudo tail -f /var/log/nginx/recipes-error.log
```

### Check Service Status

```bash
sudo systemctl status recipes-backend
sudo systemctl status nginx
```

## Backup and Restore

### Database Backup

```bash
# Backup
mysqldump -u user -p -h dbhost recipes > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
mysql -u user -p -h dbhost recipes < backup-20240101-120000.sql
```

### Application Backup

```bash
# Backup code and configuration
tar -czf recipes-backup-$(date +%Y%m%d).tar.gz \
    /opt/recipes \
    --exclude=/opt/recipes/.git \
    --exclude=/opt/recipes/backend/.venv \
    --exclude=/opt/recipes/frontend/node_modules
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
sudo journalctl -u recipes-backend -n 50

# Test application manually
cd /opt/recipes/backend
source .venv/bin/activate
gunicorn -c gunicorn.conf.py app:app
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R recipes:recipes /opt/recipes

# Fix .env permissions
chmod 600 /opt/recipes/backend/.env
```

### Database Connection Issues

```bash
# Test database connection
mysql -u user -p -h dbhost recipes

# Check .env file
cat /opt/recipes/backend/.env
```

### Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

## Security Checklist

- [ ] Database credentials stored in `.env` (not in code)
- [ ] `.env` file has restricted permissions (600)
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] SSL/TLS enabled with Let's Encrypt
- [ ] Regular database backups configured
- [ ] Monitoring and alerting set up
- [ ] Keep dependencies updated
- [ ] Review logs regularly

## Support

For more detailed documentation, see the main [DEPLOYMENT.md](../DEPLOYMENT.md) file in the repository root.
