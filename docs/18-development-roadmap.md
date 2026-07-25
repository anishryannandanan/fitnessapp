# 20. Development Roadmap

A phased plan to ship the MVP and evolve. Durations assume a small team (~2 FE, 2 BE, 1 designer, 1 QA/half PM); adjust to your capacity. Each sprint = 2 weeks.

## 20.1 Milestones overview

| Phase | Theme | Duration | Outcome |
|---|---|---|---|
| 0 | Foundations | 2 wks | Repo, CI/CD, auth, DB, design system |
| 1 | Members & Sales | 3 wks | Onboarding, packages, memberships, payments |
| 2 | Operations | 3 wks | Attendance, staff, payroll, expenses, profit |
| 3 | Training & Member App | 3 wks | Workouts, diet, progress, member PWA |
| 4 | Insight & Comms | 2 wks | Dashboards, reports/export, notifications |
| 5 | Hardening & Launch | 2 wks | QA, perf, security, PWA polish, go-live |
| 6+ | Phase 2 features | ongoing | SMS/WhatsApp, chat, inventory, offline… |

Total to MVP launch: **~15 weeks**.

## 20.2 Phase 0 — Foundations (Sprint 1)
- Monorepo (Turborepo + pnpm), Next.js + NestJS skeletons, `packages/shared` (Zod + types).
- Postgres + Prisma schema (core tables) + migrations + **seed** (business, owner, demo branches).
- Auth (Clerk/Auth.js) + JWT claims + **RolesGuard + BranchScopeGuard**.
- Design system: Tailwind tokens, shadcn/ui, theme (dark/light), app shell + bottom nav, KPI/card primitives.
- CI/CD (lint, typecheck, test, migrate, preview deploy), Sentry, `.env` validation.
- **Exit:** login as each role → role-based empty dashboard; branch switcher (owner).

## 20.3 Phase 1 — Members & Sales (Sprints 2–3, +½)
- Members CRUD + search + profile aggregate.
- **8-step onboarding wizard** (draft autosave, photo capture, validation).
- Packages CRUD; memberships + **renewals** (stacking); trainer assignment.
- Billing: invoices, **payments** (cash/card/UPI/bank), receipts (PDF/share), membership card (QR).
- **Razorpay online** payments + webhook reconciliation; basic installments.
- Outstanding + expiry/due alerts (data + list; delivery in Phase 4).
- **Exit:** onboard → pay → active membership → receipt, in < 4 min; renewals work.

## 20.4 Phase 2 — Operations (Sprints 4–5, +½)
- Attendance: QR/ID/phone/manual check-in/out, duration, peak-hours; staff attendance + leave.
- Staff management (all types) + documents.
- Payroll (monthly/hourly/commission/session, bonus/deduction, approve, payslip PDF).
- Expenses (categories, receipts) + **monthly profit** (branch + consolidated).
- **Exit:** manager runs payroll + sees branch profit; attendance heatmap populated.

## 20.5 Phase 3 — Training & Member App (Sprints 6–7, +½)
- Exercise library; workout plan/template builder; assign; member **workout player** + logging + PRs + rating.
- Diet builder (macros, water) + member meal completion + water tracker + change requests.
- Progress: measurements + charts + photos + before/after.
- Member PWA polish (home, membership, pay online, profile/preferences).
- **Exit:** trainer builds + assigns; member logs workout/diet/progress on phone.

## 20.6 Phase 4 — Insight & Comms (Sprint 8)
- Dashboards for all 5 roles (real KPIs).
- Reports (all 11) + filters + **Excel/CSV/PDF export** via jobs.
- Branch comparison (owner).
- Notifications: **FCM push + Email**, preferences, cron sweeps (expiry/dues/reminders/birthday), announcements/broadcast.
- **Exit:** owner sees reconciled consolidated + comparison reports; reminders fire.

## 20.7 Phase 5 — Hardening & Launch (Sprint 9)
- E2E tests (Playwright) for critical flows; load test dashboards/reports.
- Security pass: authz matrix tests, rate limits, headers/CSP, secrets, dependency audit.
- Performance budgets (LCP, bundle), image/media optimization, PWA offline shell + install prompt.
- Accessibility audit (AA), dark-mode QA, empty/error/offline states.
- Data backups + restore drill; runbooks; observability dashboards.
- Seed real business data; train staff; **go-live**.
- **Exit:** MVP acceptance (`17-mvp-and-future.md §18.3`) all green.

## 20.8 Phase 6+ — Post-launch (ongoing)
- **Sprint 10–11:** SMS + WhatsApp; membership freeze UI; upgrades/proration.
- **Sprint 12–13:** in-app chat; offline-first sync; advance credit/wallet.
- **Sprint 14–15:** inventory & equipment; advanced commission + clawback; recurring expenses.
- **Sprint 16+:** group classes/scheduling; scheduled report digests; wearables; challenges/streaks; referrals; native apps; AI features.

## 20.9 Cross-cutting workstreams (every phase)
- **Design → build handoff** one sprint ahead (Figma from `05` + `10`).
- **Testing** written with each feature (unit + integration); QA sign-off per phase.
- **Docs** kept in sync with `07-api-documentation.md` (OpenAPI) and schema.
- **Security & audit** reviewed each phase (authz + branch scope regression tests).

## 20.10 Risks & mitigations
| Risk | Mitigation |
|---|---|
| Payment/webhook edge cases | Idempotency + webhook-as-source-of-truth; sandbox testing |
| Branch data leakage | Guard + service checks + RLS; automated authz tests |
| Report performance at scale | Materialized views + caching + async export jobs |
| Onboarding too slow for front desk | Usability test the wizard early; minimize typing |
| Notification deliverability (SMS/WA) | Provider fallbacks; template pre-approval; retries |
| Scope creep beyond single-business mandate | Guardrails in `01`/`14`; no tenant/franchise paths |
