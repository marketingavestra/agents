#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "[erro] docker-compose não encontrado. Instale antes e tente novamente."
  exit 1
fi

echo "[dev] Subindo containers (build se necessário)..."
docker-compose up -d --build

echo "[dev] Verificando saúde dos serviços (até 30s)..."
for i in {1..30}; do
  BE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 || true)
  FE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)
  printf "[dev] tentativa %02d: backend=%s frontend=%s\n" "$i" "$BE" "$FE"
  if [ "$BE" = "200" ] || [ "$BE" = "404" ]; then
    echo "[dev] Backend parece online (HTTP $BE)"
    break
  fi
  sleep 1
done

echo "[dev] Seguindo logs em tempo real (Ctrl+C para sair)"
docker-compose logs -f --tail=100
