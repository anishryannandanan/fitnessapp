# 8. REST API Documentation

Base URL: `/api/v1`. JSON only. All timestamps ISO-8601 UTC. Money in **minor units** (integer) + `currency`.

## 8.1 Conventions

- **Auth:** `Authorization: Bearer <access_token>` (JWT). Members may use OTP-issued tokens.
- **Branch scoping:** requests are auto-scoped by the caller's role/branch. The Owner may pass `?branchId=<uuid>` or `?branchId=all` (consolidated). Non-owners passing another branch → `403`.
- **Pagination:** `?page=1&limit=20` → response `{ data, meta: { page, limit, total, totalPages } }`.
- **Filtering/sorting:** `?sort=-created_at&status=active&from=2026-07-01&to=2026-07-31&q=fathima`.
- **Idempotency:** POST payment/onboarding accept `Idempotency-Key` header.
- **Errors:** consistent envelope:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "phone": "required" } } }
```
- **Status codes:** 200 OK, 201 Created, 204 No Content, 400 validation, 401 unauth, 403 forbidden (scope/role), 404 not found, 409 conflict (duplicate/idempotency), 422 business-rule, 429 rate-limit, 500.

## 8.2 Auth & session

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | all staff | email/phone + password → `{ accessToken, refreshToken, user }` |
| POST | `/auth/otp/request` | member | `{ phone }` → sends OTP |
| POST | `/auth/otp/verify` | member | `{ phone, code }` → tokens |
| POST | `/auth/refresh` | all | `{ refreshToken }` → new access token |
| POST | `/auth/logout` | all | revoke refresh token |
| POST | `/auth/forgot` | staff | `{ email }` → reset OTP |
| POST | `/auth/reset` | staff | `{ token, newPassword }` |
| GET | `/auth/me` | all | current user + role + branches + permissions |

## 8.3 Branches

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/branches` | owner | list branches |
| POST | `/branches` | owner | create branch |
| GET | `/branches/:id` | owner, manager(own) | detail |
| PATCH | `/branches/:id` | owner | update |
| POST | `/branches/:id/deactivate` | owner | soft-disable |
| GET | `/branches/:id/kpis?from&to` | owner, manager(own) | branch KPIs |

**POST /branches** body:
```json
{ "name":"Kochi", "code":"KCH", "address":"…", "phone":"…", "email":"…",
  "lat":9.93, "lng":76.26, "openingHours":{"mon":["06:00","22:00"]} }
```

