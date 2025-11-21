# CI/CD Pipeline Examples

This directory contains example CI/CD pipeline configurations for automated deployment of the Recipes application.

## Available Examples

### GitHub Actions (`github-actions.yml`)

Automated CI/CD pipeline for GitHub repositories.

**Features:**
- Runs tests on every push and pull request
- Automatically deploys to production when a release tag (v*.*.*) is created
- Optional automatic deployment to development on develop branch
- Includes rollback on deployment failure
- MySQL test database setup

**Setup:**

1. Copy the file to your repository:
   ```bash
   mkdir -p .github/workflows
   cp deployment/ci-cd-examples/github-actions.yml .github/workflows/deploy.yml
   ```

2. Add secrets in GitHub repository settings (Settings → Secrets and variables → Actions):
   - `DEPLOY_SSH_KEY`: Private SSH key for deployment user
   - `DEPLOY_HOST`: Production server hostname (e.g., `recipes.example.com`)
   - `DEPLOY_USER`: Deployment user (e.g., `recipes`)
   - `DEPLOY_PATH`: Installation path (e.g., `/opt/recipes`)
   - Optional for development:
     - `DEV_DEPLOY_SSH_KEY`
     - `DEV_DEPLOY_HOST`
     - `DEV_DEPLOY_USER`
     - `DEV_DEPLOY_PATH`

3. Commit and push to trigger the pipeline

**Usage:**
- Push to `main` branch → Tests run
- Create release tag `v1.2.3` → Tests run, then automatic deployment to production
- Push to `develop` branch → Tests run, then automatic deployment to development

**Creating a Release:**
```bash
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```

### GitLab CI (`gitlab-ci.yml`)

Automated CI/CD pipeline for GitLab repositories.

**Features:**
- Runs tests on every push
- Automatically deploys to development on develop branch
- Manual deployment to production on tags
- Manual rollback capability
- Caching for faster builds

**Setup:**

1. Copy the file to your repository root:
   ```bash
   cp deployment/ci-cd-examples/gitlab-ci.yml .gitlab-ci.yml
   ```

2. Add CI/CD variables in GitLab project settings (Settings → CI/CD → Variables):
   - `DEPLOY_SSH_KEY`: Private SSH key for deployment
   - `PROD_HOST`: Production server hostname
   - `PROD_USER`: Production deployment user
   - `PROD_PATH`: Production installation path (e.g., `/opt/recipes`)
   - `DEV_HOST`: Development server hostname
   - `DEV_USER`: Development deployment user
   - `DEV_PATH`: Development installation path

3. Commit and push to trigger the pipeline

**Usage:**
- Push to any branch → Tests run
- Push to `develop` branch → Tests run, then automatic deployment to development
- Create tag on `main` branch → Tests run, manual button to deploy to production
- Rollback → Manual job with `ROLLBACK_VERSION` variable

**Creating a Release:**
```bash
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```
Then click "Deploy to Production" in GitLab pipeline.

**Rolling Back:**
1. Go to CI/CD → Pipelines
2. Find the rollback job
3. Set `ROLLBACK_VERSION` variable (e.g., `v1.2.2`)
4. Click "Play" to execute rollback

## SSH Key Setup

For automated deployments, you need to set up SSH key authentication.

### Generate SSH Key

```bash
# Generate a new SSH key specifically for deployment
ssh-keygen -t ed25519 -C "ci-deployment@recipes" -f recipes_deploy_key

# This creates:
# - recipes_deploy_key (private key - add to CI/CD secrets)
# - recipes_deploy_key.pub (public key - add to server)
```

### Add Public Key to Server

```bash
# Copy public key to deployment server
ssh-copy-id -i recipes_deploy_key.pub recipes@production.example.com

# Or manually:
cat recipes_deploy_key.pub | ssh recipes@production.example.com \
  "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Add Private Key to CI/CD

**GitHub:**
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `DEPLOY_SSH_KEY`
4. Value: Paste contents of `recipes_deploy_key` (the private key)

**GitLab:**
1. Go to project Settings → CI/CD → Variables
2. Click "Add variable"
3. Key: `DEPLOY_SSH_KEY`
4. Value: Paste contents of `recipes_deploy_key` (the private key)
5. Type: File (recommended) or Variable
6. Flags: Check "Mask variable" and "Protect variable"

## Customizing for Your Setup

### Update Server Details

Edit the pipeline file and replace with your actual values:

```yaml
# GitHub Actions
env:
  DEPLOY_HOST: your-server.example.com
  DEPLOY_USER: recipes
  DEPLOY_PATH: /opt/recipes

# GitLab CI - in CI/CD variables
PROD_HOST: your-server.example.com
PROD_USER: recipes
PROD_PATH: /opt/recipes
```

### Add Tests

Both pipelines include placeholder test commands. Add your actual tests:

**Backend tests (Python):**
```yaml
# Add to test backend job
script:
  - cd backend
  - pip install -r requirements.txt pytest
  - python -m pytest tests/ -v
```

**Frontend tests (JavaScript):**
```yaml
# Add to test frontend job
script:
  - cd frontend
  - npm ci
  - npm run test
  - npm run lint
```

### Environment Variables

Add any additional environment variables your application needs:

```yaml
# GitHub Actions
- name: Deploy
  env:
    FLASK_ENV: production
    SECRET_KEY: ${{ secrets.SECRET_KEY }}

# GitLab CI
variables:
  FLASK_ENV: production
  SECRET_KEY: $CI_SECRET_KEY
```

## Security Best Practices

1. **Protect Secrets**: Never commit private keys or passwords to git
2. **Use Protected Branches**: Require reviews before merging to main
3. **Limit Deployment Access**: Only allow authorized users to trigger production deployments
4. **Rotate Keys**: Regularly rotate deployment SSH keys
5. **Use Different Keys**: Use separate SSH keys for different environments
6. **Enable 2FA**: Enable two-factor authentication on CI/CD platforms
7. **Monitor Deployments**: Set up notifications for failed deployments

## Troubleshooting

### SSH Connection Issues

Test SSH connection from your local machine:
```bash
ssh -i recipes_deploy_key recipes@production.example.com
```

### Pipeline Fails at Deployment Step

1. Check CI/CD logs for error messages
2. Verify SSH key is correct and has proper permissions
3. Ensure deployment user has sudo access (if using systemd)
4. Test manual deployment script locally

### Database Migration Fails

1. Check migration files are valid SQL
2. Test migrations in development first
3. Ensure database user has ALTER privileges
4. Review migration logs for specific errors

### Service Won't Start After Deployment

1. Check service logs: `journalctl -u recipes-backend -n 50`
2. Verify environment variables are set correctly
3. Check file permissions
4. Test application manually: `gunicorn -c gunicorn.conf.py app:app`

## Testing Locally

Before setting up CI/CD, test the deployment script locally:

```bash
# From your local machine
cd deployment
./deploy.sh production main

# Or test SSH command
ssh recipes@production.example.com 'cd /opt/recipes && git pull'
```

## Notifications

### GitHub Actions

Add notification step:
```yaml
- name: Notify on success
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '✅ Deployed successfully!'
      })
```

### GitLab CI

Add notification to `.gitlab-ci.yml`:
```yaml
after_script:
  - echo "Deployment completed at $(date)"
```

## Monitoring

After setting up CI/CD, monitor:

- Pipeline success/failure rates
- Deployment frequency
- Time to deploy
- Rollback frequency
- Service health after deployment

## Support

For more information:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- Main [DEPLOYMENT.md](../../DEPLOYMENT.md) guide
- [Deployment Scripts README](../README.md)
