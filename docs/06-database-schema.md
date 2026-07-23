# 7. Database Schema (PostgreSQL)

Relational schema for a **single-business, multi-branch** platform. Conventions:

- All PKs are `uuid` (`gen_random_uuid()` / `pgcrypto`).
- All tables have `created_at timestamptz default now()`, `updated_at timestamptz`, and (where soft-delete applies) `deleted_at timestamptz`.
- **Money** stored as `integer` minor units (paise) + `currency char(3)`; never floats.
- Multi-branch: operational tables carry `branch_id` (FK → `branches`).
- Enums implemented as Postgres `enum` types (or `text` + `CHECK`).
- Indexes listed per table; every FK is indexed.

> ER overview at the bottom (§7.99).

---

## 7.1 Enum types

```sql
CREATE TYPE user_role       AS ENUM ('owner','manager','receptionist','trainer','dietician','member');
CREATE TYPE gender_t        AS ENUM ('male','female','other','undisclosed');
CREATE TYPE staff_type      AS ENUM ('manager','receptionist','trainer','dietician','cleaner','sales','maintenance');
CREATE TYPE package_type    AS ENUM ('trainer','non_trainer','custom');
CREATE TYPE billing_cycle   AS ENUM ('one_time','monthly','quarterly','half_yearly','annual');
CREATE TYPE membership_status AS ENUM ('active','expired','frozen','cancelled','pending');
CREATE TYPE payment_method  AS ENUM ('cash','card','upi','bank_transfer','online_gateway','installment');
CREATE TYPE payment_status  AS ENUM ('pending','paid','partially_paid','failed','refunded','void');
CREATE TYPE invoice_status  AS ENUM ('draft','issued','paid','partially_paid','overdue','void');
CREATE TYPE attendance_method AS ENUM ('qr','member_id','mobile','manual');
CREATE TYPE checkin_subject AS ENUM ('member','staff');
CREATE TYPE expense_category AS ENUM ('rent','electricity','internet','equipment','repairs','cleaning','marketing','salary','misc');
CREATE TYPE salary_type     AS ENUM ('monthly','hourly','commission','per_session');
CREATE TYPE payroll_status  AS ENUM ('draft','approved','paid');
CREATE TYPE goal_t          AS ENUM ('weight_loss','muscle_gain','bodybuilding','general_fitness','rehabilitation','strength','flexibility');
CREATE TYPE diet_pref       AS ENUM ('vegetarian','vegan','non_vegetarian');
CREATE TYPE difficulty_t    AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE notif_channel   AS ENUM ('push','sms','email','whatsapp');
CREATE TYPE notif_type      AS ENUM ('workout_reminder','meal_reminder','water_reminder','membership_expiry','payment_due','birthday','announcement','trainer_message','system');
CREATE TYPE enquiry_status  AS ENUM ('new','contacted','trial','won','lost');
CREATE TYPE equipment_status AS ENUM ('operational','maintenance','out_of_service','retired');
```

---

## 7.2 Business & Branches

### `businesses` (exactly one row)
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | e.g., "Fitness World" |
| legal_name | text | |
| logo_url | text | |
| currency | char(3) NOT NULL default 'INR' | |
| timezone | text default 'Asia/Kolkata' | |
| tax_number | text | GSTIN etc. |
| settings | jsonb default '{}' | feature flags, defaults |
| created_at / updated_at | timestamptz | |

Constraint: single-row enforced at app layer + `CHECK` via a singleton pattern (`CREATE UNIQUE INDEX one_business ON businesses((true));`).

### `branches`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| business_id | uuid FK→businesses | |
| name | text NOT NULL | |
| code | text NOT NULL | short code e.g. KCH |
| address | text | |
| lat / lng | numeric | geo for maps |
| phone / email | text | |
| timezone | text | |
| opening_hours | jsonb | per-day open/close |
| is_active | boolean default true | |
| created_at/updated_at/deleted_at | timestamptz | |

