#!/bin/bash

# =============================================================================
# Database Restore Script
# =============================================================================
# Restores PostgreSQL database from a backup file
# Usage: ./scripts/restore-database.sh [backup_file] [environment]
# Example: ./scripts/restore-database.sh backups/production/backup.sql.gz production
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

echo -e "${BLUE}🔄 Starting database restore from backup...${NC}\n"

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

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Environment: ${ENVIRONMENT}"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "User: ${DB_USER}"
echo "Backup file: ${BACKUP_FILE}"
echo ""

# Verify checksum if available
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo -e "${BLUE}🔐 Verifying backup integrity...${NC}"
  sha256sum -c "${BACKUP_FILE}.sha256" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup integrity verified${NC}\n"
  else
    echo -e "${RED}❌ ERROR: Backup integrity check failed${NC}"
    exit 1
  fi
fi

# Warning
echo -e "${YELLOW}⚠️  WARNING: This will REPLACE all data in database '${DB_NAME}'${NC}"
echo -e "${YELLOW}   Environment: ${ENVIRONMENT}${NC}\n"

# Confirm unless --yes flag is provided
if [ "$3" != "--yes" ] && [ "$3" != "-y" ]; then
  read -p "Are you sure you want to continue? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Restore cancelled${NC}"
    exit 0
  fi
fi

# Create backup of current database before restore
echo -e "${BLUE}📦 Creating backup of current database...${NC}"
SAFETY_BACKUP="backups/${ENVIRONMENT}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
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
  | gzip -9 > "$SAFETY_BACKUP"

echo -e "${GREEN}✅ Safety backup created: ${SAFETY_BACKUP}${NC}\n"

# Drop all connections to database
echo -e "${BLUE}🔌 Dropping active connections...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF > /dev/null 2>&1
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();
EOF
echo -e "${GREEN}✅ Connections dropped${NC}\n"

# Drop and recreate database
echo -e "${BLUE}🗑️  Dropping database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS ${DB_NAME};" > /dev/null 2>&1
echo -e "${GREEN}✅ Database dropped${NC}\n"

echo -e "${BLUE}🏗️  Creating database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE ${DB_NAME};" > /dev/null 2>&1
echo -e "${GREEN}✅ Database created${NC}\n"

# Restore from backup
echo -e "${BLUE}📥 Restoring from backup...${NC}"
echo "This may take a few minutes depending on database size..."
echo ""

if [[ "$BACKUP_FILE" == *.gz ]]; then
  # Compressed backup
  gunzip -c "$BACKUP_FILE" | \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    2>&1 | grep -v "^$" || true
else
  # Uncompressed backup
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$BACKUP_FILE" \
    2>&1 | grep -v "^$" || true
fi

unset PGPASSWORD

echo ""
echo -e "${GREEN}✅ Database restored${NC}\n"

# Verify restore
echo -e "${BLUE}✔️  Verifying restore...${NC}"

export PGPASSWORD="$DB_PASS"

# Count tables
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

# Count rows in main tables
COMPANIES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM company;" 2>/dev/null || echo "0")
EMPLOYEES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM employee;" 2>/dev/null || echo "0")
SHIFTS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM shift;" 2>/dev/null || echo "0")

unset PGPASSWORD

echo "Tables: ${TABLE_COUNT}"
echo "Companies: ${COMPANIES_COUNT}"
echo "Employees: ${EMPLOYEES_COUNT}"
echo "Shifts: ${SHIFTS_COUNT}"
echo -e "${GREEN}✅ Restore verified${NC}\n"

# Summary
echo "======================================================================="
echo -e "${GREEN}✅ RESTORE COMPLETED SUCCESSFULLY${NC}"
echo "======================================================================="
echo "Environment: ${ENVIRONMENT}"
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_FILE}"
echo "Tables: ${TABLE_COUNT}"
echo "Safety backup: ${SAFETY_BACKUP}"
echo "======================================================================="
echo ""
echo -e "${YELLOW}Note: If something went wrong, restore from:${NC}"
echo -e "${YELLOW}  ${SAFETY_BACKUP}${NC}"
echo ""

echo -e "${GREEN}✅ Done!${NC}"
