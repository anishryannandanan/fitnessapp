# 12. Security Model

The platform holds financial, health, and personal data for one gym business across many branches. Security centers on **authentication, role-based authorization, and branch-scoped data isolation** — all enforced server-side.

## 12.1 Authentication
- **Staff:** email/phone + password (hashed with argon2id/bcrypt). Optional 2FA (TOTP) for Owner/Manager.
- **Members:** OTP-first (phone), password optional.
- **Tokens:** short-lived access JWT (~15 min) + rotating refresh token (httpOnly, secure cookie or secure storage). Refresh rotation with reuse detection.
- **JWT claims:** `sub` (userId), `role`, `branchIds` (empty ⇒ owner/all), `businessId`, `iat/exp`.
- **Session controls:** device list, revoke all sessions, forced re-auth for sensitive actions (payroll approve, refunds, member data export).
- Provider (Clerk/Auth.js) handles credential/session mechanics; **authorization is always ours**.

## 12.2 Roles & permission matrix

Roles: **Owner, Branch Manager, Receptionist, Trainer, Dietician, Member.**

| Capability | Owner | Manager | Reception | Trainer | Member |
|---|:--:|:--:|:--:|:--:|:--:|
| Manage branches | ✅ | ❌ | ❌ | ❌ | ❌ |
| Switch/view all branches | ✅ | own only | own only | own only | home only |
| Manage packages/pricing | ✅ | ✅(own) | view | ❌ | view |
| Onboard/edit members | ✅ | ✅ | ✅ | ❌ | self-limited |
| View member medical/measurements | ✅ | ✅ | limited | assigned only | self |
| Collect payments / receipts | ✅ | ✅ | ✅ | ❌ | pay self |
| View revenue/expense/profit | ✅ | ✅(own) | ❌ | ❌ | ❌ |
| Manage expenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Payroll / salaries | ✅ | ✅(own) | ❌ | ❌ | ❌ |
| View salary data | ✅ | ✅(own) | ❌ | self payslip | ❌ |
| Manage staff | ✅ | ✅(own) | ❌ | ❌ | ❌ |
| Build workout/diet plans | ✅ | ✅ | ❌ | ✅(assigned) | ❌ |
| Log workouts/diet/progress | ❌ | ❌ | ❌ | on behalf | self |
| Attendance check-in/out | ✅ | ✅ | ✅ | ❌ | self |
| Broadcast announcements | all | own branch | ❌ | ❌ | ❌ |
| Reports & exports | all | own | ❌ | limited(own members) | ❌ |
| Settings (business) | ✅ | ❌ | ❌ | ❌ | ❌ |

Legend: ✅ full · "own" = assigned branch only · "assigned/self" = only own records.

## 12.3 Branch-scoped data isolation (the core control)
- Every operational query passes through a **BranchScopeGuard/interceptor** that injects an allowed-branch filter derived from the JWT `branchIds`.
- **Owner:** no filter, or explicit `branchId` / consolidated.
- **Manager/Reception/Trainer:** filter forced to their `branchIds`; a request naming another branch → **403** (never silently empty, to avoid ambiguity in audits — but list endpoints simply exclude).
- **Trainer extra scope:** additionally limited to **assigned members** for plan/progress/notes endpoints (join on `trainer_assignments`).
- **Member scope:** limited to **self** and read-only public data (own plans, own membership, own payments).
- Cross-branch check-in permitted only when `members.multi_branch_access = true`.
- Enforcement is **defense-in-depth**: guard (route) + service-level checks + optionally Postgres Row-Level Security policies keyed on a session variable (`app.branch_ids`, `app.role`).

## 12.4 Authorization implementation
- `@Roles('owner','manager')` decorator + `RolesGuard`.
- `@BranchScoped()` decorator + `BranchScopeGuard` (rejects/filters by branch).
- Resource-ownership checks in services (e.g., trainer↔member, member↔self).
- Deny-by-default: no role annotation ⇒ authenticated but no data access.

## 12.5 Data protection
- **In transit:** TLS 1.2+ everywhere; HSTS.
- **At rest:** DB encryption; sensitive fields (bank details, medical notes) additionally app-encrypted (AES-GCM) with keys in a secrets manager (KMS/Doppler/Vault).
- **PII/PHI:** medical + measurement data treated as sensitive; access logged; least-privilege exposure (reception sees limited medical).
- **Files:** private buckets; access via short-lived signed URLs; no public listing.
- **Secrets:** never in repo; `.env` validated at boot; rotated regularly.

## 12.6 Payments security
- Never store raw card data (PCI scope minimized — gateway-hosted checkout / tokenization).
- Webhooks verified by signature (`razorpay`/`stripe`); idempotent by `gateway_payment_id`.
- Amounts validated server-side against invoice; client-sent amounts never trusted.
- Refunds require Manager+ and are audit-logged.

## 12.7 Application security controls
- **Validation:** all input via Zod/DTO (`13-validation-rules.md`); reject unknown fields.
- **Rate limiting/throttling:** auth, OTP, payment, and export endpoints; per IP + identity.
- **CSRF:** for cookie-based sessions; SameSite=strict; CSRF tokens on state-changing forms.
- **XSS:** React escaping; sanitize rich text; strict CSP; no `dangerouslySetInnerHTML` without sanitizer.
- **SQLi:** parameterized queries via Prisma.
- **CORS:** allowlist FE origins only.
- **Headers:** CSP, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy.
- **File upload:** type/size validation, virus scan hook, image re-encoding to strip metadata.
- **Brute-force:** lockout/backoff after N failed logins; OTP attempt limits + expiry.

## 12.8 Auditing & monitoring
- `audit_logs` capture actor, action, entity, before/after for financial + permission changes (payments, refunds, payroll, role/branch changes, member data export/delete).
- Centralized logs (no PII in logs), error tracking (Sentry), alerting on anomalies (spikes in refunds, failed logins).

## 12.9 Privacy & compliance
- Consent captured for storing medical & photos during onboarding.
- Data export & deletion (member "right to be forgotten") with owner approval + audit.
- Retention policy configurable (see `14-business-rules.md`); anonymize instead of hard-delete where records tie to financial history.
- Role-appropriate visibility of health data (trainers only for assigned members).

## 12.10 Availability & resilience
- DB backups (daily + PITR); restore drills.
- Idempotent jobs; dead-letter queues; graceful degradation (if SMS provider down, fall back to push/email).
- Least-privilege infra IAM; staging separate from prod; no prod data in non-prod.
