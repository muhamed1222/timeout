#!/bin/bash

# =============================================================================
# ShiftManager Production Deployment Script
# =============================================================================
# This script deploys ShiftManager to production using Docker Compose
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh production
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="shiftmanager"
COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║        🚀 ShiftManager Production Deployment 🚀            ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pre-deployment checks
echo -e "${BLUE}📋 Step 1/7: Running pre-deployment checks...${NC}"

if [ ! -f ".env.${ENVIRONMENT}" ]; then
    echo -e "${RED}❌ ERROR: .env.${ENVIRONMENT} file not found!${NC}"
    echo "Please create .env.${ENVIRONMENT} from .env.production.example"
    exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
    echo -e "${RED}❌ ERROR: ${COMPOSE_FILE} not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment files found${NC}"

# Step 2: Verify environment variables
echo -e "\n${BLUE}🔍 Step 2/7: Verifying critical environment variables...${NC}"

source ".env.${ENVIRONMENT}"

REQUIRED_VARS=(
    "DATABASE_URL"
    "TELEGRAM_BOT_TOKEN"
    "BOT_API_SECRET"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ ERROR: Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables present${NC}"

# Step 3: Run TypeScript type checking
echo -e "\n${BLUE}🔧 Step 3/7: Running TypeScript type checking...${NC}"
if npm run check; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ ERROR: TypeScript compilation failed!${NC}"
    echo "Please fix TypeScript errors before deploying."
    exit 1
fi

# Step 4: Run tests
echo -e "\n${BLUE}🧪 Step 4/7: Running tests...${NC}"
if npm test -- --run; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Some tests failed. Continue? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Step 5: Build Docker images
echo -e "\n${BLUE}🐳 Step 5/7: Building Docker images...${NC}"
docker-compose -f "${COMPOSE_FILE}" build --no-cache

echo -e "${GREEN}✅ Docker images built successfully${NC}"

# Step 6: Stop old containers (if any)
echo -e "\n${BLUE}🛑 Step 6/7: Stopping old containers...${NC}"
docker-compose -f "${COMPOSE_FILE}" down || true

echo -e "${GREEN}✅ Old containers stopped${NC}"

# Step 7: Start new containers
echo -e "\n${BLUE}🚀 Step 7/7: Starting new containers...${NC}"
docker-compose -f "${COMPOSE_FILE}" --env-file ".env.${ENVIRONMENT}" up -d

# Wait for health checks
echo -e "\n${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check container status
if docker-compose -f "${COMPOSE_FILE}" ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Containers are running${NC}"
else
    echo -e "${RED}❌ ERROR: Containers failed to start!${NC}"
    docker-compose -f "${COMPOSE_FILE}" logs --tail=50
    exit 1
fi

# Final health check
echo -e "\n${BLUE}🏥 Running health check...${NC}"
sleep 5

if curl -f -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ WARNING: Health check failed!${NC}"
    echo "Service might not be fully ready yet. Check logs:"
    echo "  docker-compose -f ${COMPOSE_FILE} logs -f app"
fi

# Display deployment info
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║        ✅ DEPLOYMENT COMPLETED SUCCESSFULLY! ✅            ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Information:${NC}"
echo "  Environment: ${ENVIRONMENT}"
echo "  Compose File: ${COMPOSE_FILE}"
echo "  Application URL: http://localhost:5000"
echo ""
echo -e "${BLUE}🔍 Useful Commands:${NC}"
echo "  View logs:        docker-compose -f ${COMPOSE_FILE} logs -f"
echo "  View app logs:    docker-compose -f ${COMPOSE_FILE} logs -f app"
echo "  Check status:     docker-compose -f ${COMPOSE_FILE} ps"
echo "  Stop services:    docker-compose -f ${COMPOSE_FILE} down"
echo "  Restart:          docker-compose -f ${COMPOSE_FILE} restart"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "  1. Configure your domain DNS to point to this server"
echo "  2. Set up SSL certificates (Let's Encrypt recommended)"
echo "  3. Update nginx.conf with your domain name"
echo "  4. Configure Telegram webhook: https://your-domain.com/api/bot/webhook"
echo "  5. Set up automated backups: ./scripts/setup-backup-cron.sh production"
echo "  6. Configure monitoring alerts in Sentry"
echo ""
echo -e "${GREEN}🎉 Happy managing shifts! 🎉${NC}"

