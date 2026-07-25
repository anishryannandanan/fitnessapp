# FitCore API (backend)

NestJS backend using the **Fastify adapter** for high performance, with **Prisma + PostgreSQL** and JWT authentication. Implements the REST API specified in [`../../docs/07-api-documentation.md`](../../docs/07-api-documentation.md).

## Stack

- **NestJS 10** + **@nestjs/platform-fastify** — structured modules + fast HTTP layer
- **Prisma** ORM + **PostgreSQL**
- **@nestjs/jwt** for access/refresh tokens; **bcryptjs** password hashing
- **zod** for environment validation; **class-validator** for DTO validation

## Setup

```bash
cp .env.example .env          # configure DATABASE_URL, JWT_SECRET
pnpm install
pnpm prisma generate
pnpm prisma migrate dev       # apply schema to PostgreSQL
pnpm seed                     # seed business + branches + demo users
pnpm start:dev                # http://localhost:3000/api/v1
```

Local PostgreSQL via Docker: `bash scripts/start-db.sh`.

## Endpoints (Slice 1)

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/health` | public |
| POST | `/api/v1/auth/login` | public — `{ email, password }` → `{ accessToken, refreshToken, user }` |
| GET | `/api/v1/auth/me` | authenticated |
| GET | `/api/v1/branches` | authenticated — owner: all; others: their branch(es) |
| GET | `/api/v1/branches/:id` | authenticated — 403 if out of scope |
| POST | `/api/v1/branches` | owner only |

## Security model

- **JwtAuthGuard** (global) verifies the bearer token and attaches the user; routes opt out with `@Public()`.
- **RolesGuard** (global) enforces `@Roles(...)`.
- **Branch scoping** is enforced in services: the owner (empty `branchIds` claim) sees all branches; every other role is filtered to their assigned `branchIds`, and out-of-scope access returns `403`.

See [`../../docs/11-security-model.md`](../../docs/11-security-model.md).

## Structure

```
src/
  main.ts                 Fastify bootstrap, CORS, global validation, /api/v1 prefix
  app.module.ts           root module (config, prisma, auth, branches)
  config/env.ts           zod-validated environment
  prisma/                 PrismaModule + PrismaService
  common/                 guards (jwt, roles), decorators (Public, Roles, CurrentUser), types
  modules/
    auth/                 login + /me, JWT, DTOs
    branches/             branch CRUD (scoped)
prisma/
  schema.prisma           data model (Slice 1)
  seed.ts                 single business + 4 branches + demo users
scripts/                  start-db.sh, run-e2e.sh, verify-in-container.sh
```

## End-to-end verification

`bash scripts/run-e2e.sh` starts PostgreSQL and runs the full flow (migrate → seed → build → start → smoke-test login, `/auth/me`, branch scoping, and RBAC) inside a container. Used to validate Slice 1.
