#!/usr/bin/env bash
# Orchestrates e2e tests without host<->container networking: starts Postgres,
# then runs a Node container that JOINS the Postgres network namespace and
# executes the jest e2e suite (see test-e2e-in-container.sh).
set -e
API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
docker rm -f fitcore-pg-test fitcore-e2e >/dev/null 2>&1 || true

echo ">> starting postgres"
docker run -d --name fitcore-pg-test \
  -e POSTGRES_USER=fitcore -e POSTGRES_PASSWORD=fitcore -e POSTGRES_DB=fitcore \
  postgres:16-alpine >/dev/null
for i in $(seq 1 40); do
  docker exec fitcore-pg-test pg_isready -U fitcore >/dev/null 2>&1 && { echo ">> postgres ready (${i}s)"; break; }
  sleep 1
done

echo ">> running e2e test container (shares pg netns)"
docker run --rm --name fitcore-e2e \
  --network "container:fitcore-pg-test" \
  -v "${API_DIR}:/src:ro" \
  node:22-bookworm-slim \
  bash /src/scripts/test-e2e-in-container.sh
STATUS=$?

docker rm -f fitcore-pg-test >/dev/null 2>&1 || true
exit $STATUS
