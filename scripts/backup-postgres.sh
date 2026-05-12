#!/usr/bin/env bash
#
# scripts/backup-postgres.sh — Daily Postgres backup with retention.
#
# Designed to run on the production host as a cron job. Reads connection
# parameters from DATABASE_URL (same env var the app uses, so there's only
# one source of truth). Writes compressed dumps to BACKUP_DIR with a
# rolling retention policy.
#
# Usage:
#   ./scripts/backup-postgres.sh
#
# Recommended cron entry (daily 03:00 server time):
#   0 3 * * * cd /srv/biomax && DATABASE_URL=... BACKUP_DIR=/srv/backups \
#     ./scripts/backup-postgres.sh >> /var/log/biomax-backup.log 2>&1
#
# Required env:
#   DATABASE_URL          Postgres connection string (postgresql://...).
#
# Optional env:
#   BACKUP_DIR            Directory for dump files. Default: ./backups
#   RETENTION_DAILY       Daily backups to keep. Default: 7
#   RETENTION_WEEKLY      Weekly backups (Sunday) to keep. Default: 8
#   RETENTION_MONTHLY     Monthly backups (1st of month) to keep. Default: 12
#   PG_DUMP               Path to pg_dump. Default: pg_dump (uses PATH).
#
# Exit codes:
#   0   success
#   1   missing DATABASE_URL
#   2   pg_dump not found
#   3   pg_dump command failed
#
# Test restore (quarterly drill, separate from this script):
#   createdb biomax_restore_test
#   pg_restore --clean --if-exists --no-owner -d biomax_restore_test \
#     <(zstd -dc backups/daily/biomax-YYYY-MM-DD.dump.zst)
#
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set" >&2
  exit 1
fi

PG_DUMP="${PG_DUMP:-pg_dump}"
if ! command -v "$PG_DUMP" >/dev/null 2>&1; then
  echo "ERROR: $PG_DUMP not found on PATH" >&2
  exit 2
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-8}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-12}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

DATE_STAMP="$(date +%Y-%m-%d)"
DAY_OF_WEEK="$(date +%u)"   # 1 = Monday … 7 = Sunday
DAY_OF_MONTH="$(date +%d)"

DAILY_FILE="$BACKUP_DIR/daily/biomax-${DATE_STAMP}.dump"

echo "[$(date -Iseconds)] Starting backup → $DAILY_FILE"

# Custom format (-Fc) is compressed, supports parallel restore, and is the
# canonical "production" dump format. We still pipe through zstd for an extra
# ~30 % compression on top.
"$PG_DUMP" --format=custom --no-owner --no-privileges \
  "$DATABASE_URL" > "$DAILY_FILE"

if command -v zstd >/dev/null 2>&1; then
  zstd --rm -19 -T0 -q "$DAILY_FILE"
  DAILY_FILE="${DAILY_FILE}.zst"
fi

# Promote on Sunday → weekly, on the 1st → monthly. Hard-link so we don't
# duplicate bytes; the underlying file lives once on disk.
if [[ "$DAY_OF_WEEK" == "7" ]]; then
  ln -f "$DAILY_FILE" "$BACKUP_DIR/weekly/$(basename "$DAILY_FILE")"
fi
if [[ "$DAY_OF_MONTH" == "01" ]]; then
  ln -f "$DAILY_FILE" "$BACKUP_DIR/monthly/$(basename "$DAILY_FILE")"
fi

# Retention sweeps — keep only the N most recent files in each tier.
prune_dir() {
  local dir="$1" keep="$2"
  # shellcheck disable=SC2012  # ls is fine for date-sorted, simple filenames
  ls -1t "$dir"/biomax-*.dump* 2>/dev/null | tail -n "+$((keep + 1))" \
    | xargs -r rm -f
}
prune_dir "$BACKUP_DIR/daily"   "$RETENTION_DAILY"
prune_dir "$BACKUP_DIR/weekly"  "$RETENTION_WEEKLY"
prune_dir "$BACKUP_DIR/monthly" "$RETENTION_MONTHLY"

SIZE="$(du -h "$DAILY_FILE" | awk '{print $1}')"
echo "[$(date -Iseconds)] Backup complete: $DAILY_FILE ($SIZE)"
