# 9. Folder Structure

A **pnpm + Turborepo monorepo** with a Next.js frontend, a NestJS backend, and shared packages. (If you choose the Next.js-only MVP route from `08-technology-stack.md §10.2`, collapse `apps/api` into `apps/web/src/app/api` + a `worker` package — the module boundaries below still apply.)

```
fitcore/
├── apps/
│   ├── web/                         # Next.js 15 (App Router) — PWA
│   │   ├── public/
│   │   │   ├── icons/               # PWA icons, splash
│   │   │   └── manifest.webmanifest
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/          # sign-in, otp, forgot
│   │   │   │   ├── (owner)/         # dashboard, branches, reports, finance
│   │   │   │   ├── (branch)/        # manager routes
│   │   │   │   ├── (reception)/     # home, check-in, onboarding wizard, payments
│   │   │   │   ├── (trainer)/       # today, members, workout/diet builders
│   │   │   │   ├── (member)/        # home, workout, diet, progress, membership
│   │   │   │   ├── (shared)/        # profile, settings, notifications
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn primitives (button, card, sheet…)
│   │   │   │   ├── charts/          # KPI card, line/bar, heatmap
│   │   │   │   ├── forms/           # wizard steps, fields
│   │   │   │   ├── layout/          # app shell, bottom-nav, sidebar, branch-switcher
│   │   │   │   └── domain/          # MemberCard, WorkoutPlayer, DietMeal, ReceiptView…
│   │   │   ├── features/            # feature-scoped hooks + api + components
│   │   │   │   ├── members/
│   │   │   │   ├── memberships/
│   │   │   │   ├── payments/
│   │   │   │   ├── attendance/
│   │   │   │   ├── workouts/
│   │   │   │   ├── diet/
│   │   │   │   ├── progress/
│   │   │   │   ├── payroll/
│   │   │   │   ├── expenses/
│   │   │   │   ├── reports/
│   │   │   │   └── notifications/
│   │   │   ├── lib/                 # api client, query client, auth, formatters (money, dates)
│   │   │   ├── hooks/               # useBranch, useRole, usePermissions, useOffline
│   │   │   ├── stores/              # zustand (ui, branch-context, theme)
│   │   │   ├── providers/           # ThemeProvider, QueryProvider, AuthProvider
│   │   │   └── styles/              # tailwind tokens, theme
│   │   ├── next.config.mjs          # next-pwa config
│   │   └── package.json
│   │
│   └── api/                         # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/              # guards, interceptors, decorators, filters, pipes
│       │   │   ├── guards/          # JwtAuthGuard, RolesGuard, BranchScopeGuard
│       │   │   ├── decorators/      # @Roles, @CurrentUser, @BranchScoped
│       │   │   ├── interceptors/    # audit-log, response-envelope
│       │   │   └── filters/         # http-exception, validation
│       │   ├── config/              # env, throttler, swagger
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── business/
│       │   │   ├── branches/
│       │   │   ├── users/
│       │   │   ├── staff/
│       │   │   ├── members/
│       │   │   ├── onboarding/
│       │   │   ├── packages/
│       │   │   ├── memberships/
│       │   │   ├── billing/         # invoices, payments, installments, refunds
│       │   │   ├── payments-gateway/# razorpay, stripe, webhooks
│       │   │   ├── attendance/
│       │   │   ├── payroll/
│       │   │   ├── expenses/
│       │   │   ├── workouts/        # exercises, plans, logs, PRs
│       │   │   ├── diet/
│       │   │   ├── progress/
│       │   │   ├── trainer/         # assignments, notes, pt-sessions
│       │   │   ├── crm/             # enquiries, appointments
│       │   │   ├── notifications/   # fcm, sms, email, whatsapp, preferences
│       │   │   ├── reports/         # queries, exports (excel/csv/pdf)
│       │   │   ├── dashboards/
│       │   │   ├── inventory/
│       │   │   ├── uploads/         # pre-signed URLs
│       │   │   └── settings/
│       │   ├── jobs/                # BullMQ processors (payroll, reminders, recurring, exports)
│       │   └── prisma/              # PrismaService
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts              # seeds THE business + owner + demo branches
│       ├── test/                    # e2e (supertest)
│       └── package.json
│
├── packages/
│   ├── shared/                      # shared TS types, Zod schemas, enums, money utils
│   │   ├── src/schemas/             # onboarding, payment, member… (used FE+BE)
│   │   ├── src/types/
│   │   └── src/constants/
│   ├── ui/                          # optional shared component lib (if reused)
│   ├── config-eslint/
│   └── config-tsconfig/
│
├── docs/                            # THIS specification
├── .github/workflows/               # ci.yml (lint, typecheck, test, migrate, deploy)
├── docker-compose.yml               # postgres + redis for local dev
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

## 9.1 Conventions

- **Feature-first** on the frontend (`features/<domain>`), primitives in `components/ui`.
- **Module-per-domain** on the backend; each module = controller + service + dto + prisma access + tests.
- **Shared Zod schemas** in `packages/shared` are the single source of truth for validation on both client and server.
- **Barrel exports** kept minimal to avoid circular deps.
- **Env** validated at boot (Zod) via `config/`.
- **Money & date formatters** live only in `lib/` (web) and `shared` (server) — never inline.

## 9.2 Seed strategy (single-business constraint)

`prisma/seed.ts` inserts exactly one `businesses` row, one `owner` user, and (for demo) the four branches (Kochi, Kottayam, Ernakulam, Trivandrum), sample packages, exercises, and a few members. There is **no runtime path** to create a second business.
