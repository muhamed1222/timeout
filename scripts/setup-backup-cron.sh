#!/bin/bash

# =============================================================================
# Setup Automated Database Backup Cron Jobs
# =============================================================================
# Configures cron jobs for automated database backups
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}🔧 Setting up automated backup cron jobs${NC}\n"

# Check if running as correct user
CURRENT_USER=$(whoami)
echo "Current user: ${CURRENT_USER}"
echo "Environment: ${ENVIRONMENT}"
echo "Project root: ${PROJECT_ROOT}"
echo ""

# Confirm setup
read -p "$(echo -e ${YELLOW}Continue with cron setup? [y/N]:${NC} )" -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}ℹ️  Setup cancelled${NC}"
  exit 0
fi

echo ""

# Create cron job entries
BACKUP_SCRIPT="${PROJECT_ROOT}/scripts/backup-database.sh"
CRON_LOG_DIR="${PROJECT_ROOT}/logs"

# Create log directory
mkdir -p "${CRON_LOG_DIR}"

# Daily backup at 2 AM
DAILY_CRON="0 2 * * * cd ${PROJECT_ROOT} && ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${CRON_LOG_DIR}/backup-daily.log 2>&1"

# Weekly backup (Sunday at 3 AM)
WEEKLY_CRON="0 3 * * 0 cd ${PROJECT_ROOT} && ${BACKUP_SCRIPT} ${ENVIRONMENT} --test >> ${CRON_LOG_DIR}/backup-weekly.log 2>&1"

# Monthly backup (1st of month at 4 AM)
MONTHLY_CRON="0 4 1 * * cd ${PROJECT_ROOT} && ${BACKUP_SCRIPT} ${ENVIRONMENT} >> ${CRON_LOG_DIR}/backup-monthly.log 2>&1"

# Health check - verify backups exist (daily at 10 AM)
HEALTH_CHECK_CRON="0 10 * * * cd ${PROJECT_ROOT} && ${SCRIPT_DIR}/verify-backups.sh ${ENVIRONMENT} >> ${CRON_LOG_DIR}/backup-health.log 2>&1"

echo -e "${BLUE}📋 Cron jobs to be installed:${NC}\n"
echo "Daily backup (2 AM):"
echo "  ${DAILY_CRON}"
echo ""
echo "Weekly backup (Sunday 3 AM with test):"
echo "  ${WEEKLY_CRON}"
echo ""
echo "Monthly backup (1st of month, 4 AM):"
echo "  ${MONTHLY_CRON}"
echo ""
echo "Health check (10 AM):"
echo "  ${HEALTH_CHECK_CRON}"
echo ""

# Get current crontab
TEMP_CRON=$(mktemp)
crontab -l > "${TEMP_CRON}" 2>/dev/null || true

# Remove existing backup cron jobs
grep -v "backup-database.sh" "${TEMP_CRON}" > "${TEMP_CRON}.new" || true
grep -v "verify-backups.sh" "${TEMP_CRON}.new" > "${TEMP_CRON}.clean" || true
mv "${TEMP_CRON}.clean" "${TEMP_CRON}"

# Add new cron jobs
echo "" >> "${TEMP_CRON}"
echo "# ShiftManager Automated Backups (${ENVIRONMENT})" >> "${TEMP_CRON}"
echo "${DAILY_CRON}" >> "${TEMP_CRON}"
echo "${WEEKLY_CRON}" >> "${TEMP_CRON}"
echo "${MONTHLY_CRON}" >> "${TEMP_CRON}"
echo "${HEALTH_CHECK_CRON}" >> "${TEMP_CRON}"

# Install new crontab
crontab "${TEMP_CRON}"
rm "${TEMP_CRON}"

echo -e "${GREEN}✅ Cron jobs installed successfully${NC}\n"

# Verify installation
echo -e "${BLUE}📋 Current crontab:${NC}\n"
crontab -l | grep -A 5 "ShiftManager"
echo ""

# Create backup verification script
echo -e "${BLUE}📝 Creating backup verification script...${NC}"

cat > "${SCRIPT_DIR}/verify-backups.sh" << 'VERIFY_SCRIPT'
#!/bin/bash

