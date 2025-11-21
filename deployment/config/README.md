# Deployment Configuration Files

This directory contains environment-specific configuration files for the deployment script.

## Setup

1. Copy the example file for your environment:
   ```bash
   cp production.conf.example production.conf
   ```

2. Edit the configuration file with your actual settings:
   ```bash
   nano production.conf
   ```

3. Update the values:
   - `DEPLOY_HOST`: Your server hostname or IP
   - `DEPLOY_USER`: SSH user for deployment
   - `DEPLOY_PATH`: Path where the application is installed
   - `SERVICE_NAME`: Systemd service name

## Example

```bash
# production.conf
DEPLOY_HOST="recipes.mycompany.com"
DEPLOY_USER="recipes"
DEPLOY_PATH="/opt/recipes"
SERVICE_NAME="recipes-backend"
```

## Usage

Once configured, use the deploy script:

```bash
cd deployment
./deploy.sh production v1.2.3
```

## Security

- **Never commit `.conf` files** (without `.example` suffix) to version control
- These files are automatically excluded by `.gitignore`
- Keep your credentials secure and use SSH keys for authentication
- Use different configurations for each environment

## Available Environments

- `production.conf` - Production environment
- `development.conf` - Development environment  
- `staging.conf` - Staging environment

You can create additional environment files as needed. Just name them `{environment}.conf` and use them with:

```bash
./deploy.sh {environment} [version]
```