Indexes: `unique(business_id, code)`, `idx(business_id)`, `idx(is_active)`.

---

## 7.3 Identity & Access

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| business_id | uuid FK→businesses | |
| role | user_role NOT NULL | |
| email | citext UNIQUE | nullable for members (OTP) |
| phone | text UNIQUE | |
| password_hash | text | null for OTP-only members |
| full_name | text NOT NULL | |
| avatar_url | text | |
| is_active | boolean default true | |
| last_login_at | timestamptz | |
| auth_provider_id | text | Clerk/Auth.js external id |
| created_at/updated_at/deleted_at | | |

Indexes: `idx(role)`, `unique(email)`, `unique(phone)`, `idx(auth_provider_id)`.

### `user_branches` (staff ↔ branch assignment; supports rare multi-branch staff)
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→users | |
| branch_id | uuid FK→branches | |
| is_primary | boolean default true | |

Index: `unique(user_id, branch_id)`. Owner has **no** rows here (implicit all-branch). Managers/reception/trainers usually one row.

### `staff_profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→users UNIQUE | |
| branch_id | uuid FK→branches | primary branch |
| staff_type | staff_type NOT NULL | |
| specialization | text | for trainers/dieticians |
| date_of_joining | date | |
| salary_type | salary_type | |
| base_salary | integer | minor units |
| hourly_rate | integer | |
| commission_percent | numeric(5,2) | |
| per_session_rate | integer | |
| bank_details | jsonb | encrypted at app layer |
| status | text default 'active' | active/inactive/terminated |

Indexes: `idx(branch_id)`, `idx(staff_type)`.

### `audit_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| business_id / branch_id | uuid | branch nullable |
| actor_user_id | uuid FK→users | |
| action | text | e.g. `payment.void` |
| entity_type / entity_id | text / uuid | |
| before / after | jsonb | |
| ip / user_agent | text | |
| created_at | timestamptz | |

Indexes: `idx(entity_type, entity_id)`, `idx(actor_user_id)`, `idx(created_at)`.

---

## 7.4 Members

### `members`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→users | nullable until member activates app login |
| home_branch_id | uuid FK→branches | **home branch** |
| member_code | text NOT NULL | human/QR code |
| full_name | text NOT NULL | |
| gender | gender_t | |
| dob | date | age derived |
| email / phone | text | |
| address | text | |
| emergency_contact_name / _phone | text | |
| photo_url | text | |
| multi_branch_access | boolean default false | owner-enabled visiting |
| status | text default 'active' | active/inactive/frozen |
| joined_at | date | |
| created_by | uuid FK→users | |
| draft | boolean default false | onboarding wizard draft |

Indexes: `unique(home_branch_id, member_code)`, `idx(phone)`, `idx(home_branch_id, status)`, `idx(full_name)` (trigram for search).

### `member_goals`
| id PK · member_id FK · goal goal_t · created_at | one row per selected goal |

### `member_medical`
| Field | Type |
|---|---|
| id PK, member_id FK (unique) | |
| injuries / diseases / allergies / medicines | text[] or jsonb |
| physical_limitations | text |

### `member_food_prefs`
| id PK, member_id FK (unique), diet_pref diet_pref, food_allergies text[], water_intake_ml int, meal_preference text |

### `member_documents`
| id PK · member_id FK · type text · file_url text · uploaded_by FK · created_at |

---

## 7.5 Packages & Memberships

### `packages`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| business_id | uuid FK | |
| branch_id | uuid FK NULL | null = all branches |
| name | text NOT NULL | |
| type | package_type NOT NULL | trainer/non_trainer/custom |
| description | text | |
| duration_days | int NOT NULL | e.g. 30/90/365 |
| billing_cycle | billing_cycle | |
| price | integer NOT NULL | minor units |
| tax_percent | numeric(5,2) default 0 | |
| pt_sessions | int | for trainer packages |
| includes_trainer | boolean default false | |
| is_active | boolean default true | |

