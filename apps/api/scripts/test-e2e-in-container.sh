#!/usr/bin/env bash
# Runs INSIDE a node container that shares the postgres container's network
# namespace (Postgres reachable at 127.0.0.1:5432). Fresh install so Prisma
# engines match the container platform, then db push + seed + jest e2e.
set -e

echo "### installing openssl (needed by prisma) ###"
apt-get update -y >/tmp/apt.log 2>&1 && apt-get install -y openssl >>/tmp/apt.log 2>&1 || { tail -20 /tmp/apt.log; exit 1; }

mkdir -p /work && cd /work
cp -r /src/package.json /src/pnpm-lock.yaml /src/tsconfig.json /src/tsconfig.build.json /src/nest-cli.json /src/src /src/prisma /src/test /work/

export DATABASE_URL="postgresql://fitcore:fitcore@127.0.0.1:5432/fitcore?schema=public"
export JWT_SECRET="e2e-test-secret-please-change"
export CORS_ORIGIN="http://localhost:5173"
export PORT=3001
export NODE_ENV=test

echo "### install deps ###"
npm i -g pnpm@10 >/dev/null 2>&1
pnpm install >/tmp/install.log 2>&1 || { tail -30 /tmp/install.log; exit 1; }

echo "### prisma generate + db push + seed ###"
pnpm prisma generate >/tmp/gen.log 2>&1 || { tail -30 /tmp/gen.log; exit 1; }
pnpm prisma db push --skip-generate >/tmp/push.log 2>&1 || { tail -40 /tmp/push.log; exit 1; }
pnpm seed 2>&1 | tail -4

echo "### running e2e tests ###"
pnpm test:e2e
