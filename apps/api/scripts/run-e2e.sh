#!/usr/bin/env bash
# Orchestrates the end-to-end verification without relying on host<->container
# networking: starts Postgres, then runs a Node container that JOINS the
# Postgres network namespace and executes verify-in-container.sh.
set -e
API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
docker rm -f fitcore-pg fitcore-verify >/dev/null 2>&1 || true

echo ">> starting postgres"
docker run -d --name fitcore-pg \
  -e POSTGRES_USER=fitcore -e POSTGRES_PASSWORD=fitcore -e POSTGRES_DB=fitcore \
  postgres:16-alpine >/dev/null
for i in $(seq 1 40); do
  docker exec fitcore-pg pg_isready -U fitcore >/dev/null 2>&1 && { echo ">> postgres ready (${i}s)"; break; }
  sleep 1
done

echo ">> running verification container (shares pg netns)"
docker run --rm --name fitcore-verify \
  --network "container:fitcore-pg" \
  -v "${API_DIR}:/src:ro" \
  node:22-bookworm-slim \
  bash /src/scripts/verify-in-container.sh