Indexes: `idx(business_id, is_active)`, `idx(branch_id)`, `idx(type)`.

### `memberships`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| member_id | uuid FK→members | |
| branch_id | uuid FK→branches | |
| package_id | uuid FK→packages | |
| trainer_id | uuid FK→users NULL | assigned trainer |
| start_date / end_date | date | |
| price_snapshot | integer | price at purchase (immutable) |
| tax_snapshot | integer | |
| sessions_total / sessions_used | int | for PT |
| status | membership_status | |
| is_renewal_of | uuid FK→memberships NULL | renewal chain |
| frozen_from / frozen_to | date | freeze window |
| cancelled_reason | text | |

Indexes: `idx(member_id)`, `idx(branch_id, status)`, `idx(end_date)` (expiry queries), `idx(trainer_id)`.

---

## 7.6 Billing: Invoices, Payments, Installments

### `invoices`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK | |
| member_id | uuid FK | |
| membership_id | uuid FK NULL | |
| invoice_number | text UNIQUE | sequential per branch |
| subtotal / tax / total | integer | minor units |
| amount_paid | integer default 0 | |
| balance_due | integer | generated: total − amount_paid |
| status | invoice_status | |
| due_date | date | |
| issued_by | uuid FK→users | |

Indexes: `unique(invoice_number)`, `idx(member_id)`, `idx(branch_id, status)`, `idx(due_date)`.

### `payments`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK | |
| invoice_id | uuid FK NULL | |
| member_id | uuid FK | |
| amount | integer NOT NULL | |
| method | payment_method | |
| status | payment_status | |
| gateway | text | razorpay/stripe |
| gateway_order_id / gateway_payment_id | text | |
| reference | text | UTR/txn ref for cash/upi |
| paid_at | timestamptz | |
| collected_by | uuid FK→users | |
| receipt_url | text | |
| notes | text | |

Indexes: `idx(invoice_id)`, `idx(member_id)`, `idx(branch_id, paid_at)`, `idx(gateway_payment_id)`, `idx(status)`.

### `installment_plans` / `installments`
```
installment_plans(id PK, invoice_id FK, total_amount int, down_payment int, num_installments int, status)
installments(id PK, plan_id FK, seq int, amount int, due_date date, paid_payment_id FK NULL, status payment_status)
```
Index: `idx(plan_id, seq)`, `idx(installments.due_date)`.

### `refunds`
| id PK · payment_id FK · amount int · reason text · approved_by FK · created_at |

---

## 7.7 Attendance

### `attendance_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK | branch where check-in happened (may differ from home) |
| subject | checkin_subject | member/staff |
| member_id | uuid FK NULL | |
| staff_user_id | uuid FK NULL | |
| method | attendance_method | |
| check_in_at | timestamptz NOT NULL | |
| check_out_at | timestamptz NULL | |
| duration_minutes | int | computed on checkout |
| recorded_by | uuid FK NULL | staff who did manual entry |

Indexes: `idx(branch_id, check_in_at)`, `idx(member_id, check_in_at)`, `idx(staff_user_id, check_in_at)`.

### `staff_leaves`
| id PK · staff_user_id FK · branch_id FK · from_date · to_date · type text · reason text · status text · approved_by FK |

---

## 7.8 Payroll & Expenses

### `payroll_records`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK | |
| staff_user_id | uuid FK | |
| period_start / period_end | date | |
| base_amount | integer | |
| hours_worked | numeric | |
| commission_amount | integer | |
| session_amount | integer | |
| bonus | integer | |
| deduction | integer | |
| net_amount | integer | generated total |
| status | payroll_status | |
| payslip_url | text | |
| approved_by | uuid FK | |
| paid_at | timestamptz | |

Indexes: `idx(staff_user_id, period_start)`, `idx(branch_id, period_start)`.

### `expenses`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK | |
| category | expense_category | |
| amount | integer | |
| expense_date | date | |
| vendor | text | |
| note | text | |
| receipt_url | text | |
| recurring_rule | text NULL | cron/RRULE for auto-gen |
| created_by | uuid FK | |

