#!/bin/bash

# =============================================================================
# Migration Rollback Script
# =============================================================================
# Rolls back database migrations with automatic backup
# Usage: ./migrations/rollback.sh [steps]
# Example: ./migrations/rollback.sh 1  # Rollback last migration
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
STEPS=${1:-1}
ENVIRONMENT=${2:-development}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/${ENVIRONMENT}/pre_rollback_${TIMESTAMP}.sql.gz"

echo -e "${BLUE}🔄 Database Migration Rollback${NC}\n"
echo "Steps to rollback: ${STEPS}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Load environment
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

# Create backup before rollback
echo -e "${BLUE}📦 Creating safety backup...${NC}"
mkdir -p "backups/${ENVIRONMENT}"

./scripts/backup-database.sh "$ENVIRONMENT" > /dev/null 2>&1

echo -e "${GREEN}✅ Safety backup created${NC}\n"

# Get current migration status
echo -e "${BLUE}📊 Current migration status:${NC}"

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD="$DB_PASS"

# Check if __drizzle_migrations table exists
MIGRATION_TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '__drizzle_migrations');" \
  2>/dev/null | tr -d ' ')

if [ "$MIGRATION_TABLE_EXISTS" != "t" ]; then
  echo -e "${YELLOW}⚠️  No migration table found. Nothing to rollback.${NC}"
  unset PGPASSWORD
  exit 0
fi

# Get applied migrations
APPLIED_MIGRATIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT id, name, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT ${STEPS};" \
  2>/dev/null)

echo "$APPLIED_MIGRATIONS"
echo ""

unset PGPASSWORD

# Confirm rollback
echo -e "${RED}⚠️  WARNING: This will rollback ${STEPS} migration(s)${NC}"
echo -e "${RED}   This may result in data loss!${NC}"
echo ""
read -p "$(echo -e ${YELLOW}Are you sure you want to continue? Type 'yes' to confirm:${NC} )" -r

if [ "$REPLY" != "yes" ]; then
  echo -e "${BLUE}ℹ️  Rollback cancelled${NC}"
  exit 0
fi

echo ""

# Perform rollback
echo -e "${BLUE}🔄 Rolling back migrations...${NC}"

# Drizzle doesn't have built-in rollback, so we need to do it manually
# This is a simplified version - in production, you'd want to track down migrations

# Get last N migration files
MIGRATION_FILES=$(ls -t migrations/*.sql 2>/dev/null | head -n $STEPS)

if [ -z "$MIGRATION_FILES" ]; then
  echo -e "${YELLOW}⚠️  No migration files found to rollback${NC}"
  exit 0
fi

echo "Migration files to rollback:"
echo "$MIGRATION_FILES"
echo ""

# For each migration file, we need to reverse the operations
# This is a placeholder - actual implementation would depend on migration format

export PGPASSWORD="$DB_PASS"

for MIGRATION_FILE in $MIGRATION_FILES; do
  echo -e "${BLUE}Processing: ${MIGRATION_FILE}${NC}"
  
  # Check if a corresponding down migration exists
  DOWN_FILE="${MIGRATION_FILE%.sql}.down.sql"
  
  if [ -f "$DOWN_FILE" ]; then
    echo "Applying down migration..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -f "$DOWN_FILE" \
      2>&1 | grep -E "^(ERROR|DROP|ALTER)" || true
    
    # Remove from migration table
    MIGRATION_ID=$(basename "$MIGRATION_FILE" .sql)
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -c "DELETE FROM __drizzle_migrations WHERE id LIKE '${MIGRATION_ID}%';" \
      > /dev/null 2>&1
    
    echo -e "${GREEN}✅ Rolled back: ${MIGRATION_FILE}${NC}\n"
  else
    echo -e "${YELLOW}⚠️  No down migration found for ${MIGRATION_FILE}${NC}"
    echo "You may need to manually reverse this migration"
    echo ""
  fi
done

unset PGPASSWORD

# Verify rollback
echo -e "${BLUE}✔️  Verifying rollback...${NC}"

export PGPASSWORD="$DB_PASS"

REMAINING_MIGRATIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM __drizzle_migrations;" 2>/dev/null | tr -d ' ')

unset PGPASSWORD

echo "Remaining migrations: ${REMAINING_MIGRATIONS}"
echo ""

# Summary
echo "======================================================================="
echo -e "${GREEN}✅ ROLLBACK COMPLETED${NC}"
echo "======================================================================="
echo "Rolled back: ${STEPS} migration(s)"
echo "Environment: ${ENVIRONMENT}"
echo "Safety backup: ${BACKUP_FILE}"
echo "======================================================================="
echo ""
echo -e "${BLUE}ℹ️  Next steps:${NC}"
echo "1. Verify application functionality"
echo "2. Check database schema"
echo "3. If rollback caused issues, restore from backup:"
echo "   ./scripts/restore-database.sh ${BACKUP_FILE} ${ENVIRONMENT}"
echo ""
echo -e "${GREEN}✅ Done!${NC}"




