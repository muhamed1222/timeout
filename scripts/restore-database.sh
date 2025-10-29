#!/bin/bash

# =============================================================================
# Database Restore Script
# =============================================================================
# Restores PostgreSQL database from backup file
# Usage: ./scripts/restore-database.sh <backup_file> [environment]
# Example: ./scripts/restore-database.sh backups/production/backup_20251029.sql.gz production
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ]; then
  echo -e "${RED}❌ ERROR: Backup file not specified${NC}"
  echo "Usage: $0 <backup_file> [environment]"
  echo "Example: $0 backups/production/backup_20251029.sql.gz production"
  exit 1
fi

BACKUP_FILE="$1"
ENVIRONMENT=${2:-development}

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ ERROR: Backup file not found: ${BACKUP_FILE}${NC}"
  exit 1
fi

echo -e "${BLUE}🔄 Database Restore${NC}\n"
echo "Backup file: ${BACKUP_FILE}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  export $(cat ".env" | grep -v '^#' | xargs)
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "User: ${DB_USER}"
echo ""

# Verify backup integrity
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo -e "${BLUE}🔐 Verifying backup integrity...${NC}"
  
  cd "$(dirname "$BACKUP_FILE")"
  sha256sum -c "$(basename "$BACKUP_FILE").sha256" > /dev/null 2>&1
  cd - > /dev/null
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup integrity verified${NC}\n"
  else
    echo -e "${RED}❌ ERROR: Backup integrity check failed${NC}"
    echo "The backup file may be corrupted. Aborting restore."
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  Warning: Checksum file not found. Skipping integrity check.${NC}\n"
fi

# Confirm restore
echo -e "${RED}⚠️  WARNING: This will REPLACE all data in database '${DB_NAME}'${NC}"
echo -e "${RED}   Current data will be LOST!${NC}"
echo ""
read -p "$(echo -e ${YELLOW}Are you sure you want to continue? Type 'yes' to confirm:${NC} )" -r

if [ "$REPLY" != "yes" ]; then
  echo -e "${BLUE}ℹ️  Restore cancelled${NC}"
  exit 0
fi

echo ""

# Create backup of current database before restore
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_BACKUP="backups/${ENVIRONMENT}/pre_restore_${TIMESTAMP}.sql.gz"

echo -e "${BLUE}📦 Creating safety backup of current database...${NC}"
mkdir -p "backups/${ENVIRONMENT}"

export PGPASSWORD="$DB_PASS"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  2>/dev/null | gzip > "$PRE_RESTORE_BACKUP"

unset PGPASSWORD

echo -e "${GREEN}✅ Safety backup created: ${PRE_RESTORE_BACKUP}${NC}\n"

# Drop all connections to database
echo -e "${BLUE}🔌 Terminating database connections...${NC}"

export PGPASSWORD="$DB_PASS"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF > /dev/null 2>&1
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();
EOF

unset PGPASSWORD

echo -e "${GREEN}✅ Connections terminated${NC}\n"

# Restore database
echo -e "${BLUE}🔄 Restoring database...${NC}"
echo "This may take several minutes..."
echo ""

export PGPASSWORD="$DB_PASS"

# Decompress and restore
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    2>&1 | grep -E "^(ERROR|CREATE|ALTER|COPY)" || true
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$BACKUP_FILE" \
    2>&1 | grep -E "^(ERROR|CREATE|ALTER|COPY)" || true
fi

RESTORE_EXIT_CODE=${PIPESTATUS[1]}

unset PGPASSWORD

if [ $RESTORE_EXIT_CODE -ne 0 ]; then
  echo -e "${RED}❌ ERROR: Restore failed${NC}"
  echo ""
  echo "You can restore from safety backup:"
  echo "  $0 ${PRE_RESTORE_BACKUP} ${ENVIRONMENT}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Database restored successfully${NC}\n"

# Verify restore
echo -e "${BLUE}✔️  Verifying restore...${NC}"

export PGPASSWORD="$DB_PASS"

# Check table count
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

# Check row counts in key tables
EMPLOYEE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM employee;" 2>/dev/null || echo "0")

SHIFT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM shift;" 2>/dev/null || echo "0")

unset PGPASSWORD

echo "Tables: ${TABLE_COUNT}"
echo "Employees: ${EMPLOYEE_COUNT}"
echo "Shifts: ${SHIFT_COUNT}"
echo ""

# Summary
echo "======================================================================="
echo -e "${GREEN}✅ RESTORE COMPLETED SUCCESSFULLY${NC}"
echo "======================================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Database: ${DB_NAME}"
echo "Restored from: ${BACKUP_FILE}"
echo "Safety backup: ${PRE_RESTORE_BACKUP}"
echo "======================================================================="
echo ""
echo -e "${BLUE}ℹ️  Next steps:${NC}"
echo "1. Verify application functionality"
echo "2. Check data integrity"
echo "3. If restore was unsuccessful, use safety backup:"
echo "   $0 ${PRE_RESTORE_BACKUP} ${ENVIRONMENT}"
echo ""
echo -e "${GREEN}✅ Done!${NC}"

