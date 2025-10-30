# ☁️ S3 Backup Setup Guide

## Overview

Automated database backups to AWS S3 with retention policies and monitoring.

## Prerequisites

1. AWS Account
2. AWS CLI installed
3. PostgreSQL database running

## Step 1: Create S3 Bucket

### Using AWS Console

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. **Bucket name:** `outtime-database-backups` (must be globally unique)
4. **Region:** Select your preferred region (e.g., `us-east-1`)
5. **Block Public Access:** Keep enabled (✅ Block all public access)
6. **Versioning:** Enable (recommended for backup safety)
7. **Encryption:** Enable Server-side encryption (AES-256 or KMS)
8. Click "Create bucket"

### Using AWS CLI

```bash
# Create bucket
aws s3 mb s3://outtime-database-backups --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket outtime-database-backups \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket outtime-database-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

## Step 2: Configure Lifecycle Rules

Set up automatic deletion of old backups to manage costs.

### Using AWS Console

1. Go to your bucket → **Management** tab
2. Click "Create lifecycle rule"
3. **Rule name:** `Delete old backups`
4. **Rule scope:** Apply to all objects in the bucket
5. **Lifecycle rule actions:**
   - ✅ Transition current versions of objects
   - ✅ Expire current versions of objects
6. **Transitions:**
   - After 30 days → **Glacier Instant Retrieval** (for weekly backups)
   - After 90 days → **Glacier Deep Archive** (for monthly backups)
7. **Expiration:**
   - After 365 days → **Delete**
8. Click "Create rule"

### Using AWS CLI

```bash
cat > lifecycle-policy.json << 'EOF'
{
  "Rules": [
    {
      "Id": "Delete old daily backups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "production/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket outtime-database-backups \
  --lifecycle-configuration file://lifecycle-policy.json
```

## Step 3: Create IAM User for Backups

Create a dedicated IAM user with minimal permissions.

### Using AWS Console

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. **Users** → **Create user**
3. **User name:** `outtime-backup-user`
4. **Access type:** Access key - Programmatic access only
5. Click "Next"
6. **Attach policies:**
   - Create and attach custom policy (see below)
7. Click "Create user"
8. **Save the credentials:**
   - Access Key ID
   - Secret Access Key

### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::outtime-database-backups",
        "arn:aws:s3:::outtime-database-backups/*"
      ]
    }
  ]
}
```

### Using AWS CLI

```bash
# Create IAM user
aws iam create-user --user-name outtime-backup-user

# Create and attach policy
cat > backup-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::outtime-database-backups",
        "arn:aws:s3:::outtime-database-backups/*"
      ]
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name outtime-backup-user \
  --policy-name OutTimeBackupPolicy \
  --policy-document file://backup-policy.json

# Create access key
aws iam create-access-key --user-name outtime-backup-user
```

## Step 4: Configure AWS CLI

### On your server

```bash
# Install AWS CLI (if not installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output format: json

# Test access
aws s3 ls s3://outtime-database-backups/
```

### Alternative: Use environment variables

Add to `.env` (production):

```env
# S3 Backup Configuration
S3_BACKUP_BUCKET=outtime-database-backups
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_DEFAULT_REGION=us-east-1
```

## Step 5: Test Backup

```bash
# Run manual backup with S3 upload
./scripts/backup-database.sh production

# Check S3
aws s3 ls s3://outtime-database-backups/production/

# Download and verify
aws s3 cp \
  s3://outtime-database-backups/production/latest-backup.sql.gz \
  /tmp/test-backup.sql.gz

# Verify checksum
aws s3 cp \
  s3://outtime-database-backups/production/latest-backup.sql.gz.sha256 \
  /tmp/test-backup.sql.gz.sha256

sha256sum -c /tmp/test-backup.sql.gz.sha256
```

## Step 6: Setup Automated Backups

```bash
# Setup cron jobs for automated backups
./scripts/setup-backup-cron.sh production

# Verify cron jobs
crontab -l

# Check logs
tail -f logs/backup.log
```

## Step 7: Setup Monitoring (Optional)

### Sentry Crons

1. Go to [Sentry.io](https://sentry.io) → Your project
2. **Crons** → **Create Monitor**
3. **Name:** `Database Backup`
4. **Schedule:** `0 3 * * *` (daily at 3 AM)
5. **Timezone:** Your timezone
6. **Environment:** Production
7. Copy the **Check-in URL**

### Add to backup script

```bash
# Add to end of scripts/backup-database.sh

# Notify Sentry that backup completed
if [ ! -z "$SENTRY_CRON_CHECKIN_URL" ]; then
  curl -X POST "$SENTRY_CRON_CHECKIN_URL" \
    -H "Content-Type: application/json" \
    -d '{"status": "ok"}'
fi
```

Add to `.env`:

```env
SENTRY_CRON_CHECKIN_URL=https://sentry.io/api/0/organizations/.../monitors/.../checkins/
```

## Restoring from S3 Backup

### List available backups

```bash
# List all backups
aws s3 ls s3://outtime-database-backups/production/

# Find specific date
aws s3 ls s3://outtime-database-backups/production/ | grep 20250130
```

### Download and restore

```bash
# Download backup from S3
aws s3 cp \
  s3://outtime-database-backups/production/shiftmanager_production_20250130_120000.sql.gz \
  backups/production/

# Restore database
./scripts/restore-database.sh \
  backups/production/shiftmanager_production_20250130_120000.sql.gz \
  production \
  --yes
```

## Cost Estimation

### Storage Costs (us-east-1)

- **S3 Standard:** $0.023/GB/month
- **Glacier Instant Retrieval:** $0.004/GB/month
- **Deep Archive:** $0.00099/GB/month

### Example Cost (100GB database)

**Monthly backups:**
- Daily (7 days): 7 × 100GB × $0.023 = **$16.10**
- Weekly (4 weeks): 4 × 100GB × $0.004 = **$1.60**
- Monthly (12 months): 12 × 100GB × $0.00099 = **$1.19**

**Total:** ~**$19/month** for 100GB database

**Cost savings with lifecycle:**
- Without lifecycle: ~$276/month
- With lifecycle: ~$19/month
- **Savings: $257/month (93%)**

## Best Practices

1. **Test Restores Regularly**
   ```bash
   # Monthly restore test
   ./scripts/backup-database.sh production --test
   ```

2. **Monitor Backup Size**
   ```bash
   # Check backup growth
   aws s3 ls s3://outtime-database-backups/production/ \
     --summarize --recursive --human-readable
   ```

3. **Encrypt Backups**
   - S3 encryption: ✅ Enabled by default
   - pg_dump with password: ✅ Already implemented
   - Consider GPG encryption for extra security

4. **Multi-Region Replication** (for critical production):
   ```bash
   # Enable cross-region replication
   aws s3api put-bucket-replication \
     --bucket outtime-database-backups \
     --replication-configuration file://replication-config.json
   ```

5. **Backup Validation**
   - ✅ Checksum verification (SHA-256)
   - ✅ Metadata files (.meta)
   - ✅ Test restore before production deployment

## Troubleshooting

### Permission Denied

```bash
# Check IAM permissions
aws iam get-user-policy \
  --user-name outtime-backup-user \
  --policy-name OutTimeBackupPolicy

# Test S3 access
aws s3 ls s3://outtime-database-backups/
```

### Slow Uploads

```bash
# Use multipart upload for large files
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB
```

### Large Backup Files

```bash
# Compress more aggressively
gzip -9 # Already used in backup script

# Or use pg_dump custom format
pg_dump --format=custom --compress=9
```

## Alternative Storage Options

### Backblaze B2 (Cheaper)

- **Cost:** $0.005/GB/month (cheaper than S3)
- **S3-compatible API** (use same commands)

### Google Cloud Storage

```bash
# Install gsutil
curl https://sdk.cloud.google.com | bash

# Upload to GCS
gsutil cp backup.sql.gz gs://outtime-backups/
```

### Digital Ocean Spaces

```bash
# Configure AWS CLI for DO Spaces
aws configure set default.s3.endpoint_url https://nyc3.digitaloceanspaces.com

# Upload
aws s3 cp backup.sql.gz s3://outtime-backups/
```

## Security Checklist

- [ ] S3 bucket encryption enabled
- [ ] Bucket versioning enabled
- [ ] IAM user with minimal permissions
- [ ] Access keys stored securely (.env, not in git)
- [ ] Block public access enabled
- [ ] MFA for AWS root account
- [ ] Backup checksums verified
- [ ] Regular restore tests scheduled
- [ ] Monitoring alerts configured
- [ ] Lifecycle rules configured

---

**Status:** ✅ Ready for production  
**Last Updated:** October 30, 2025  
**Estimated Setup Time:** 30-60 minutes




