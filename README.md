# FitCore — Fitness & Gym Management Platform

A modern, mobile-first, **multi-branch** gym management platform for a **single gym business** (one owner, many branches). Not SaaS, not multi-tenant.

This is a **monorepo** with a React SPA frontend and a NestJS API backend, plus a full product & engineering specification.

## Structure

```
fitnessapp/
├── apps/
│   ├── web/    → React (Vite) SPA frontend  — see apps/web/README.md
│   └── api/    → NestJS + Fastify + Prisma + PostgreSQL backend
├── docs/       → Full product & engineering specification (20 deliverables)
└── README.md
```

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS, React Router, TanStack Query, PWA |
| Backend | NestJS (Fastify adapter) + Prisma + PostgreSQL, JWT auth |
| Docs | Markdown spec in `docs/` (vision, DB schema, API, security, roadmap…) |

## Getting started

### 1. Backend (`apps/api`)

```bash
cd apps/api
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
pnpm install
pnpm prisma generate
pnpm prisma migrate dev       # create schema (needs a running PostgreSQL)
pnpm seed                     # seed the single business + 4 branches + demo users
pnpm start:dev                # API at http://localhost:3000/api/v1
```

Need a local PostgreSQL? `bash apps/api/scripts/start-db.sh` starts one in Docker.

**Seeded logins:** `owner@fitnessworld.in` / `Owner@123` (owner, all branches) ·
`manager.kochi@fitnessworld.in` / `Staff@123` (manager, Kochi only).

### 2. Frontend (`apps/web`)

```bash
cd apps/web
cp .env.example .env          # set VITE_API_URL=http://localhost:3000 for real auth
pnpm install
pnpm dev                      # app at http://localhost:5173
```

If `VITE_API_URL` is empty, the frontend runs in **standalone demo mode** (mock data + role picker). When set, it authenticates against the real API.

## Slice 1 status (implemented)

- ✅ Single business + unlimited branches (seeded)
- ✅ JWT auth (login, `/auth/me`) with role + branch claims
- ✅ Role-based access control + **branch-scoped data isolation** (owner sees all; others scoped)
- ✅ Branches API (list/get scoped, create owner-only)
- ✅ React login wired to the real API (with demo fallback)

Next slices: members & onboarding, packages & memberships, payments, attendance, workouts/diet, reports. See `docs/18-development-roadmap.md`.
