#!/bin/bash

# Deployment Script for Waypoint

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull

# 2. Build and start containers
echo "🏗️ Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Cleanup unused images to save space
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

echo "✅ Deployment Complete! verify status with: docker compose -f docker-compose.prod.yml ps"