Indexes: `idx(branch_id, expense_date)`, `idx(category)`.

---

## 7.9 Workout module

### `exercises` (library)
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| business_id | uuid FK | shared across branches |
| name | text NOT NULL | |
| muscle_group | text | |
| equipment | text | |
| difficulty | difficulty_t | |
| instructions | text | |
| image_url / video_url | text | |
| default_sets / default_reps / default_rest_sec | int | |
| is_global | boolean default true | |

Indexes: `idx(muscle_group)`, `idx(equipment)`, `idx(name)` (trigram).

### `workout_plans`
| id PK · branch_id FK · created_by FK(trainer) · name · goal goal_t · weeks int · days_per_week int · is_template bool · created_at |

### `workout_plan_days`
| id PK · plan_id FK · day_index int · title text |

### `workout_plan_exercises`
| id PK · plan_day_id FK · exercise_id FK · order_index int · sets int · reps text · rest_sec int · tempo text · notes text |

### `member_workout_assignments`
| id PK · plan_id FK · member_id FK · assigned_by FK · start_date · status text |

### `workout_logs` (member completes)
| Field | Type | Notes |
|---|---|---|
| id PK | | |
| member_id FK | | |
| plan_id FK NULL | | |
| plan_day_id FK NULL | | |
| performed_at | timestamptz | |
| rating | smallint | 1–5 |
| notes | text | |
| duration_minutes | int | |

### `workout_log_sets`
| id PK · workout_log_id FK · exercise_id FK · set_index int · weight int (grams or minor) · reps int · is_pr bool · completed bool |

Indexes: `idx(workout_logs.member_id, performed_at)`, `idx(workout_log_sets.exercise_id)`.

### `personal_records`
| id PK · member_id FK · exercise_id FK · best_weight int · best_reps int · achieved_at | unique(member_id, exercise_id) |

---

## 7.10 Diet module

### `diet_plans`
| id PK · branch_id FK · created_by FK · member_id FK NULL · name · daily_calories int · protein_g int · carbs_g int · fat_g int · water_goal_ml int · is_template bool |

### `diet_plan_meals`
| id PK · diet_plan_id FK · meal_type text (breakfast/lunch/dinner/snack) · order_index int · title · calories int · protein_g int · carbs_g int · fat_g int · items jsonb |

### `diet_logs` (member marks complete)
| id PK · member_id FK · diet_plan_meal_id FK · log_date date · completed bool · photo_url text · logged_at | unique(member_id, diet_plan_meal_id, log_date) |

### `water_logs`
| id PK · member_id FK · log_date date · amount_ml int · logged_at | index(member_id, log_date) |

### `diet_change_requests`
| id PK · member_id FK · diet_plan_id FK · message text · status text · created_at |

---

## 7.11 Progress tracking

### `measurements`
| Field | Type | Notes |
|---|---|---|
| id PK · member_id FK · recorded_by FK | | |
| recorded_at | date | |
| weight_g | int | |
| height_cm | int | |
| bmi | numeric(4,1) | derived, stored for history |
| body_fat_pct | numeric(4,1) | |
| muscle_pct | numeric(4,1) | |
| waist_cm / chest_cm / arms_cm / hips_cm / thighs_cm / legs_cm | numeric | |

Index: `idx(member_id, recorded_at)`.

### `progress_photos`
| id PK · member_id FK · photo_url · pose text(front/side/back) · taken_at date · note text |

---

## 7.12 Trainer relationship & notes

### `trainer_assignments`
| id PK · trainer_user_id FK · member_id FK · branch_id FK · assigned_at · unassigned_at NULL · is_active bool |
Index: `idx(trainer_user_id, is_active)`, `unique active per member` (partial unique where is_active).

### `trainer_notes`
| id PK · trainer_user_id FK · member_id FK · note text · created_at |

