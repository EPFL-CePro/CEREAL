#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/.env}"

while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue

  key="${key#"${key%%[![:space:]]*}"}"
  key="${key%"${key##*[![:space:]]}"}"

  value="${value%$'\r'}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  export "$key=$value"
done < "$ENV_FILE"

CONTAINER="${MYSQL_CONTAINER:-cereal-app-db}"
DB="${MYSQL_DATABASE:?MYSQL_DATABASE is required in ${ENV_FILE}}"
USER="${MYSQL_BACKUP_USER:-root}"
if [[ -n "${MYSQL_BACKUP_PASSWORD:-}" ]]; then
  PASSWORD="${MYSQL_BACKUP_PASSWORD}"
elif [[ "$USER" == "root" ]]; then
  PASSWORD="${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required in ${ENV_FILE}}"
else
  PASSWORD="${MYSQL_PASSWORD:?MYSQL_PASSWORD is required in ${ENV_FILE}}"
fi
BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

DATE="$(date +'%Y-%m-%d_%H-%M-%S')"
OUT="${BACKUP_DIR}/${DB}_${DATE}.sql.gz"
TMP="${OUT}.tmp"

mkdir -p "$BACKUP_DIR"

docker exec -i \
  -e MYSQL_PWD="${PASSWORD}" \
  "$CONTAINER" \
  mysqldump \
    --no-defaults \
    --single-transaction \
    --set-gtid-purged=OFF \
    --quick \
    --routines \
    --triggers \
    -u "$USER" \
    "$DB" \
  | gzip -c > "$TMP"

mv "$TMP" "$OUT"

# Delete backups older than the configured retention period.
find "$BACKUP_DIR" -type f -name "${DB}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
