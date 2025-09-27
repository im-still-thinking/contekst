#!/bin/bash

# Contekst Backend Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}🚀 Starting Contekst Backend Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${YELLOW}📝 Please edit .env file with your actual configuration values${NC}"
        echo -e "${YELLOW}Press any key to continue after editing .env file...${NC}"
        read -n 1 -s
    else
        echo -e "${RED}❌ env.example file not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down --remove-orphans || docker compose down --remove-orphans || true

# Pull latest images
echo -e "${BLUE}📥 Pulling latest images...${NC}"
docker-compose pull || docker compose pull || true

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
docker-compose build --no-cache || docker compose build --no-cache

# Start the services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d || docker compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are running
echo -e "${BLUE}🔍 Checking service status...${NC}"
docker-compose ps || docker compose ps

# Test the API
echo -e "${BLUE}🧪 Testing API endpoint...${NC}"
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding successfully!${NC}"
else
    echo -e "${RED}❌ API is not responding. Check logs with: docker-compose logs backend${NC}"
    echo -e "${YELLOW}💡 Make sure your external MySQL, Redis, and Qdrant services are accessible${NC}"
fi

# Show logs
echo -e "${BLUE}📋 Recent logs:${NC}"
docker-compose logs --tail=20 backend || docker compose logs --tail=20 backend

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}API is available at: http://localhost:3000${NC}"
echo -e "${BLUE}To view logs: docker-compose logs -f backend${NC}"
echo -e "${BLUE}To stop services: docker-compose down${NC}"
echo -e "${YELLOW}📝 Note: Using external MySQL, Redis, and Qdrant services${NC}"
