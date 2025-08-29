#!/bin/bash

# Build script for RMS Backend
# Usage: ./build.sh [tag]

set -e

# Default tag
TAG=${1:-latest}
IMAGE_NAME="thanhkt/rms-be"

echo "Building ${IMAGE_NAME}:${TAG}..."

# Build with minimal build args (only non-sensitive data)
docker build \
  --target production \
  --build-arg NODE_ENV=production \
  --build-arg DATABASE_URL="${DATABASE_URL}" \
  -f Dockerfile.production \
  -t "${IMAGE_NAME}:${TAG}" \
  .

echo "Build completed: ${IMAGE_NAME}:${TAG}"
echo ""
echo "To run with docker-compose:"
echo "docker-compose up -d"
echo ""
echo "To run standalone:"
echo "docker run --env-file .env.production -p 5000:5000 ${IMAGE_NAME}:${TAG}"
