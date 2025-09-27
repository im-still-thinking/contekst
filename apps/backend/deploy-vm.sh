#!/bin/bash

# Simple VM Deployment Script for Contekst Backend
# Usage: ./deploy-vm.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Contekst Backend VM Deployment${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${YELLOW}⚠️  Please log out and back in, then run this script again${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
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

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down --remove-orphans 2>/dev/null || docker compose down --remove-orphans 2>/dev/null || true

# Connect to existing Docker network if your services are on a shared network
echo -e "${BLUE}🔍 Checking for existing Docker networks...${NC}"
EXISTING_NETWORKS=$(docker network ls --format "{{.Name}}" | grep -E "(mysql|redis|qdrant|database)" | head -1)
if [ ! -z "$EXISTING_NETWORKS" ]; then
    echo -e "${YELLOW}📡 Found existing network: $EXISTING_NETWORKS${NC}"
    echo -e "${YELLOW}💡 You may want to connect your backend to this network after deployment${NC}"
fi

# Build and start the service
echo -e "${BLUE}🔨 Building and starting the backend...${NC}"
docker-compose up -d --build || docker compose up -d --build

# Wait for service to be ready
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 15

# Check if service is running
if docker-compose ps | grep -q "Up" || docker compose ps | grep -q "running"; then
    echo -e "${GREEN}✅ Backend is running!${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Checking logs...${NC}"
    docker-compose logs backend || docker compose logs backend
    exit 1
fi

# Test the API
echo -e "${BLUE}🧪 Testing API endpoint...${NC}"
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  API is not responding yet. This might be normal if external services are still connecting.${NC}"
    echo -e "${BLUE}📋 Recent logs:${NC}"
    docker-compose logs --tail=10 backend || docker compose logs --tail=10 backend
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}API is available at: http://localhost:3000${NC}"

# Show network connection instructions
echo -e "${BLUE}📡 Network Connection:${NC}"
echo -e "${BLUE}If your MySQL/Redis/Qdrant containers are on a different network:${NC}"
echo -e "${YELLOW}  1. Find your services network: docker network ls${NC}"
echo -e "${YELLOW}  2. Connect backend to that network: docker network connect <network-name> contekst-backend${NC}"
echo -e "${YELLOW}  3. Update .env to use container names (mysql, redis, qdrant) instead of localhost${NC}"

echo -e "${BLUE}Useful commands:${NC}"
echo -e "${BLUE}  View logs: docker-compose logs -f backend${NC}"
echo -e "${BLUE}  Stop: docker-compose down${NC}"
echo -e "${BLUE}  Restart: docker-compose restart backend${NC}"
echo -e "${BLUE}  Rebuild: docker-compose up -d --build${NC}"
echo -e "${BLUE}  Connect to network: docker network connect <network-name> contekst-backend${NC}"
