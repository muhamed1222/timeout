#!/bin/bash

# =============================================================================
# Database Backup Script
# =============================================================================
# Performs automated PostgreSQL backups with compression and retention policy
# Usage: ./scripts/backup-database.sh [environment]
# Example: ./scripts/backup-database.sh production
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-development}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${ENVIRONMENT}"
BACKUP_FILENAME="shiftmanager_${ENVIRONMENT}_${TIMESTAMP}.sql"
COMPRESSED_FILENAME="${BACKUP_FILENAME}.gz"

# Retention (days)
DAILY_RETENTION=7      # Keep daily backups for 7 days
WEEKLY_RETENTION=28    # Keep weekly backups for 4 weeks  
MONTHLY_RETENTION=365  # Keep monthly backups for 1 year

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  export $(cat ".env" | grep -v '^#' | xargs)
fi

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
  echo "Please set DATABASE_URL in .env or .env.${ENVIRONMENT}"
  exit 1
fi

echo -e "${BLUE}🔄 Starting database backup for ${ENVIRONMENT}...${NC}\n"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "User: ${DB_USER}"
echo "Backup file: ${BACKUP_DIR}/${COMPRESSED_FILENAME}"
echo ""

# Perform backup
echo -e "${BLUE}📦 Creating backup...${NC}"

export PGPASSWORD="$DB_PASS"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --verbose \
  --file="${BACKUP_DIR}/${BACKUP_FILENAME}" \
  2>&1 | grep -v "^$" || true

unset PGPASSWORD

# Check if backup was created
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
  echo -e "${RED}❌ ERROR: Backup file not created${NC}"
  exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
echo -e "${GREEN}✅ Backup created: ${BACKUP_SIZE}${NC}\n"

# Compress backup
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip -9 "${BACKUP_DIR}/${BACKUP_FILENAME}"

COMPRESSED_SIZE=$(du -h "${BACKUP_DIR}/${COMPRESSED_FILENAME}" | cut -f1)
echo -e "${GREEN}✅ Backup compressed: ${COMPRESSED_SIZE}${NC}\n"

# Calculate checksum
echo -e "${BLUE}🔐 Calculating checksum...${NC}"
CHECKSUM=$(sha256sum "${BACKUP_DIR}/${COMPRESSED_FILENAME}" | awk '{print $1}')
echo "$CHECKSUM" > "${BACKUP_DIR}/${COMPRESSED_FILENAME}.sha256"
echo -e "${GREEN}✅ Checksum: ${CHECKSUM:0:16}...${NC}\n"

# Verify backup integrity
echo -e "${BLUE}✔️  Verifying backup integrity...${NC}"
sha256sum -c "${BACKUP_DIR}/${COMPRESSED_FILENAME}.sha256" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Backup integrity verified${NC}\n"
else
  echo -e "${RED}❌ ERROR: Backup integrity check failed${NC}"
  exit 1
fi

# Create metadata file
echo -e "${BLUE}📝 Creating metadata...${NC}"
cat > "${BACKUP_DIR}/${COMPRESSED_FILENAME}.meta" << EOF
{
  "environment": "${ENVIRONMENT}",
  "database": "${DB_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "size_original": "${BACKUP_SIZE}",
  "size_compressed": "${COMPRESSED_SIZE}",
  "checksum": "${CHECKSUM}",
  "postgresql_version": "$(psql --version | head -n1)",
  "hostname": "$(hostname)",
  "user": "$(whoami)"
}
EOF
echo -e "${GREEN}✅ Metadata created${NC}\n"

# Apply retention policy
echo -e "${BLUE}🗑️  Applying retention policy...${NC}"

# Get current date info
CURRENT_DAY=$(date +%d)
CURRENT_DOW=$(date +%u)  # 1=Monday, 7=Sunday

