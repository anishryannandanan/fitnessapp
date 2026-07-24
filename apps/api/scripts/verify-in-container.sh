#!/usr/bin/env bash
# Runs INSIDE a node container that shares the postgres container's network
# namespace, so Postgres is reachable at 127.0.0.1:5432. Does a fresh install
# (so Prisma engines match the container platform), pushes schema, seeds,
# builds, starts the API, and smoke-tests the endpoints.
set -e

echo "### installing openssl + curl (needed by prisma + smoke tests) ###"
apt-get update -y >/tmp/apt.log 2>&1 && apt-get install -y openssl curl >>/tmp/apt.log 2>&1 || { tail -20 /tmp/apt.log; exit 1; }

mkdir -p /work && cd /work
cp -r /src/package.json /src/pnpm-lock.yaml /src/tsconfig.json /src/tsconfig.build.json /src/nest-cli.json /src/src /src/prisma /work/

export DATABASE_URL="postgresql://fitcore:fitcore@127.0.0.1:5432/fitcore?schema=public"
export JWT_SECRET="verification-secret-please-change-in-prod"
export CORS_ORIGIN="http://localhost:5173"
export PORT=3000
export NODE_ENV=development

echo "### installing deps (fresh, container-native engines) ###"
npm i -g pnpm@10 >/dev/null 2>&1
pnpm install >/tmp/install.log 2>&1 || { tail -30 /tmp/install.log; exit 1; }

echo "### prisma generate + db push ###"
pnpm prisma generate >/tmp/gen.log 2>&1 || { tail -30 /tmp/gen.log; exit 1; }
pnpm prisma db push --skip-generate >/tmp/push.log 2>&1 || { tail -40 /tmp/push.log; exit 1; }

echo "### seed ###"
pnpm seed 2>&1 | tail -8

echo "### build ###"
pnpm build >/tmp/build.log 2>&1 || { tail -40 /tmp/build.log; exit 1; }

echo "### start server ###"
node dist/main.js >/tmp/server.log 2>&1 &
SVR=$!
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "===== HEALTH ====="
curl -s http://127.0.0.1:3000/api/v1/health; echo
echo "===== LOGIN owner ====="
OWNER=$(curl -s -X POST http://127.0.0.1:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"owner@fitnessworld.in","password":"Owner@123"}')
echo "$OWNER" | head -c 400; echo
AT=$(printf '%s' "$OWNER" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo "===== GET /auth/me (owner) ====="
curl -s http://127.0.0.1:3000/api/v1/auth/me -H "Authorization: Bearer $AT"; echo
echo "===== GET /branches (owner => all 4) ====="
curl -s http://127.0.0.1:3000/api/v1/branches -H "Authorization: Bearer $AT"; echo
echo "===== LOGIN manager, GET /branches (scoped => 1) ====="
MT=$(curl -s -X POST http://127.0.0.1:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"manager.kochi@fitnessworld.in","password":"Staff@123"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
curl -s http://127.0.0.1:3000/api/v1/branches -H "Authorization: Bearer $MT"; echo
echo "===== POST /branches as manager (expect 403) ====="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST http://127.0.0.1:3000/api/v1/branches -H "Authorization: Bearer $MT" -H 'Content-Type: application/json' -d '{"name":"Test Branch","code":"TST"}'
echo "===== POST /branches as owner (expect 201) ====="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST http://127.0.0.1:3000/api/v1/branches -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"name":"Aluva","code":"ALV"}'
echo "===== unauthenticated /branches (expect 401) ====="
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/api/v1/branches

kill $SVR 2>/dev/null || true
echo "### DONE ###"
