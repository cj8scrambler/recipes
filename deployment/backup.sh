#!/bin/bash
#
# Backup script for Recipes application
#
# This script creates backups of:
# - Database
# - Application configuration (.env files)
# - Uploaded files (if any)
#
# Usage:
#   ./backup.sh [backup_directory]
#
# Example:
#   ./backup.sh /var/backups/recipes

set -e  # Exit on error

# Configuration
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$(realpath ${1:-/var/backups/recipes})"
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR}
GIT_ROOT=$(git rev-parse --show-toplevel)
cd ${GIT_ROOT}
GIT_NAME=$(git describe --tags)
BACKUP_NAME="recipes-backup-${GIT_NAME}-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    log_warning "This script may need sudo access for some operations"
fi

# Create backup directory
log_info "Creating backup directory: ${BACKUP_PATH}"
mkdir -p "${BACKUP_PATH}"

# Load database configuration from .env
if [ -f ".env" ]; then
    source .env
    log_success "Loaded database configuration"
elif [ -f "deployment/.env" ]; then
    source deployment/.env
    log_success "Loaded database configuration"
else
    log_error "Cannot find deployment/.env file"
    log_error "Please run this script from the repository root"
    exit 1
fi

# Parse DATABASE_URL
# Format: mysql+pymysql://user:password@host:port/database
if [[ $DATABASE_URL =~ mysql\+pymysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    log_error "Cannot parse DATABASE_URL"
    exit 1
fi

log_info "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"

# Backup database
log_info "Backing up database..."
set -x
mysqldump \
    -v \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    --no-tablespaces \
    --single-transaction \
    --quick \
    --lock-tables=false \
    "${DB_NAME}" > "${BACKUP_PATH}/database.sql"
set +x

if [ $? -eq 0 ]; then
    log_success "Database backup created: database.sql"
    
    # Compress database backup
    gzip "${BACKUP_PATH}/database.sql"
    log_success "Database backup compressed: database.sql.gz"
else
    log_error "Database backup failed"
    exit 1
fi

# Backup configuration files
log_info "Backing up configuration files..."
mkdir -p "${BACKUP_PATH}/config"

if [ -f "backend/.env" ]; then
    cp backend/.env "${BACKUP_PATH}/config/backend.env"
    log_success "Backed up backend/.env"
fi

if [ -f "frontend/.env" ]; then
    cp frontend/.env "${BACKUP_PATH}/config/frontend.env"
    log_success "Backed up frontend/.env"
fi

if [ -f "docker/.env" ]; then
    cp docker/.env "${BACKUP_PATH}/config/docker.env"
    log_success "Backed up docker/.env"
fi

# Create backup manifest
log_info "Creating backup manifest..."
cat > "${BACKUP_PATH}/MANIFEST.txt" << EOF
Recipes Application Backup
===========================

Backup Date: $(date)
Backup Name: ${BACKUP_NAME}
Database: ${DB_NAME}
Host: ${DB_HOST}

Contents:
- database.sql.gz: Complete database dump
- config/: Configuration files (.env files)
$([ -d "uploads" ] && echo "- uploads/: Uploaded files")

Restore Instructions:
1. Restore database:
   gunzip database.sql.gz
   mysql -h HOST -u USER -p DATABASE < database.sql

2. Restore configuration:
   cp config/backend.env /path/to/backend/.env
   
3. Restore uploads (if applicable):
   cp -r uploads /path/to/uploads

Git Version: $(git describe --tags --always 2>/dev/null || echo "unknown")
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
EOF

log_success "Created backup manifest"

# Create archive
log_info "Creating compressed archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

if [ $? -eq 0 ]; then
    log_success "Archive created: ${BACKUP_NAME}.tar.gz"
    
    # Remove uncompressed backup directory
    rm -rf "${BACKUP_NAME}"
    log_info "Removed temporary files"
    
    # Show backup size
    BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    log_success "Backup size: ${BACKUP_SIZE}"
else
    log_error "Failed to create archive"
    exit 1
fi

# Cleanup old backups (keep last 7 days)
log_info "Cleaning up old backups (keeping last 7 days)..."
find "${BACKUP_DIR}" -name "recipes-backup-*.tar.gz" -type f -mtime +7 -delete
OLD_BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "recipes-backup-*.tar.gz" -type f | wc -l)
log_info "Kept ${OLD_BACKUP_COUNT} backup(s)"

# Summary
log_success "Backup completed successfully!"
log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
log_info ""
log_info "To restore this backup:"
log_info "  1. Extract: tar -xzf ${BACKUP_NAME}.tar.gz"
log_info "  2. Read MANIFEST.txt for restore instructions"

# Return backup path for automation
echo "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
