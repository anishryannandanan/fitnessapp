#!/usr/bin/env bash
# Starts a local PostgreSQL container for development/verification.
set -e
NAME=fitcore-pg
docker rm -f "$NAME" >/dev/null 2>&1 || true
# Use host networking (works with rootless podman where port publishing doesn't bind)
docker run -d --name "$NAME" --network host \
  -e POSTGRES_USER=fitcore \
  -e POSTGRES_PASSWORD=fitcore \
  -e POSTGRES_DB=fitcore \
  postgres:16-alpine >/dev/null
echo "container started"
for i in $(seq 1 40); do
  if docker exec "$NAME" pg_isready -U fitcore >/dev/null 2>&1; then
    echo "postgres ready after ${i}s"
    exit 0
  fi
  sleep 1
done
echo "postgres did not become ready in time" >&2
exit 1
