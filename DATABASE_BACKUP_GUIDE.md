# 💾 Database Backup & Recovery Guide

## Overview

Comprehensive backup and recovery system for PostgreSQL database.

**Features:**
- ✅ Automated daily backups
- ✅ Compression & encryption
- ✅ Integrity verification (SHA-256)
- ✅ Retention policies
- ✅ S3 uploads
- ✅ Migration rollback
- ✅ Point-in-time recovery

---

## 🚀 Quick Start

### Manual Backup

```bash
# Backup production database
./scripts/backup-database.sh production

# Backup with integrity test
./scripts/backup-database.sh production --test
```

### Restore from Backup

```bash
# Restore production database
./scripts/restore-database.sh backups/production/backup_20251029.sql.gz production
```

### Rollback Migration

```bash
# Rollback last migration
./migrations/rollback.sh 1

# Rollback last 3 migrations
./migrations/rollback.sh 3
```

---

## 📁 Backup Structure

```
/timeout
├── backups/
│   ├── development/
│   │   ├── shiftmanager_dev_20251029_120000.sql.gz
│   │   ├── shiftmanager_dev_20251029_120000.sql.gz.sha256
│   │   └── shiftmanager_dev_20251029_120000.sql.gz.meta
│   ├── staging/
│   └── production/
├── scripts/
│   ├── backup-database.sh       # Manual backup
│   ├── restore-database.sh      # Restore from backup
│   └── cron-backup.sh          # Automated backup wrapper
└── migrations/
    └── rollback.sh              # Migration rollback
```

---

## 🛠️ Backup Scripts

### 1. backup-database.sh

**Purpose:** Create database backup with compression

**Usage:**
```bash
./scripts/backup-database.sh [environment] [--test]
```

**Features:**
- PostgreSQL dump with compression
- SHA-256 checksum
- Metadata file
- Integrity verification
- Optional S3 upload
- Retention policy

**Example:**
```bash
# Production backup
./scripts/backup-database.sh production

# With restore test
./scripts/backup-database.sh production --test
```

**Output:**
```
backups/production/
├── shiftmanager_prod_20251029_120000.sql.gz       # Compressed backup
├── shiftmanager_prod_20251029_120000.sql.gz.sha256 # Checksum
└── shiftmanager_prod_20251029_120000.sql.gz.meta   # Metadata
```

---

### 2. restore-database.sh

**Purpose:** Restore database from backup

**Usage:**
```bash
./scripts/restore-database.sh <backup_file> [environment]
```

**Features:**
- Integrity verification
- Safety backup before restore
- Connection termination
- Restore verification

**Example:**
```bash
./scripts/restore-database.sh \
  backups/production/backup_20251029.sql.gz \
  production
```

**Safety:**
- Creates pre-restore backup automatically
- Verifies backup integrity before restore
- Requires explicit confirmation

---

### 3. cron-backup.sh

**Purpose:** Automated backup via cron

**Setup:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/timeout/scripts/cron-backup.sh production
```

**Features:**
- Logging to file
- Log rotation (30 days)
- Email notifications
- Error handling

---

### 4. rollback.sh

**Purpose:** Rollback database migrations

**Usage:**
```bash
./migrations/rollback.sh [steps] [environment]
```

**Features:**
- Safety backup before rollback
- Multiple migration rollback
- Verification

**Example:**
```bash
# Rollback last migration
./migrations/rollback.sh 1 production

# Rollback last 3 migrations
./migrations/rollback.sh 3 production
```

---

## ⏰ Automated Backups

### Cron Configuration

```bash
# Edit crontab
crontab -e

# Add these lines:

# Daily backup at 2 AM
0 2 * * * /path/to/timeout/scripts/cron-backup.sh production

# Weekly full backup (Sunday 3 AM)
0 3 * * 0 /path/to/timeout/scripts/backup-database.sh production --test

# Hourly backup for high-traffic periods
0 */1 * * * /path/to/timeout/scripts/cron-backup.sh production
```

### Systemd Timer (Alternative)

**backup.service:**
```ini
[Unit]
Description=Database Backup
After=postgresql.service

[Service]
Type=oneshot
User=shiftmanager
WorkingDirectory=/path/to/timeout
ExecStart=/path/to/timeout/scripts/backup-database.sh production
StandardOutput=journal
StandardError=journal
```

**backup.timer:**
```ini
[Unit]
Description=Daily Database Backup
Requires=backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable:**
```bash
sudo systemctl enable backup.timer
sudo systemctl start backup.timer
```

---

## 📦 Retention Policy

### Default Retention

- **Daily:** 7 days
- **Weekly:** 4 weeks (28 days)
- **Monthly:** 1 year (365 days)

### Implementation

Retention is automatically applied by `backup-database.sh`:

```bash
# Remove daily backups older than 7 days
find backups/production -name "*.sql.gz" -mtime +7 -delete
```

### Custom Retention

Edit `backup-database.sh`:

```bash
# Configuration
DAILY_RETENTION=14      # 14 days
WEEKLY_RETENTION=60     # 2 months
MONTHLY_RETENTION=730   # 2 years
```

