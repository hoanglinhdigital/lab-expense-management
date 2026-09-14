#!/bin/sh
set -e

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Ap dung Prisma migration (migrate deploy)..."
  node_modules/.bin/prisma migrate deploy

  echo "[entrypoint] Seed du lieu mau (idempotent - an toan khi chay lai moi lan start)..."
  node_modules/.bin/prisma db seed
else
  echo "[entrypoint] RUN_DB_SEED=false - bo qua migrate/seed."
fi

echo "[entrypoint] Khoi dong Next.js server..."
exec "$@"
