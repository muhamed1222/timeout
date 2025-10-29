#!/bin/bash

# =============================================================================
# Generate Secrets Script
# =============================================================================
# Generates secure random secrets for environment variables
# Usage: ./scripts/generate-secrets.sh
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Generating secure secrets...${NC}\n"

# Function to generate a random secret
generate_secret() {
  openssl rand -hex 32
}

# Generate secrets
BOT_API_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)
TELEGRAM_WEBHOOK_SECRET=$(generate_secret)
AUDIT_LOG_SECRET=$(generate_secret)
CSRF_SECRET=$(generate_secret)

# Display secrets
echo -e "${GREEN}✅ Secrets generated successfully!${NC}\n"

echo "======================================================================="
echo "COPY THESE TO YOUR .env FILE:"
echo "======================================================================="
echo ""
echo "# API Secrets"
echo "BOT_API_SECRET=${BOT_API_SECRET}"
echo "SESSION_SECRET=${SESSION_SECRET}"
echo "TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}"
echo "AUDIT_LOG_SECRET=${AUDIT_LOG_SECRET}"
echo "CSRF_SECRET=${CSRF_SECRET}"
echo ""
echo "======================================================================="
echo ""

# Option to write to .env file
read -p "$(echo -e ${YELLOW}Do you want to append these to .env? [y/N]:${NC} )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    
    if [ -f .env.example ]; then
      cp .env.example .env
      echo -e "${GREEN}✅ Created .env from .env.example${NC}"
    else
      touch .env
      echo -e "${GREEN}✅ Created empty .env file${NC}"
    fi
  fi
  
  echo "" >> .env
  echo "# Generated secrets $(date)" >> .env
  echo "BOT_API_SECRET=${BOT_API_SECRET}" >> .env
  echo "SESSION_SECRET=${SESSION_SECRET}" >> .env
  echo "TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}" >> .env
  echo "AUDIT_LOG_SECRET=${AUDIT_LOG_SECRET}" >> .env
  echo "CSRF_SECRET=${CSRF_SECRET}" >> .env
  
  echo -e "${GREEN}✅ Secrets appended to .env${NC}"
  echo -e "${YELLOW}⚠️  Remember to set other required variables (DATABASE_URL, TELEGRAM_BOT_TOKEN, etc.)${NC}"
else
  echo -e "${BLUE}ℹ️  Secrets not written. Copy them manually to your .env file.${NC}"
fi

echo ""
echo "======================================================================="
echo "SECURITY REMINDERS:"
echo "======================================================================="
echo "• Never commit .env to version control"
echo "• Set file permissions: chmod 600 .env"
echo "• Rotate secrets every 90 days"
echo "• Use different secrets for each environment"
echo "• Store production secrets in AWS Secrets Manager or Vault"
echo "======================================================================="
echo ""

echo -e "${GREEN}✅ Done!${NC}"