---

## ☁️ S3 Upload

### Configuration

```bash
# .env
S3_BACKUP_BUCKET=my-company-backups
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Automatic Upload

Backups are automatically uploaded to S3 if `S3_BACKUP_BUCKET` is set:

```bash
s3://my-company-backups/
└── production/
    ├── backup_20251029_120000.sql.gz
    ├── backup_20251029_120000.sql.gz.sha256
    └── backup_20251029_120000.sql.gz.meta
```

### Manual Upload

```bash
aws s3 cp \
  backups/production/backup_20251029.sql.gz \
  s3://my-bucket/production/ \
  --storage-class GLACIER_IR
```

### S3 Lifecycle Policy

```json
{
  "Rules": [
    {
      "Id": "Move to Glacier after 30 days",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    },
    {
      "Id": "Delete after 1 year",
      "Status": "Enabled",
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

## 🔐 Encryption

### At Rest (PostgreSQL)

```sql
-- Enable encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';
```

### Backup Encryption

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 \
  backups/production/backup.sql.gz

# Decrypt
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

### S3 Server-Side Encryption

```bash
aws s3 cp backup.sql.gz s3://bucket/ \
  --server-side-encryption AES256
```

---

## 🧪 Testing Backups

### Verify Backup Integrity

```bash
# Check checksum
cd backups/production
sha256sum -c backup_20251029.sql.gz.sha256
```

### Test Restore (Dry Run)

```bash
# Restore to test database
./scripts/backup-database.sh production --test
```

### Monthly Restore Test

```bash
#!/bin/bash
# test-restore.sh

# Get latest backup
LATEST_BACKUP=$(ls -t backups/production/*.sql.gz | head -n1)

# Create test database
createdb shiftmanager_test

# Restore
gunzip -c "$LATEST_BACKUP" | psql shiftmanager_test

# Verify
psql shiftmanager_test -c "SELECT COUNT(*) FROM employee;"

# Cleanup
dropdb shiftmanager_test

echo "✅ Restore test passed"
```

---

## 🔄 Point-in-Time Recovery

### Enable WAL Archiving

**postgresql.conf:**
```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /backups/wal/%f && cp %p /backups/wal/%f'
```

### Base Backup

```bash
pg_basebackup -D /backups/base -F tar -z -P
```

### Restore to Point in Time

```bash
# Restore base backup
tar -xzf /backups/base/base.tar.gz -C /var/lib/postgresql/data

# Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '2025-10-29 12:00:00'
EOF

# Start PostgreSQL
sudo systemctl start postgresql
```

---

## 📊 Monitoring

### Backup Success/Failure

```bash
# Check last backup
ls -lh backups/production/*.sql.gz | tail -n1

# Check backup age
find backups/production -name "*.sql.gz" -mtime -1 | wc -l
```

### Prometheus Metrics

```typescript
// server/lib/metrics.ts
export const backupSuccessGauge = new Gauge({
  name: 'shiftmanager_backup_success',
  help: 'Last backup success (1 = success, 0 = failure)',
});

export const backupAgeGauge = new Gauge({
  name: 'shiftmanager_backup_age_seconds',
  help: 'Age of last backup in seconds',
});
```

### Alerts

```yaml
# prometheus-alerts.yml
groups:
  - name: backup
    rules:
      - alert: BackupFailed
        expr: shiftmanager_backup_success == 0
        for: 1h
        annotations:
          summary: "Database backup failed"
          
      - alert: BackupTooOld
        expr: shiftmanager_backup_age_seconds > 86400
        annotations:
          summary: "No backup in 24 hours"
```

---

## 🐛 Troubleshooting

### Backup Failed

```bash
# Check disk space
df -h

# Check PostgreSQL access
psql $DATABASE_URL -c "SELECT version();"

# Check permissions
ls -la backups/
```

### Restore Failed

```bash
# Check backup integrity
sha256sum -c backup.sql.gz.sha256

# Try decompressing
gunzip -t backup.sql.gz

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log
```

### Migration Rollback Failed

```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"

# Manual rollback
psql $DATABASE_URL < migrations/down.sql

# Restore from backup
./scripts/restore-database.sh pre_rollback_backup.sql.gz
```

---

## ✅ Backup Checklist

### Daily
- [ ] Verify automated backup ran
- [ ] Check backup file size
- [ ] Verify S3 upload (if enabled)

### Weekly
- [ ] Test restore to staging
- [ ] Verify backup integrity
- [ ] Check disk space

### Monthly
- [ ] Full restore test
- [ ] Review retention policy
- [ ] Test migration rollback
- [ ] Audit backup security

### Quarterly
- [ ] Disaster recovery drill
- [ ] Update backup documentation
- [ ] Review and rotate encryption keys

---

## 📚 References

- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [AWS S3 Backup Best Practices](https://aws.amazon.com/blogs/storage/best-practices-for-using-amazon-s3-glacier-storage-classes/)
- [Database Backup Strategies](https://www.databasestar.com/database-backup-strategies/)

---

**Last Updated:** 2025-10-29  
**Version:** 1.0  
**Status:** ✅ Production-ready

