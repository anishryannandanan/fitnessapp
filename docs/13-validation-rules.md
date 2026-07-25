# 14. Validation Rules

Validation is defined once as **Zod schemas in `packages/shared`** and used on both client (React Hook Form) and server (NestJS DTO). Reject unknown fields. All money is integer minor units ≥ 0.

## 14.1 Global rules
- Trim strings; normalize phone to E.164; lowercase emails.
- Required fields must be non-empty after trim.
- Dates ISO-8601; server stores UTC; display in branch timezone.
- Money: integer ≥ 0; reject floats/negatives (refund handled separately as its own record).
- Enums validated against defined sets (see `06-database-schema.md`).
- IDs must be valid UUIDs and resolve within the caller's branch scope.

## 14.2 Auth
| Field | Rule |
|---|---|
| email | valid email; unique among staff |
| phone | E.164; unique; India default +91 (configurable) |
| password | ≥ 8 chars, ≥ 1 letter + 1 number; block common passwords; max 72 |
| OTP | 6 digits; expires 5 min; max 5 attempts; resend cooldown 30s |

## 14.3 Member onboarding
**Step 1 Personal**
- fullName: 2–80 chars, letters/spaces/.'-.
- mobile: E.164 required; duplicate → warn (offer existing).
- email: optional, valid if present.
- gender: enum.
- dob: valid date, age 12–100; age auto-derived (block < 12 with override note by manager).
- emergencyContact.phone: E.164; should differ from member's own phone (warn).
- photo: image ≤ 5MB, jpg/png/webp.

**Step 2 Measurements**
- heightCm: 80–250. weightG: 20,000–400,000 (20–400 kg).
- bmi auto = weight / (height²); stored, not user-entered.
- bodyFatPct: 1–70. waist/chest/arms/hips/thighs cm: 5–250; all optional but if present must be in range.

**Step 3 Goals:** ≥ 1 goal from enum (multi-select).
**Step 4 Medical:** arrays of short strings (≤ 120 chars each); limitations ≤ 500 chars; all optional.
**Step 5 Food:** dietPref enum; waterIntakeMl 250–10,000; allergies array optional.
**Step 6 Package:** must exist, be active, and belong to branch (or all-branch). Trainer package ⇒ Step 7 required.
**Step 7 Trainer:** must be an active trainer at the branch; capacity warning if over configured load.
**Step 8 Payment:** amount = package price + tax (or valid installment down payment); method enum; online requires successful gateway confirmation before activation.

## 14.4 Packages
- name 2–60; duration_days ≥ 1; price ≥ 0; tax_percent 0–50.
- pt_sessions ≥ 1 required when type=trainer/includes_trainer.
- branch_id null (all) or valid branch.

## 14.5 Memberships & renewals
- start_date ≤ end_date; end = start + duration_days.
- Renewal before expiry ⇒ new start = current end_date (stacking); after expiry ⇒ start = today.
- Freeze: from ≤ to, within active period; extends end_date by freeze length.
- Cannot activate membership with unpaid required amount unless installment plan created.

## 14.6 Payments & invoices
- amount ≥ 1; ≤ invoice balance_due (no overpay; excess handled as advance/credit — P2).
- method enum; online requires gateway order + verified signature/webhook.
- installment: sum(installments) + down_payment = total; each due_date future & ordered.
- receipt generated only for status=paid/partially_paid.
- refund amount ≤ paid amount; requires reason + Manager approval.

## 14.7 Attendance
- check-in requires resolvable member/staff in the branch scope.
- Reject duplicate open check-in (already checked in, not checked out) — either return existing or force checkout policy (business rule).
- check_out_at > check_in_at; duration computed.
- member check-in warns (not blocks by default) on expired membership; blocks on wrong branch if no multi-branch access (manager override allowed + logged).

## 14.8 Staff & payroll
- salary_type enum; corresponding rate required (monthly⇒base_salary, hourly⇒hourly_rate, commission⇒commission_percent 0–100, per_session⇒per_session_rate).
- payroll period_start ≤ period_end; net = base+commission+session+bonus−deduction ≥ 0 (block negative net; warn).
- payslip only for approved records.

## 14.9 Expenses
- amount ≥ 1; category enum; expense_date not in future beyond today (configurable); receipt image optional ≤ 5MB.
- recurring_rule valid RRULE/cron if present.

## 14.10 Workouts
- plan name 2–60; weeks 1–52; days_per_week 1–7.
- exercise sets 1–20; reps free text or 1–100; rest_sec 0–600.
- workout_log_sets: weight ≥ 0; reps 0–100; PR computed server-side (never trusted from client).
- rating 1–5.

## 14.11 Diet
- calories 0–10,000/day; protein/carbs/fat g 0–1,000; water_goal_ml 250–10,000.
- meal_type enum; items array.
- diet_log unique per (member, meal, date); photo ≤ 5MB.

## 14.12 Progress
- measurement ranges as §14.3 Step 2; recorded_at not in future.
- progress photo pose enum (front/side/back); ≤ 5MB.

## 14.13 Notifications
- announcement title ≤ 80, body ≤ 500; audience must resolve to ≥ 1 recipient; channels non-empty subset.
- scheduled_at ≥ now (if scheduled).

## 14.14 File uploads (all)
- Allowed: jpg/png/webp (images), pdf (documents). Max 5MB image / 10MB pdf (configurable).
- Server re-validates content-type; images re-encoded; store via signed URL only.

## 14.15 Error surfacing
- Field-level errors returned in `error.fields`; UI shows inline adjacent to field.
- Business-rule violations → 422 with human-readable message (e.g., "Cannot renew: package inactive").
