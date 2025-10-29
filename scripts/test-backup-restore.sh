#!/bin/bash

# =============================================================================
# Backup & Restore Test Script
# =============================================================================
# Tests backup and restore functionality in safe environment
# Usage: ./scripts/test-backup-restore.sh [environment]
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENVIRONMENT=${1:-test}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_BACKUP="backups/test/test_backup_${TIMESTAMP}.sql.gz"

echo -e "${BLUE}🧪 Database Backup & Restore Test${NC}\n"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Load environment
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
  export $(cat ".env" | grep -v '^#' | xargs)
fi

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
echo ""

# Test 1: Create test database with sample data
echo -e "${BLUE}📝 Test 1: Creating test database...${NC}"

TEST_DB="backup_test_${TIMESTAMP}"
export PGPASSWORD="$DB_PASS"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${TEST_DB};" > /dev/null 2>&1

# Create sample table
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" <<EOF > /dev/null 2>&1
CREATE TABLE test_data (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_data (name) VALUES
  ('Test Record 1'),
  ('Test Record 2'),
  ('Test Record 3');
EOF

RECORD_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
  -t -c "SELECT COUNT(*) FROM test_data;")

echo -e "${GREEN}✅ Test database created with ${RECORD_COUNT} records${NC}\n"

# Test 2: Create backup
echo -e "${BLUE}📦 Test 2: Creating backup...${NC}"

mkdir -p "backups/test"

# Override DATABASE_URL for test database
ORIGINAL_DATABASE_URL="$DATABASE_URL"
export DATABASE_URL="${DATABASE_URL/$DB_NAME/$TEST_DB}"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$TEST_DB" \
  --format=plain \
  --no-owner \
  --no-acl \
  2>/dev/null | gzip > "$TEST_BACKUP"

BACKUP_SIZE=$(du -h "$TEST_BACKUP" | cut -f1)
echo -e "${GREEN}✅ Backup created: ${BACKUP_SIZE}${NC}\n"

# Restore DATABASE_URL
export DATABASE_URL="$ORIGINAL_DATABASE_URL"

# Test 3: Verify backup integrity
echo -e "${BLUE}🔐 Test 3: Verifying backup...${NC}"

# Create checksum
CHECKSUM=$(sha256sum "$TEST_BACKUP" | awk '{print $1}')
echo "$CHECKSUM" > "${TEST_BACKUP}.sha256"

# Verify checksum
cd "$(dirname "$TEST_BACKUP")"
sha256sum -c "$(basename "$TEST_BACKUP").sha256" > /dev/null 2>&1
cd - > /dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Backup integrity verified${NC}\n"
else
  echo -e "${RED}❌ Backup integrity check failed${NC}"
  exit 1
fi

# Test 4: Restore to new database
echo -e "${BLUE}🔄 Test 4: Testing restore...${NC}"

RESTORE_DB="backup_restore_test_${TIMESTAMP}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${RESTORE_DB};" > /dev/null 2>&1

# Restore backup
gunzip -c "$TEST_BACKUP" | \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$RESTORE_DB" \
  > /dev/null 2>&1

# Verify restored data
RESTORED_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$RESTORE_DB" \
  -t -c "SELECT COUNT(*) FROM test_data;")

if [ "$RESTORED_COUNT" -eq "$RECORD_COUNT" ]; then
  echo -e "${GREEN}✅ Restore successful: ${RESTORED_COUNT} records restored${NC}\n"
else
  echo -e "${RED}❌ Restore failed: expected ${RECORD_COUNT}, got ${RESTORED_COUNT}${NC}"
  exit 1
fi

# Test 5: Verify data integrity
echo -e "${BLUE}✔️  Test 5: Verifying data integrity...${NC}"

ORIGINAL_DATA=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" \
  -t -c "SELECT string_agg(name, ',' ORDER BY id) FROM test_data;")

RESTORED_DATA=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$RESTORE_DB" \
  -t -c "SELECT string_agg(name, ',' ORDER BY id) FROM test_data;")

if [ "$ORIGINAL_DATA" == "$RESTORED_DATA" ]; then
  echo -e "${GREEN}✅ Data integrity verified${NC}\n"
else
  echo -e "${RED}❌ Data mismatch detected${NC}"
  exit 1
fi

# Cleanup
echo -e "${BLUE}🗑️  Cleaning up test databases...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE ${TEST_DB};" > /dev/null 2>&1

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE ${RESTORE_DB};" > /dev/null 2>&1

# Keep backup file for inspection
echo -e "${GREEN}✅ Test databases cleaned up${NC}\n"

unset PGPASSWORD

# Summary
echo "======================================================================="
echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
echo "======================================================================="
echo ""
echo "Test Results:"
echo "  ✅ Backup creation"
echo "  ✅ Backup integrity (SHA256)"
echo "  ✅ Database restore"
echo "  ✅ Data integrity"
echo "  ✅ Record count match"
echo ""
echo "Test backup saved: ${TEST_BACKUP}"
echo "Backup size: ${BACKUP_SIZE}"
echo "Checksum: ${CHECKSUM:0:32}..."
echo ""
echo "======================================================================="
echo ""
echo -e "${GREEN}✅ Backup & Restore system is working correctly!${NC}"

