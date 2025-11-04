#!/bin/bash

# =============================================================================
# Cron Backup Script
# =============================================================================
# Wrapper for automated backups via cron
# Add to crontab: 0 2 * * * /path/to/cron-backup.sh production
# =============================================================================

set -e

# Configuration
PROJECT_DIR="/path/to/timeout"
LOG_DIR="${PROJECT_DIR}/logs"
ENVIRONMENT=${1:-production}
LOG_FILE="${LOG_DIR}/backup_${ENVIRONMENT}_$(date +%Y%m%d).log"

# Create log directory
mkdir -p "$LOG_DIR"

# Navigate to project directory
cd "$PROJECT_DIR"

# Execute backup with logging
{
  echo "======================================================================="
  echo "Automated Backup - $(date)"
  echo "======================================================================="
  
  ./scripts/db/backup-database.sh "$ENVIRONMENT"
  
  echo ""
  echo "======================================================================="
  echo "Backup completed - $(date)"
  echo "======================================================================="
} >> "$LOG_FILE" 2>&1

# Rotate logs (keep last 30 days)
find "$LOG_DIR" -name "backup_*.log" -type f -mtime +30 -delete

# Send notification (optional)
if [ $? -eq 0 ]; then
  # Success
  echo "Database backup completed successfully" | \
    mail -s "✅ Backup Success: ${ENVIRONMENT}" admin@example.com || true
else
  # Failure
  echo "Database backup failed. Check ${LOG_FILE}" | \
    mail -s "❌ Backup Failed: ${ENVIRONMENT}" admin@example.com || true
fi







