#!/bin/bash

# Contekst Backend VM Setup Script
# This script automates the setup of a VM for Contekst backend deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Contekst Backend VM Setup${NC}"
echo -e "${BLUE}This script will install Docker, Docker Compose, and set up the environment${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    nano \
    htop \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker is already installed${NC}"
fi

# Install Docker Compose (standalone)
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}✅ Docker Compose is already installed${NC}"
fi

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
echo -e "${GREEN}✅ Firewall configured${NC}"

# Create project directory
echo -e "${YELLOW}📁 Setting up project directory...${NC}"
PROJECT_DIR="$HOME/contekst-backend"
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p "$PROJECT_DIR"
fi

# Create a sample docker-compose.yml if repository is not available
cat > "$PROJECT_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  # Backend API
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MYSQL_URL=${MYSQL_URL}
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - QDRANT_URL=http://qdrant:6333
      - QDRANT_API_KEY=${QDRANT_API_KEY}
      - MEMORY_SIMILARITY_THRESHOLD=${MEMORY_SIMILARITY_THRESHOLD:-0.7}
      - BLOCKCHAIN_RPC_URL=${BLOCKCHAIN_RPC_URL}
      - LEASE_CONTRACT_ADDRESS=${LEASE_CONTRACT_ADDRESS}
      - BLOCKCHAIN_PRIVATE_KEY=${BLOCKCHAIN_PRIVATE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - WALRUS_PRIVATE_KEY=${WALRUS_PRIVATE_KEY}
      - WALRUS_NETWORK=${WALRUS_NETWORK:-testnet}
      - WALRUS_STORAGE_EPOCHS=${WALRUS_STORAGE_EPOCHS:-3}
    depends_on:
      - mysql
      - redis
      - qdrant
    restart: unless-stopped
    networks:
      - contekst-network

  # MySQL Database
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${MYSQL_DATABASE}
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped
    networks:
      - contekst-network
    command: --default-authentication-plugin=mysql_native_password

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - contekst-network
    command: redis-server --appendonly yes

  # Qdrant Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped
    networks:
      - contekst-network

volumes:
  mysql_data:
  redis_data:
  qdrant_data:

networks:
  contekst-network:
    driver: bridge
EOF

# Create environment template
cat > "$PROJECT_DIR/env.example" << 'EOF'
# Database Configuration
MYSQL_URL=mysql://contekst_user:your_strong_password@mysql:3306/contekst
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_DATABASE=contekst
MYSQL_USER=contekst_user
MYSQL_PASSWORD=your_strong_password

# Redis Configuration
REDIS_URL=redis://redis:6379

# Server Configuration
PORT=3000
NODE_ENV=production
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here

# AI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Vector Database Configuration
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=your_qdrant_api_key_if_needed
MEMORY_SIMILARITY_THRESHOLD=0.7

# Blockchain Configuration (Optional)
BLOCKCHAIN_RPC_URL=https://your-blockchain-rpc-url
LEASE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here

# Walrus Storage Configuration
WALRUS_PRIVATE_KEY=your_walrus_private_key_here
WALRUS_NETWORK=testnet
WALRUS_STORAGE_EPOCHS=3
EOF

# Create deployment script
cat > "$PROJECT_DIR/deploy.sh" << 'EOF'
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Contekst Backend Deployment${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp env.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your actual configuration values${NC}"
    echo -e "${YELLOW}Press any key to continue after editing .env file...${NC}"
    read -n 1 -s
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down --remove-orphans || true

# Pull latest images
echo -e "${BLUE}📥 Pulling latest images...${NC}"
docker-compose pull || true

# Start the services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are running
echo -e "${BLUE}🔍 Checking service status...${NC}"
docker-compose ps

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}Services are available at:${NC}"
echo -e "${GREEN}- API: http://localhost:3000${NC}"
echo -e "${GREEN}- MySQL: localhost:3306${NC}"
echo -e "${GREEN}- Redis: localhost:6379${NC}"
echo -e "${GREEN}- Qdrant: http://localhost:6333${NC}"
EOF

chmod +x "$PROJECT_DIR/deploy.sh"

# Configure Docker daemon for log rotation
echo -e "${YELLOW}🔧 Configuring Docker daemon...${NC}"
sudo mkdir -p /etc/docker
cat > /tmp/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo mv /tmp/daemon.json /etc/docker/daemon.json

# Restart Docker to apply configuration
sudo systemctl restart docker

# Create useful aliases
echo -e "${YELLOW}🔧 Creating useful aliases...${NC}"
cat >> ~/.bashrc << 'EOF'

# Contekst aliases
alias contekst-logs='docker-compose -f ~/contekst-backend/docker-compose.yml logs'
alias contekst-status='docker-compose -f ~/contekst-backend/docker-compose.yml ps'
alias contekst-restart='docker-compose -f ~/contekst-backend/docker-compose.yml restart'
alias contekst-stop='docker-compose -f ~/contekst-backend/docker-compose.yml down'
alias contekst-start='docker-compose -f ~/contekst-backend/docker-compose.yml up -d'
EOF

echo -e "${GREEN}✅ VM setup completed successfully!${NC}"
echo -e "${BLUE}📁 Project directory: $PROJECT_DIR${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}1. cd $PROJECT_DIR${NC}"
echo -e "${BLUE}2. Copy your backend code to this directory${NC}"
echo -e "${BLUE}3. Edit .env file with your configuration${NC}"
echo -e "${BLUE}4. Run: ./deploy.sh${NC}"
echo -e "${YELLOW}⚠️  Please log out and back in for Docker group changes to take effect${NC}"
echo -e "${YELLOW}⚠️  Or run: newgrp docker${NC}"