### `pt_sessions`
| id PK · trainer_user_id FK · member_id FK · branch_id FK · scheduled_at timestamptz · duration_min int · status text(scheduled/completed/no_show/cancelled) · notes text |
Index: `idx(trainer_user_id, scheduled_at)`, `idx(member_id, scheduled_at)`.

---

## 7.13 CRM: Enquiries & Appointments

### `enquiries`
| id PK · branch_id FK · name · phone · email · interest text · source text · status enquiry_status · follow_up_date date · assigned_to FK · converted_member_id FK NULL · notes |
Index: `idx(branch_id, status)`, `idx(follow_up_date)`.

### `appointments`
| id PK · branch_id FK · enquiry_id FK NULL · member_id FK NULL · staff_user_id FK · type text · scheduled_at timestamptz · status text |

---

## 7.14 Notifications

### `notifications`
| Field | Type | Notes |
|---|---|---|
| id PK | | |
| business_id / branch_id | uuid | branch nullable (all-branch broadcast) |
| recipient_user_id | uuid FK NULL | null = broadcast segment |
| type | notif_type | |
| title / body | text | |
| data | jsonb | deep-link payload |
| channels | notif_channel[] | |
| scheduled_at | timestamptz | |
| sent_at | timestamptz | |
| read_at | timestamptz | |
| status | text | queued/sent/failed |

Index: `idx(recipient_user_id, read_at)`, `idx(status, scheduled_at)`.

### `notification_preferences`
| id PK · user_id FK · type notif_type · channel notif_channel · enabled bool | unique(user_id, type, channel) |

### `device_tokens`
| id PK · user_id FK · fcm_token text · platform text · last_seen_at | for push |

### `announcements`
| id PK · created_by FK · audience jsonb (branches/roles/segments) · title · body · channels · scheduled_at · sent_at |

---

## 7.15 Chat (P2)

### `chat_threads`
| id PK · member_id FK · trainer_user_id FK · branch_id FK · last_message_at | unique(member_id, trainer_user_id) |

### `chat_messages`
| id PK · thread_id FK · sender_user_id FK · body text · attachment_url text · created_at · read_at |
Index: `idx(thread_id, created_at)`.

---

## 7.16 Inventory & Equipment (P2)

### `inventory_items`
| id PK · branch_id FK · name · sku · quantity int · reorder_level int · unit_cost int · updated_at |

### `equipment`
| id PK · branch_id FK · name · category · serial_no · purchase_date · warranty_until · last_service_at · next_service_at · status equipment_status |
Index: `idx(branch_id, status)`, `idx(next_service_at)`.

---

## 7.17 Data integrity rules

- Deleting a **branch** is **not allowed** if it has memberships/payments; deactivate instead (`is_active=false`).
- `memberships.price_snapshot` is immutable after issue (enforced by trigger/app).
- `invoices.amount_paid` never exceeds `total`; `balance_due` is a generated column.
- A member has at most **one active** `trainer_assignment` (partial unique index).
- Cross-branch check-in allowed only when `members.multi_branch_access = true`.
- `businesses` limited to one row.

---

## 7.99 ER overview (textual)

```
businesses 1─* branches
branches   1─* members, staff_profiles, packages(optional/all), memberships, invoices,
               payments, attendance_logs, expenses, payroll_records, enquiries, equipment
users      1─1 staff_profiles ; users *─* branches (user_branches)
members    1─* memberships, measurements, progress_photos, workout_logs, diet_logs,
               water_logs, member_documents, trainer_notes
packages   1─* memberships
memberships 1─* invoices ; invoices 1─* payments ; invoices 1─1 installment_plans 1─* installments
trainer(users) *─* members via trainer_assignments ; trainer 1─* workout_plans, diet_plans, pt_sessions
exercises  *─* workout_plans via workout_plan_exercises
diet_plans 1─* diet_plan_meals 1─* diet_logs
users      1─* notifications, notification_preferences, device_tokens
```