## 8.4 Members & onboarding

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/members?q&status&trainerId&expiringInDays` | owner, manager, reception, trainer(assigned) | list/search |
| POST | `/members` | manager, reception | create (or draft) |
| GET | `/members/:id` | scoped | full profile aggregate |
| PATCH | `/members/:id` | manager, reception | update core |
| POST | `/members/onboard` | manager, reception | **atomic 8-step submit** |
| POST | `/members/:id/multi-branch-access` | owner | enable/disable visiting |
| GET | `/members/:id/timeline` | scoped | activity feed |
| POST | `/members/:id/documents` | manager, reception | upload doc |
| GET | `/members/lookup?qr|code|phone` | reception | check-in lookup |

**POST /members/onboard** (single atomic call; wizard may also PATCH a draft):
```json
{
  "branchId":"…",
  "personal":{ "fullName":"Fathima","phone":"+9198…","email":"…","gender":"female","dob":"1995-02-10","address":"…","emergencyContact":{"name":"…","phone":"…"},"photoUrl":"…" },
  "measurements":{ "heightCm":162,"weightG":68000,"bodyFatPct":30.1,"waistCm":80,"chestCm":92,"armsCm":28,"hipsCm":98,"thighsCm":54 },
  "goals":["weight_loss","general_fitness"],
  "medical":{ "injuries":[],"diseases":[],"allergies":["dust"],"medicines":[],"limitations":"" },
  "food":{ "dietPref":"vegetarian","foodAllergies":[],"waterIntakeMl":2500,"mealPreference":"3 meals" },
  "packageId":"…",
  "trainerId":"…",
  "payment":{ "method":"upi","amount":600000,"reference":"UTR123","installment":null }
}
```
→ `201 { member, membership, invoice, payment, membershipCardUrl }`.

## 8.5 Packages & memberships

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/packages?branchId&type&active` | owner, manager, reception | list |
| POST | `/packages` | owner, manager | create |
| PATCH | `/packages/:id` | owner, manager | update (price change doesn't affect past) |
| DELETE | `/packages/:id` | owner | deactivate |
| GET | `/memberships?memberId&status` | scoped | list |
| POST | `/memberships` | manager, reception | new membership |
| POST | `/memberships/:id/renew` | manager, reception | renew (stacking rule) |
| POST | `/memberships/:id/freeze` | manager, reception | freeze (reason, range) |
| POST | `/memberships/:id/cancel` | manager | cancel |
| POST | `/memberships/:id/upgrade` | manager, reception | prorated upgrade (P2) |

## 8.6 Payments, invoices, receipts

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/invoices?memberId&status&from&to` | scoped | list |
| GET | `/invoices/:id` | scoped | detail |
| GET | `/invoices/:id/pdf` | scoped | invoice PDF |
| POST | `/payments` | manager, reception | record manual payment |
| GET | `/payments?memberId&method&from&to` | scoped | history |
| GET | `/payments/:id/receipt` | scoped | receipt PDF/link |
| POST | `/payments/online/order` | member, reception | create Razorpay/Stripe order → `{ orderId, gatewayKey }` |
| POST | `/payments/online/verify` | member, reception | verify signature (fallback to webhook) |
| POST | `/webhooks/razorpay` | public(signed) | gateway webhook |
| POST | `/webhooks/stripe` | public(signed) | gateway webhook |
| GET | `/payments/outstanding?branchId&aging` | owner, manager | dues report |
| POST | `/refunds` | manager | record refund |

## 8.7 Attendance

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/attendance/check-in` | reception, member(self) | `{ memberId|qr|phone, branchId, method }` |
| POST | `/attendance/check-out` | reception, member(self) | close visit |
| GET | `/attendance?subject&branchId&date&memberId` | scoped | logs |
| GET | `/attendance/peak-hours?branchId&from&to` | owner, manager | hourly heatmap |
| POST | `/attendance/staff/check-in` | staff | staff clock-in |
| POST | `/staff-leaves` | manager | request/approve leave |

Check-in response includes membership validity + branch access + streak:
```json
{ "ok":true, "member":{…}, "membership":{"status":"active","daysLeft":18}, "streak":12, "warning":null }
```
Warnings: `"expired"`, `"branch_not_allowed"`, `"dues_pending"`.

## 8.8 Staff & payroll

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/staff?branchId&type` | owner, manager | list |
| POST | `/staff` | owner, manager | create staff + user |
| GET | `/staff/:id` | owner, manager | detail |
| PATCH | `/staff/:id` | owner, manager | update |
| GET | `/payroll?branchId&period` | owner, manager | payroll list (hidden from reception/trainer) |
| POST | `/payroll/run` | owner, manager | compute period draft |
| PATCH | `/payroll/:id` | owner, manager | adjust line items |
| POST | `/payroll/:id/approve` | owner, manager | approve |
| GET | `/payroll/:id/payslip` | owner, manager, self | payslip PDF |

## 8.9 Expenses

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/expenses?branchId&category&from&to` | owner, manager | list |
| POST | `/expenses` | owner, manager | create |
| PATCH | `/expenses/:id` | owner, manager | update |
| DELETE | `/expenses/:id` | owner, manager | remove |
| GET | `/finance/profit?branchId&period` | owner, manager | income − expense |

## 8.10 Workouts

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/exercises?q&muscle&equipment&difficulty` | trainer, member | library |
| POST | `/exercises` | owner, trainer | add exercise |
| GET | `/workout-plans?templateOnly&memberId` | trainer, member | list |
| POST | `/workout-plans` | trainer | create plan/template |
| PATCH | `/workout-plans/:id` | trainer | edit days/exercises |
| POST | `/workout-plans/:id/assign` | trainer | `{ memberIds[] }` |
| GET | `/members/:id/workouts/today` | member | today's plan |
| POST | `/workout-logs` | member | log a completed workout (sets, rating) |
| GET | `/members/:id/workout-history` | member, trainer | history + volume |
| GET | `/members/:id/prs` | member, trainer | personal records |

## 8.11 Diet

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/diet-plans?templateOnly&memberId` | trainer, member | list |
| POST | `/diet-plans` | trainer, dietician | create |
| PATCH | `/diet-plans/:id` | trainer, dietician | edit meals/macros |
| POST | `/diet-plans/:id/assign` | trainer, dietician | assign to member |
| GET | `/members/:id/diet/today` | member | today's meals |
| POST | `/diet-logs` | member | mark meal complete (+photo) |
| POST | `/water-logs` | member | add water |
| POST | `/diet-change-requests` | member | request changes |

## 8.12 Progress

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/members/:id/measurements?from&to` | member, trainer | series |
| POST | `/members/:id/measurements` | member, trainer | add entry |
| GET | `/members/:id/progress-photos` | member, trainer | list |
| POST | `/members/:id/progress-photos` | member, trainer | upload |

## 8.13 Trainer relationship

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/trainers/:id/members` | trainer(self), manager | assigned members |
| POST | `/trainer-assignments` | manager, reception | assign trainer↔member |
| POST | `/trainer-notes` | trainer | add note |
| GET | `/pt-sessions?trainerId&memberId&from&to` | trainer, member | sessions |
| POST | `/pt-sessions` | trainer | schedule |
| PATCH | `/pt-sessions/:id` | trainer | update status |

## 8.14 CRM

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/enquiries?branchId&status` | reception, manager | list |
| POST | `/enquiries` | reception | create lead |
| PATCH | `/enquiries/:id` | reception | update status/follow-up |
| POST | `/enquiries/:id/convert` | reception | → prefilled onboarding |
| GET/POST | `/appointments` | reception | schedule |

## 8.15 Notifications

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/notifications?unread` | all | my notifications |
| POST | `/notifications/:id/read` | all | mark read |
| GET/PATCH | `/notification-preferences` | all | per-type/channel toggles |
| POST | `/device-tokens` | all | register FCM token |
| POST | `/announcements` | owner, manager | broadcast (audience, channels, schedule) |
| GET | `/announcements` | owner, manager | list + delivery stats |

## 8.16 Reports

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/reports/revenue?branchId&from&to&groupBy` | owner, manager | revenue |
| GET | `/reports/expense?…` | owner, manager | expense |
| GET | `/reports/profit?…` | owner, manager | profit |
| GET | `/reports/attendance?…` | owner, manager | attendance |
| GET | `/reports/trainer?…` | owner, manager | trainer performance |
| GET | `/reports/member-growth?…` | owner, manager | growth |
| GET | `/reports/packages?…` | owner, manager | package sales |
| GET | `/reports/salary?…` | owner, manager | salary |
| GET | `/reports/payments?…` | owner, manager | payments |
| GET | `/reports/branch-comparison?metric&from&to` | owner | comparison |
| GET | `/reports/:type/export?format=excel|csv|pdf` | owner, manager | export |

## 8.17 Dashboards

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/dashboard/owner?branchId=all|<id>&period` | owner | consolidated/branch KPIs |
| GET | `/dashboard/branch?period` | manager | assigned branch KPIs |
| GET | `/dashboard/trainer` | trainer | today's sessions, members, reviews |
| GET | `/dashboard/reception` | reception | check-ins, renewals, payments, enquiries |
| GET | `/dashboard/member` | member | today's workout/diet/water/membership |

## 8.18 Settings

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET/PATCH | `/settings/business` | owner | business profile, currency, tax |
| GET/PATCH | `/settings/branches/:id` | owner | branch settings |
| GET/PATCH | `/settings/profile` | all | own profile, theme, language |

## 8.19 Rate limits & webhooks
- Auth/OTP endpoints rate-limited per IP + phone.
- Gateway webhooks verified by signature; idempotent by `gateway_payment_id`.
- File uploads use pre-signed URLs: `POST /uploads/sign` → `{ url, fields }` (Cloudinary/Supabase).
