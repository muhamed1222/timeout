#!/bin/bash

# =============================================================================
# Backup Verification Script
# =============================================================================
# Verifies backup integrity and restores to test database
# Usage: ./scripts/verify-backup.sh [backup_file] [environment]
# Example: ./scripts/verify-backup.sh backups/production/backup.sql.gz production
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
  echo -e "${RED}❌ ERROR: No backup file specified${NC}"
  echo "Usage: $0 <backup_file> [environment]"
  echo "Example: $0 backups/production/shiftmanager_production_20250130_120000.sql.gz production"
  exit 1
fi

BACKUP_FILE=$1
ENVIRONMENT=${2:-development}

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ ERROR: Backup file not found: ${BACKUP_FILE}${NC}"
  exit 1
fi

echo -e "${BLUE}🔍 Backup Verification${NC}\n"
echo "Backup file: ${BACKUP_FILE}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  export $(cat ".env" | grep -v '^#' | xargs)
fi

# Check DATABASE_URL is set
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

export PGPASSWORD="$DB_PASS"

# Test 1: Verify file exists and is readable
echo -e "${BLUE}📁 Test 1: File accessibility...${NC}"
if [ ! -r "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Backup file is not readable${NC}"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ File accessible: ${BACKUP_SIZE}${NC}\n"

# Test 2: Verify checksum
echo -e "${BLUE}🔐 Test 2: Checksum verification...${NC}"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [ -f "$CHECKSUM_FILE" ]; then
  if sha256sum -c "$CHECKSUM_FILE" > /dev/null 2>&1; then
    EXPECTED_CHECKSUM=$(cat "$CHECKSUM_FILE" | awk '{print $1}')
    echo -e "${GREEN}✅ Checksum verified: ${EXPECTED_CHECKSUM:0:16}...${NC}\n"
  else
    echo -e "${RED}❌ Checksum verification failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  No checksum file found, calculating new checksum...${NC}"
  NEW_CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
  echo "$NEW_CHECKSUM" > "$CHECKSUM_FILE"
  echo -e "${GREEN}✅ New checksum created: ${NEW_CHECKSUM:0:16}...${NC}\n"
fi

# Test 3: Verify backup is valid gzip
echo -e "${BLUE}🗜️  Test 3: Compression verification...${NC}"
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo -e "${GREEN}✅ Backup is valid gzip archive${NC}\n"
else
  echo -e "${RED}❌ Backup is not a valid gzip archive${NC}"
  exit 1
fi

# Test 4: Test restore to temporary database
echo -e "${BLUE}🔄 Test 4: Restore test (dry-run)...${NC}"
TEST_DB="backup_verify_$$"

# Create temporary test database
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${TEST_DB};" > /dev/null 2>&1 || {
  echo -e "${RED}❌ Failed to create test database${NC}"
  exit 1
}

# Restore backup
echo "Restoring backup to test database..."
gunzip -c "$BACKUP_FILE" | \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
  > /dev/null 2>&1 || {
  echo -e "${RED}❌ Restore failed${NC}"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE ${TEST_DB};" > /dev/null 2>&1 || true
  unset PGPASSWORD
  exit 1
}

# Test 5: Verify database schema
echo -e "${BLUE}✔️  Test 5: Schema verification...${NC}"

TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -eq "0" ]; then
  echo -e "${RED}❌ No tables found in restored database${NC}"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE ${TEST_DB};" > /dev/null 2>&1 || true
  unset PGPASSWORD
  exit 1
fi

echo -e "${GREEN}✅ Schema verified: ${TABLE_COUNT} tables${NC}\n"

# Test 6: Verify key tables
echo -e "${BLUE}📊 Test 6: Key tables verification...${NC}"

KEY_TABLES=("company" "employee" "shift" "violation")

for TABLE in "${KEY_TABLES[@]}"; do
  EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
    -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${TABLE}');" 2>/dev/null | tr -d ' ')
  
  if [ "$EXISTS" = "t" ]; then
    ROW_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
      -t -c "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ')
    echo "  ✅ ${TABLE}: ${ROW_COUNT} rows"
  else
    echo -e "  ${YELLOW}⚠️  ${TABLE}: not found${NC}"
  fi
done

echo ""

# Cleanup
echo -e "${BLUE}🗑️  Cleaning up test database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE ${TEST_DB};" > /dev/null 2>&1 || true

echo -e "${GREEN}✅ Test database cleaned up${NC}\n"

unset PGPASSWORD

# Summary
echo "======================================================================="
echo -e "${GREEN}✅ BACKUP VERIFICATION COMPLETED${NC}"
echo "======================================================================="
echo "Backup file: ${BACKUP_FILE}"
echo "Size: ${BACKUP_SIZE}"
echo "Tables: ${TABLE_COUNT}"
echo "Status: ✅ VERIFIED"
echo "======================================================================="
echo ""
echo -e "${GREEN}✅ Backup is valid and restorable!${NC}"



