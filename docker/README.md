# Docker Deployment

This directory contains all Docker-related files for deploying the Recipes application.

## Contents

- **docker-compose.yml** - Main Docker Compose configuration
- **docker-compose.external-db.yml** - Override for external database
- **Dockerfile.backend** - Backend container image (Python/Flask/Gunicorn)
- **Dockerfile.frontend** - Frontend container image (Node build + Nginx)
- **.env.example** - Environment variables template
- **DOCKER_DEPLOYMENT.md** - Complete deployment guide

## Quick Start

1. **Copy and configure environment file**:
   ```bash
   cp .env.example .env
   nano .env
   ```

2. **Start with internal database**:
   ```bash
   docker-compose --profile internal-db up -d
   ```

3. **Or with external database**:
   ```bash
   export DATABASE_URL="mysql+pymysql://user:pass@host:3306/db"
   docker-compose up -d
   ```

## For Detailed Instructions

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for:
- Complete deployment scenarios
- Database migration procedures
- Upgrading and rollback
- Troubleshooting
- Security best practices

## Architecture

The Docker setup uses:
- **Backend**: Python 3.12 + Gunicorn (port 8000)
- **Frontend**: React build served by Nginx (port 5173)
- **Database**: MySQL 8.0 (port 3306, optional)

All services are connected via a Docker bridge network.

## Building for a Specific Release

```bash
git checkout v1.0.0
cd docker
docker-compose build
docker-compose --profile internal-db up -d
```

## Files Structure

```
docker/
├── README.md                        # This file
├── DOCKER_DEPLOYMENT.md             # Complete guide
├── .env.example                     # Environment template
├── docker-compose.yml               # Main compose file
├── docker-compose.external-db.yml   # External DB override
├── Dockerfile.backend               # Backend image
└── Dockerfile.frontend              # Frontend image
```

## See Also

- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Traditional (non-Docker) deployment
- [../DEPLOYMENT_QUICKSTART.md](../DEPLOYMENT_QUICKSTART.md) - Quick start guide
- [../db/migrations/README.md](../db/migrations/README.md) - Database migrations
