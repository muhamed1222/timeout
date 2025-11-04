#!/bin/bash

# =============================================================================
# Setup Backup Cron Job
# =============================================================================
# Configures automated database backups using cron
# Usage: ./scripts/setup-backup-cron.sh [environment]
# Example: ./scripts/setup-backup-cron.sh production
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
PROJECT_DIR=$(pwd)
BACKUP_SCRIPT="${PROJECT_DIR}/scripts/db/backup-database.sh"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/backup.log"

echo -e "${BLUE}🔄 Setting up automated backup cron job...${NC}\n"

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo -e "${RED}❌ ERROR: Backup script not found: ${BACKUP_SCRIPT}${NC}"
  exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"
echo -e "${GREEN}✅ Backup script is executable${NC}"

# Create logs directory
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✅ Logs directory created${NC}\n"

# Generate cron entries
echo -e "${BLUE}📝 Generating cron configuration...${NC}\n"

cat << EOF
# ==============================================================================
# ShiftManager Database Backup Cron Jobs
# ==============================================================================
# Generated: $(date)
# Environment: ${ENVIRONMENT}
# ==============================================================================

# Daily backup at 3:00 AM
0 3 * * * ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${LOG_FILE} 2>&1

# Weekly full backup (Sunday at 2:00 AM)
0 2 * * 0 ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${LOG_FILE} 2>&1

# Monthly backup (1st of month at 1:00 AM)
0 1 1 * * ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${LOG_FILE} 2>&1

# Log rotation (every Monday at 4:00 AM)
0 4 * * 1 gzip -9 ${LOG_FILE} && mv ${LOG_FILE}.gz ${LOG_DIR}/backup_\$(date +\%Y\%m\%d).log.gz && touch ${LOG_FILE}

# ==============================================================================
EOF

echo ""
echo -e "${YELLOW}⚠️  Would you like to install these cron jobs? (yes/no)${NC}"
read -p "> " INSTALL_CRON

if [ "$INSTALL_CRON" != "yes" ]; then
  echo -e "${YELLOW}❌ Installation cancelled${NC}"
  echo ""
  echo "To manually install, run:"
  echo "  crontab -e"
  echo ""
  echo "And add the cron entries shown above."
  exit 0
fi

# Install cron jobs
echo -e "${BLUE}🔧 Installing cron jobs...${NC}"

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Get existing crontab (if any)
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Remove existing ShiftManager backup entries
sed -i.bak '/ShiftManager Database Backup/,/^$/d' "$TEMP_CRON"

# Add new entries
cat >> "$TEMP_CRON" << EOF

# ==============================================================================
# ShiftManager Database Backup Cron Jobs
# ==============================================================================
# Generated: $(date)
# Environment: ${ENVIRONMENT}
# ==============================================================================

# Daily backup at 3:00 AM
0 3 * * * ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${LOG_FILE} 2>&1

# Weekly full backup (Sunday at 2:00 AM)
0 2 * * 0 ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${LOG_FILE} 2>&1

# Monthly backup (1st of month at 1:00 AM)
0 1 1 * * ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${LOG_FILE} 2>&1

# Log rotation (every Monday at 4:00 AM)
0 4 * * 1 gzip -9 ${LOG_FILE} && mv ${LOG_FILE}.gz ${LOG_DIR}/backup_\$(date +\%Y\%m\%d).log.gz && touch ${LOG_FILE}

# ==============================================================================

EOF

# Install new crontab
crontab "$TEMP_CRON"

# Cleanup
rm "$TEMP_CRON" "$TEMP_CRON.bak" 2>/dev/null || true

echo -e "${GREEN}✅ Cron jobs installed${NC}\n"

# Show installed cron jobs
echo -e "${BLUE}📋 Installed cron jobs:${NC}\n"
crontab -l | grep -A 20 "ShiftManager Database Backup"
echo ""

# Create test backup
echo -e "${YELLOW}Would you like to test the backup now? (yes/no)${NC}"
read -p "> " TEST_BACKUP

if [ "$TEST_BACKUP" == "yes" ]; then
  echo ""
  echo -e "${BLUE}🧪 Running test backup...${NC}\n"
  "$BACKUP_SCRIPT" "$ENVIRONMENT"
fi

# Summary
echo ""
echo "======================================================================="
echo -e "${GREEN}✅ BACKUP CRON SETUP COMPLETED${NC}"
echo "======================================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Backup script: ${BACKUP_SCRIPT}"
echo "Log file: ${LOG_FILE}"
echo ""
echo "Schedule:"
echo "  • Daily backup:   3:00 AM"
echo "  • Weekly backup:  Sunday 2:00 AM"
echo "  • Monthly backup: 1st of month 1:00 AM"
echo "  • Log rotation:   Monday 4:00 AM"
echo ""
echo "View logs:"
echo "  tail -f ${LOG_FILE}"
echo ""
echo "View cron jobs:"
echo "  crontab -l"
echo ""
echo "Remove cron jobs:"
echo "  crontab -e"
echo "======================================================================="
echo ""

echo -e "${GREEN}✅ Done!${NC}"