# Backup Verification Script
# Checks that recent backups exist and are valid

set -e

ENVIRONMENT=${1:-production}
BACKUP_DIR="backups/${ENVIRONMENT}"
ALERT_EMAIL="${BACKUP_ALERT_EMAIL:-admin@example.com}"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup directory not found: $BACKUP_DIR"
  # Send alert email if configured
  if [ ! -z "$ALERT_EMAIL" ]; then
    echo "Backup directory missing for ${ENVIRONMENT}" | \
      mail -s "BACKUP ALERT: Directory Missing" "$ALERT_EMAIL"
  fi
  exit 1
fi

# Check for recent backups (within 48 hours)
RECENT_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime -2 | wc -l)

if [ "$RECENT_BACKUPS" -eq 0 ]; then
  echo "WARNING: No recent backups found (last 48 hours)"
  if [ ! -z "$ALERT_EMAIL" ]; then
    echo "No backups in last 48 hours for ${ENVIRONMENT}" | \
      mail -s "BACKUP ALERT: No Recent Backups" "$ALERT_EMAIL"
  fi
  exit 1
fi

echo "✅ Backup health check passed"
echo "   Recent backups: ${RECENT_BACKUPS}"

# Verify integrity of most recent backup
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T@ %p\n' | \
  sort -rn | head -1 | cut -d' ' -f2-)

if [ -f "${LATEST_BACKUP}.sha256" ]; then
  cd "$(dirname "$LATEST_BACKUP")"
  sha256sum -c "$(basename "$LATEST_BACKUP").sha256" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✅ Latest backup integrity verified"
    echo "   File: $(basename "$LATEST_BACKUP")"
  else
    echo "ERROR: Latest backup integrity check failed"
    if [ ! -z "$ALERT_EMAIL" ]; then
      echo "Backup integrity check failed for ${ENVIRONMENT}: ${LATEST_BACKUP}" | \
        mail -s "BACKUP ALERT: Integrity Check Failed" "$ALERT_EMAIL"
    fi
    exit 1
  fi
fi

exit 0
VERIFY_SCRIPT

chmod +x "${SCRIPT_DIR}/verify-backups.sh"

echo -e "${GREEN}✅ Verification script created${NC}\n"

# Test backup script
echo -e "${BLUE}🧪 Testing backup script...${NC}"
read -p "$(echo -e ${YELLOW}Run test backup now? [y/N]:${NC} )" -r

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  "${BACKUP_SCRIPT}" "${ENVIRONMENT}" --test
fi

# Summary
echo ""
echo "======================================================================="
echo -e "${GREEN}✅ AUTOMATED BACKUP SETUP COMPLETE${NC}"
echo "======================================================================="
echo ""
echo "Cron Schedule:"
echo "  • Daily backup:   2:00 AM"
echo "  • Weekly backup:  Sunday 3:00 AM (with restore test)"
echo "  • Monthly backup: 1st of month, 4:00 AM"
echo "  • Health check:   10:00 AM daily"
echo ""
echo "Logs:"
echo "  • Daily:   ${CRON_LOG_DIR}/backup-daily.log"
echo "  • Weekly:  ${CRON_LOG_DIR}/backup-weekly.log"
echo "  • Monthly: ${CRON_LOG_DIR}/backup-monthly.log"
echo "  • Health:  ${CRON_LOG_DIR}/backup-health.log"
echo ""
echo "Manual Commands:"
echo "  • Run backup:   ${BACKUP_SCRIPT} ${ENVIRONMENT}"
echo "  • Test backup:  ${BACKUP_SCRIPT} ${ENVIRONMENT} --test"
echo "  • Verify:       ${SCRIPT_DIR}/verify-backups.sh ${ENVIRONMENT}"
echo "  • View cron:    crontab -l"
echo "  • Edit cron:    crontab -e"
echo ""
echo "To receive email alerts, set environment variable:"
echo "  export BACKUP_ALERT_EMAIL=your-email@example.com"
echo ""
echo "======================================================================="
echo ""
echo -e "${GREEN}✅ Done!${NC}"

