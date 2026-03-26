#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  MTProto Panel - Installation          ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
fi

if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Ask for port
read -p "Enter panel port [80]: " PORT
PORT=${PORT:-80}

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "Invalid port number"
    exit 1
fi

# Ask for admin credentials
read -p "Enter admin username: " ADMIN_USERNAME
if [ -z "$ADMIN_USERNAME" ]; then
    echo "Username is required"
    exit 1
fi

read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "Password is required"
    exit 1
fi

read -s -p "Confirm admin password: " ADMIN_PASSWORD_CONFIRM
echo ""
if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
    echo "Passwords do not match"
    exit 1
fi

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)

echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  Port:     ${YELLOW}${PORT}${NC}"
echo -e "  Admin:    ${YELLOW}${ADMIN_USERNAME}${NC}"
echo ""

# Create .env file
cat > .env << EOF
PORT=${PORT}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
JWT_SECRET=${JWT_SECRET}
DB_NAME=mtproto_panel
DB_USER=mtproto
DB_PASSWORD=${DB_PASSWORD}
EOF

chmod 600 .env

# Build and start
echo -e "${CYAN}Building and starting panel...${NC}"
docker compose up -d --build

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Panel is running!                     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  URL:   http://0.0.0.0:${PORT}"
echo -e "  Login: ${ADMIN_USERNAME}"
echo -e "${GREEN}========================================${NC}"