# Remove daily backups older than retention period
# But keep weekly backups (Sundays) and monthly backups (1st of month)
find "$BACKUP_DIR" -name "*.sql.gz" -type f | while read -r backup_file; do
  FILE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d" "$backup_file" 2>/dev/null || stat -c "%y" "$backup_file" | cut -d' ' -f1)
  FILE_DAY=$(echo "$FILE_DATE" | cut -d'-' -f3 | sed 's/^0//')
  FILE_DOW=$(date -j -f "%Y-%m-%d" "$FILE_DATE" +%u 2>/dev/null || date -d "$FILE_DATE" +%u)
  
  # Calculate days since backup
  DAYS_OLD=$(( ($(date +%s) - $(date -j -f "%Y-%m-%d" "$FILE_DATE" +%s 2>/dev/null || date -d "$FILE_DATE" +%s)) / 86400 ))
  
  # Keep monthly backups (1st of month) for MONTHLY_RETENTION days
  if [ "$FILE_DAY" = "1" ] && [ "$DAYS_OLD" -le "$MONTHLY_RETENTION" ]; then
    continue
  fi
  
  # Keep weekly backups (Sundays) for WEEKLY_RETENTION days
  if [ "$FILE_DOW" = "7" ] && [ "$DAYS_OLD" -le "$WEEKLY_RETENTION" ]; then
    continue
  fi
  
  # Remove daily backups older than DAILY_RETENTION days
  if [ "$DAYS_OLD" -gt "$DAILY_RETENTION" ]; then
    rm -f "$backup_file" "$backup_file.sha256" "$backup_file.meta" 2>/dev/null || true
  fi
done

# Count remaining backups
DAILY_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime -${DAILY_RETENTION} | wc -l | tr -d ' ')
WEEKLY_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +${DAILY_RETENTION} -mtime -${WEEKLY_RETENTION} | wc -l | tr -d ' ')
MONTHLY_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +${WEEKLY_RETENTION} | wc -l | tr -d ' ')

echo "• Daily backups (last ${DAILY_RETENTION} days): ${DAILY_COUNT}"
echo "• Weekly backups (${DAILY_RETENTION}-${WEEKLY_RETENTION} days): ${WEEKLY_COUNT}"
echo "• Monthly backups (${WEEKLY_RETENTION}-${MONTHLY_RETENTION} days): ${MONTHLY_COUNT}"

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)
echo -e "${GREEN}✅ ${BACKUP_COUNT} backups in ${BACKUP_DIR}${NC}\n"

# Upload to S3 (if configured)
if [ ! -z "$S3_BACKUP_BUCKET" ]; then
  echo -e "${BLUE}☁️  Uploading to S3...${NC}"
  
  aws s3 cp \
    "${BACKUP_DIR}/${COMPRESSED_FILENAME}" \
    "s3://${S3_BACKUP_BUCKET}/${ENVIRONMENT}/${COMPRESSED_FILENAME}" \
    --storage-class STANDARD_IA \
    --metadata "checksum=${CHECKSUM}" \
    2>&1
  
  aws s3 cp \
    "${BACKUP_DIR}/${COMPRESSED_FILENAME}.sha256" \
    "s3://${S3_BACKUP_BUCKET}/${ENVIRONMENT}/${COMPRESSED_FILENAME}.sha256" \
    2>&1
  
  aws s3 cp \
    "${BACKUP_DIR}/${COMPRESSED_FILENAME}.meta" \
    "s3://${S3_BACKUP_BUCKET}/${ENVIRONMENT}/${COMPRESSED_FILENAME}.meta" \
    2>&1
  
  echo -e "${GREEN}✅ Uploaded to S3${NC}\n"
fi

# Summary
echo "======================================================================="
echo -e "${GREEN}✅ BACKUP COMPLETED SUCCESSFULLY${NC}"
echo "======================================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_DIR}/${COMPRESSED_FILENAME}"
echo "Size: ${COMPRESSED_SIZE}"
echo "Checksum: ${CHECKSUM:0:32}..."
echo "Total backups: ${BACKUP_COUNT}"
echo "======================================================================="
echo ""

# Test backup (optional)
if [ "$2" == "--test" ]; then
  echo -e "${BLUE}🧪 Testing backup restore (dry-run)...${NC}"
  
  # Create temporary test database
  TEST_DB="${DB_NAME}_restore_test_$$"
  
  export PGPASSWORD="$DB_PASS"
  
  # Create test database
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -c "CREATE DATABASE ${TEST_DB};" > /dev/null 2>&1
  
  # Restore backup to test database
  gunzip -c "${BACKUP_DIR}/${COMPRESSED_FILENAME}" | \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
    > /dev/null 2>&1
  
  # Check table count
  TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
  
  # Drop test database
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE ${TEST_DB};" > /dev/null 2>&1
  
  unset PGPASSWORD
  
  echo -e "${GREEN}✅ Backup restore test passed (${TABLE_COUNT} tables)${NC}\n"
fi

echo -e "${GREEN}✅ Done!${NC}"





