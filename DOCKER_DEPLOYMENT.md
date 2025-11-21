# Docker Deployment Guide

This guide covers deploying the Recipes application using Docker and Docker Compose.

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### Basic Deployment (with internal database)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cj8scrambler/recipes.git
   cd recipes
   ```

2. **Checkout a specific release** (recommended):
   ```bash
   git checkout v1.0.0
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

4. **Start the application**:
   ```bash
   docker-compose --profile internal-db up -d
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

6. **Create admin user**:
   ```bash
   docker-compose exec backend python -c "
   from app import app, db
   from auth import User, hash_password
   
   with app.app_context():
       admin = User(
           email='admin@example.com',
           password_hash=hash_password('your-password'),
           role='admin'
       )
       db.session.add(admin)
       db.session.commit()
       print('Admin user created!')
   "
   ```

## Deployment Scenarios

### Scenario 1: All-in-One (Internal Database)

Use this for development, testing, or small deployments where you want Docker to manage everything.

**Setup**:
```bash
cp .env.example .env
# Edit .env - leave database settings as default
docker-compose --profile internal-db up -d
```

**What this does**:
- Creates MySQL container with database initialized from `db.sql` and `data.sql`
- Creates backend container (Flask/Gunicorn)
- Creates frontend container (Nginx serving React build)
- All containers networked together

**Ports**:
- 3306: MySQL (optional, can be removed from docker-compose.yml)
- 8000: Backend API
- 5173: Frontend

### Scenario 2: External Database

Use this when you have an existing MySQL database.

**Setup**:
```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```bash
# Set your external database URL
DATABASE_URL=mysql+pymysql://user:password@your-db-host:3306/recipes
```

**Start without internal database**:
```bash
docker-compose up -d
```

Or use the external-db override:
```bash
docker-compose -f docker-compose.yml -f docker-compose.external-db.yml up -d
```

**Initialize external database**:
```bash
# On your database server
mysql -u user -p recipes < db/db.sql
mysql -u user -p recipes < db/data.sql
```

### Scenario 3: Production with Reverse Proxy

Use this for production with a reverse proxy (nginx/traefik) handling SSL.

**Setup**:
```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```bash
FRONTEND_PORT=8080
BACKEND_PORT=8000
VITE_API_URL=https://api.yourdomain.com
```

**Start services**:
```bash
docker-compose --profile internal-db up -d
```

**Configure your reverse proxy** to:
- Route `yourdomain.com` → `localhost:8080` (frontend)
- Route `api.yourdomain.com` → `localhost:8000` (backend)
- Handle SSL/TLS termination

## Configuration

### Environment Variables

All configuration is done through environment variables in `.env` file:

#### Database (when using internal DB)
```bash
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=recipes
MYSQL_USER=recipes_user
MYSQL_PASSWORD=recipes_password
MYSQL_PORT=3306
```

#### Database (when using external DB)
```bash
DATABASE_URL=mysql+pymysql://user:password@host:port/database
```

#### Backend
```bash
BACKEND_PORT=8000
FLASK_ENV=production
SECRET_KEY=your-random-secret-key-here
```

#### Frontend
```bash
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:8000
```

### Tagged Releases

Always deploy from a tagged release in production:

```bash
# List available tags
git tag -l

# Checkout a specific release
git checkout v1.0.0

