#!/bin/bash
#
# Deployment script for Recipes application
#
# Usage:
#   ./deploy.sh <environment> [version]
#
# Examples:
#   ./deploy.sh production v1.2.3
#   ./deploy.sh production main
#   ./deploy.sh development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <environment> [version]"
    log_info "Environment: production, development, or staging"
    log_info "Version: git tag, branch name, or commit hash (default: main)"
    exit 1
fi

ENVIRONMENT=$1
VERSION=${2:-main}

# Load environment-specific configuration
case "$ENVIRONMENT" in
    production)
        DEPLOY_HOST="production.example.com"
        DEPLOY_USER="recipes"
        DEPLOY_PATH="/opt/recipes"
        SERVICE_NAME="recipes-backend"
        ;;
    development)
        DEPLOY_HOST="dev.example.com"
        DEPLOY_USER="recipes"
        DEPLOY_PATH="/opt/recipes"
        SERVICE_NAME="recipes-backend"
        ;;
    staging)
        DEPLOY_HOST="staging.example.com"
        DEPLOY_USER="recipes"
        DEPLOY_PATH="/opt/recipes"
        SERVICE_NAME="recipes-backend"
        ;;
    *)
        log_error "Unknown environment: $ENVIRONMENT"
        log_info "Valid environments: production, development, staging"
        exit 1
        ;;
esac

log_info "Deploying to $ENVIRONMENT environment"
log_info "Host: $DEPLOY_HOST"
log_info "Version: $VERSION"

# Confirm deployment
if [ "$ENVIRONMENT" = "production" ]; then
    log_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Deployment cancelled."
        exit 0
    fi
fi

# SSH connection test
log_info "Testing SSH connection..."
if ! ssh -q "$DEPLOY_USER@$DEPLOY_HOST" exit; then
    log_error "Cannot connect to $DEPLOY_HOST"
    log_info "Please check your SSH configuration"
    exit 1
fi
log_success "SSH connection successful"

# Deploy via SSH
log_info "Connecting to server and deploying..."

ssh "$DEPLOY_USER@$DEPLOY_HOST" bash << EOF
    set -e
    
    # Colors (for remote output)
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
    
    log_info() { echo -e "\${BLUE}[INFO]\${NC} \$1"; }
    log_success() { echo -e "\${GREEN}[SUCCESS]\${NC} \$1"; }
    log_error() { echo -e "\${RED}[ERROR]\${NC} \$1"; }
    
    cd $DEPLOY_PATH
    
    # Store current version for rollback
    CURRENT_VERSION=\$(git describe --tags --always 2>/dev/null || echo "unknown")
    log_info "Current version: \$CURRENT_VERSION"
    
    # Fetch latest changes
    log_info "Fetching latest changes..."
    git fetch --all --tags
    
    # Checkout specified version
    log_info "Checking out version: $VERSION"
    git checkout $VERSION
    
    # Backend deployment
    log_info "Deploying backend..."
    cd backend
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Install/update dependencies
    log_info "Installing backend dependencies..."
    pip install -q -r requirements.txt
    
    # Check for pending migrations
    log_info "Checking database migrations..."
    if python manage_migrations.py check | grep -q "pending"; then
        log_info "Applying database migrations..."
        python manage_migrations.py upgrade
        log_success "Migrations applied"
    else
        log_info "No pending migrations"
    fi
    
    # Test import
    log_info "Testing application import..."
    python -c "from app import app; print('✓ Import successful')"
    
    # Restart backend service
    log_info "Restarting backend service..."
    sudo systemctl restart $SERVICE_NAME
    
    # Wait for service to start
    sleep 2
    
    # Check service status
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Backend service started successfully"
    else
        log_error "Backend service failed to start"
        log_error "Rolling back to version: \$CURRENT_VERSION"
        git checkout \$CURRENT_VERSION
        sudo systemctl restart $SERVICE_NAME
        exit 1
    fi
    
    # Frontend deployment
    cd ../frontend
    log_info "Deploying frontend..."
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci --silent
    
    # Build frontend
    log_info "Building frontend..."
    npm run build
    
    # Restart frontend service (if using systemd)
    if systemctl list-unit-files | grep -q recipes-frontend; then
        log_info "Restarting frontend service..."
        sudo systemctl restart recipes-frontend
    fi
    
    log_success "Deployment complete!"
    log_info "Deployed version: $VERSION"
EOF

if [ $? -eq 0 ]; then
    log_success "Deployment to $ENVIRONMENT completed successfully!"
    log_info "Version deployed: $VERSION"
else
    log_error "Deployment failed!"
    exit 1
fi
