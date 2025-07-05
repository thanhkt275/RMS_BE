# GitHub Actions CI/CD Setup

This repository includes a GitHub Actions workflow that automatically builds and tests your RMS backend application, then pushes Docker images to Docker Hub.

## Workflow Overview

The workflow consists of two main jobs:

1. **Test**: Runs unit tests and e2e tests
2. **Build and Push**: Builds Docker image and pushes to Docker Hub

## Required Secrets

You need to configure the following secrets in your GitHub repository:

### Go to: Repository Settings → Secrets and Variables → Actions

1. **`DOCKER_HUB_USERNAME`**
   - Your Docker Hub username
   - Example: `johndoe`

2. **`DOCKER_HUB_TOKEN`**
   - Docker Hub access token (not password!)
   - Create at: https://hub.docker.com/settings/security
   - Generate a new access token with Read & Write permissions

## Setup Instructions

### 1. Docker Hub Setup
```bash
# Login to Docker Hub
docker login

# Create a repository named 'rms-backend' on Docker Hub
# Go to: https://hub.docker.com/repositories
```

### 2. GitHub Secrets Setup
1. Go to your repository on GitHub
2. Navigate to: Settings → Secrets and Variables → Actions
3. Click "New repository secret" and add each secret:
   - `DOCKER_HUB_USERNAME`: Your Docker Hub username
   - `DOCKER_HUB_TOKEN`: Your Docker Hub access token

## Docker Image Tags

The workflow creates the following Docker image tags:
- `latest` (for main branch)
- `main-sha1234567` (branch + commit SHA)
- `main` (branch name)

## Workflow Triggers

The workflow runs on:
- Push to `main` or `master` branch
- Pull requests to `main` or `master` branch

## Troubleshooting

### Common Issues:

1. **Docker Hub Login Failed**
   - Check if `DOCKER_HUB_TOKEN` is correct
   - Ensure token has Read & Write permissions

2. **Docker Build Failed**
   - Check Dockerfile syntax
   - Ensure all required files are present
   - Review build logs in Actions tab

3. **Tests Failing**
   - Ensure all dependencies are in `package.json`
   - Check if test scripts exist in `package.json`

### Checking Workflow Status:
- Go to: Repository → Actions tab
- Click on the latest workflow run to see details
- Check each job's logs for errors

## Next Steps

1. Configure the secrets in GitHub
2. Push code to trigger the workflow
3. Monitor the Actions tab for build status
4. Use the Docker images from Docker Hub for your deployments