# Build and deploy
docker-compose --profile internal-db up -d --build
```

### Building for Specific Tag

To build images for a specific git tag:

```bash
git checkout v1.0.0
docker-compose build
docker-compose --profile internal-db up -d
```

## Database Migrations

### Initial Setup

Database is automatically initialized from `db.sql` and `data.sql` when using internal database.

### Applying Migrations

When upgrading between versions:

1. **Stop the backend**:
   ```bash
   docker-compose stop backend
   ```

2. **Apply migration**:
   ```bash
   docker-compose exec db mysql -u recipes_user -precipes_password recipes < db/migrations/migrate_1_0_0_to_1_1_0.sql
   ```

3. **Restart backend**:
   ```bash
   docker-compose start backend
   ```

### Migration from Backend Container

```bash
docker-compose exec backend python manage_migrations.py list
docker-compose exec backend python manage_migrations.py apply migrate_1_0_0_to_1_1_0.sql
```

## Upgrading

### Upgrading to New Version

1. **Backup your data**:
   ```bash
   docker-compose exec db mysqldump -u recipes_user -precipes_password recipes > backup.sql
   ```

2. **Pull new code**:
   ```bash
   git fetch --tags
   git checkout v1.1.0
   ```

3. **Apply migrations** (if any):
   ```bash
   # Check for migration files
   ls db/migrations/
   
   # Apply if needed
   docker-compose exec db mysql -u recipes_user -precipes_password recipes < db/migrations/migrate_1_0_0_to_1_1_0.sql
   ```

4. **Rebuild and restart**:
   ```bash
   docker-compose down
   docker-compose --profile internal-db up -d --build
   ```

## Management Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Stop/Start

```bash
# Stop all
docker-compose stop

# Start all
docker-compose start

# Stop and remove containers
docker-compose down
```

### Access Containers

```bash
# Backend shell
docker-compose exec backend bash

# Database shell
docker-compose exec db mysql -u recipes_user -precipes_password recipes

# Frontend shell (nginx)
docker-compose exec frontend sh
```

### Database Backup

```bash
# Backup
docker-compose exec db mysqldump -u recipes_user -precipes_password recipes > backup-$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db mysql -u recipes_user -precipes_password recipes < backup-20240115.sql
```

## Troubleshooting

### Backend Can't Connect to Database

**Check database is running**:
```bash
docker-compose ps db
docker-compose logs db
```

**Verify connection string**:
```bash
docker-compose exec backend env | grep DATABASE_URL
```

### Frontend Shows API Errors

**Check VITE_API_URL**:
```bash
docker-compose exec frontend env | grep VITE
```

**Rebuild frontend with correct API URL**:
```bash
docker-compose down frontend
docker-compose up -d --build frontend
```

### Database Won't Initialize

**Check if db.sql is valid**:
```bash
mysql -u root -p < db/db.sql
```

**Manually initialize**:
```bash
docker-compose exec db mysql -u root -prootpassword recipes < /docker-entrypoint-initdb.d/01-schema.sql
```

### Port Already in Use

**Change ports in .env**:
```bash
BACKEND_PORT=8001
FRONTEND_PORT=5174
MYSQL_PORT=3307
```

**Restart**:
```bash
docker-compose down
docker-compose --profile internal-db up -d
```

### Permission Issues

**Reset ownership**:
```bash
docker-compose down
sudo chown -R $USER:$USER .
docker-compose --profile internal-db up -d
```

## Security Best Practices

1. **Never commit .env file** - it's already in .gitignore
2. **Change default passwords** in production
3. **Use strong SECRET_KEY** - generate with `openssl rand -hex 32`
4. **Use SSL/TLS** in production (via reverse proxy)
5. **Don't expose MySQL port** in production (remove from docker-compose.yml)
6. **Regularly update** base images: `docker-compose pull`
7. **Scan for vulnerabilities**: `docker scan recipes-backend`

## Production Checklist

- [ ] Use tagged release, not `main` branch
- [ ] Create custom `.env` with strong passwords
- [ ] Set unique `SECRET_KEY`
- [ ] Configure external database or ensure backups for internal DB
- [ ] Set up reverse proxy with SSL
- [ ] Remove MySQL port exposure from docker-compose.yml
- [ ] Configure regular database backups
- [ ] Set up log aggregation
- [ ] Configure monitoring/alerting
- [ ] Test migration procedures
- [ ] Document recovery procedures

## Advanced Configuration

### Custom Network

```yaml
networks:
  recipes-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Multiple Instances (with Load Balancer)

See `docker-compose.scale.yml` for an example of running multiple backend instances.

## See Also

- [DEPLOYMENT.md](DEPLOYMENT.md) - Traditional deployment guide
- [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) - Quick start guide
- [db/migrations/README.md](db/migrations/README.md) - Database migration guide
