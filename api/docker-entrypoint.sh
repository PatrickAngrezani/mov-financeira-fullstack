#!/bin/sh
set -e

# Migrations run on start
echo "[entrypoint] aplicando migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] executando seed..."
  npx prisma db seed || echo "[entrypoint] seed indisponivel — seguindo sem ele"
fi

echo "[entrypoint] iniciando aplicacao..."
exec "$@"
