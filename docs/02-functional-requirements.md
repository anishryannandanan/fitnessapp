# 2. Functional Requirements

Requirements are grouped by module. IDs follow `FR-<MODULE>-<n>`. Priority: **M** = MVP, **P2** = Phase 2, **P3** = later.

## FR-CORE — Business & Branch

| ID | Requirement | Priority |
|---|---|---|
| FR-CORE-1 | The system shall contain exactly **one** Business record, seeded on deployment. No UI to create/delete businesses. | M |
| FR-CORE-2 | The Owner shall create, edit, activate, and deactivate an unlimited number of Branches. | M |
| FR-CORE-3 | Each Branch shall store name, code, address, geo-coordinates, phone, email, timezone, operating hours, and status. | M |
| FR-CORE-4 | Deactivating a branch shall block new operations there but preserve historical data (soft state). | M |
| FR-CORE-5 | Almost every operational entity (member, staff, payment, expense, etc.) shall be linked to a `branch_id`. | M |
| FR-CORE-6 | The Owner shall switch the active branch context, or select "All Branches" (consolidated). | M |

## FR-AUTH — Authentication & Access

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-1 | Users shall sign in with email/phone + password; OTP login for Members. | M |
| FR-AUTH-2 | The system shall support the roles: Owner, Branch Manager, Receptionist, Trainer, Dietician, Member. | M |
| FR-AUTH-3 | Every staff account shall be assigned to exactly one branch (Owner = all). | M |
| FR-AUTH-4 | Password reset via email/SMS OTP shall be supported. | M |
| FR-AUTH-5 | Sessions shall expire and support refresh; sensitive actions may require re-auth. | M |
| FR-AUTH-6 | Optional 2FA for Owner and Managers. | P2 |

## FR-MEM — Members & Onboarding

| ID | Requirement | Priority |
|---|---|---|
| FR-MEM-1 | Receptionist/Manager shall onboard a member via an 8-step wizard (personal, measurements, goals, medical, food, package, trainer, payment). | M |
| FR-MEM-2 | Each member shall belong to exactly one **Home Branch**. | M |
| FR-MEM-3 | The Owner may enable "multi-branch access" for a member, allowing check-in at other branches. | M |
| FR-MEM-4 | A member profile shall aggregate: personal details, medical history, measurements, goals, attendance, membership, payment history, workout plans, diet plans, progress photos, trainer notes, and documents. | M |
| FR-MEM-5 | Members shall be searchable by name, phone, member code, or QR. | M |
| FR-MEM-6 | A unique member code and QR shall be generated on registration. | M |
| FR-MEM-7 | Members may be frozen/paused (with reason and date range), extending expiry accordingly. | P2 |

## FR-PKG — Packages & Memberships

| ID | Requirement | Priority |
|---|---|---|
| FR-PKG-1 | Owner/Manager shall create packages of types: **Trainer** (PT/weight-loss/transformation/muscle-gain) and **Non-Trainer** (gym-only, cardio-only, group classes, monthly/quarterly/annual), plus **Custom**. | M |
| FR-PKG-2 | A package shall define: name, type, duration, price, tax, sessions (for PT), branch scope, and status. | M |
| FR-PKG-3 | A membership shall link a member to a package with start/end dates, price snapshot, and status (active/expired/frozen/cancelled). | M |
| FR-PKG-4 | Renewals shall create a new membership period; the system shall track renewal history. | M |
| FR-PKG-5 | Packages may be branch-specific or available at all branches. | M |
| FR-PKG-6 | Upgrades/downgrades with prorated price adjustment. | P2 |

## FR-PAY — Payments, Invoices, Receipts

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-1 | Payments shall support Cash, Card, UPI, Bank Transfer, Online Gateway, and Installments. | M |
| FR-PAY-2 | Every payment shall generate an Invoice and a Receipt (PDF + shareable link). | M |
| FR-PAY-3 | The system shall track outstanding balances, due dates, and installment schedules. | M |
| FR-PAY-4 | Members shall pay online via Razorpay (primary) / Stripe; webhooks reconcile status. | M |
| FR-PAY-5 | Alerts shall be generated for Due Today, Overdue, and Expiring Membership. | M |
| FR-PAY-6 | A generated membership card shall be produced at onboarding. | M |
| FR-PAY-7 | Refunds and adjustments shall be recorded with reason and approver. | P2 |

## FR-ATT — Attendance

| ID | Requirement | Priority |
|---|---|---|
| FR-ATT-1 | Members shall check in/out via QR scan, member ID, or mobile number; staff may check in manually. | M |
| FR-ATT-2 | The system shall record timestamp, branch, method, and compute visit duration. | M |
| FR-ATT-3 | Check-in shall validate active membership and branch access; expired/invalid shall warn staff. | M |
| FR-ATT-4 | Peak-hour analytics (hourly heatmap) per branch shall be available. | M |
| FR-ATT-5 | Staff attendance (check-in/out, leave) shall be tracked separately. | M |
| FR-ATT-6 | Offline check-in shall queue and sync when back online. | P2 |

## FR-STAFF — Staff & Payroll

| ID | Requirement | Priority |
|---|---|---|
| FR-STAFF-1 | Manage staff of types: Trainer, Receptionist, Manager, Cleaner, Dietician, Sales, Maintenance. | M |
| FR-STAFF-2 | Track per staff: salary structure, attendance, leave, documents, and performance. | M |
| FR-STAFF-3 | Payroll shall support monthly salary, hourly salary, trainer commission, per-session payment, bonus, and deduction. | M |
| FR-STAFF-4 | The system shall generate a payslip (PDF) per staff per pay period. | M |
| FR-STAFF-5 | Trainer commission shall be computed from assigned memberships/sessions per configurable rules. | P2 |
| FR-STAFF-6 | Salary data shall be hidden from Receptionists and Trainers. | M |

## FR-EXP — Expenses & Profit

| ID | Requirement | Priority |
|---|---|---|
| FR-EXP-1 | Record expenses under categories: Rent, Electricity, Internet, Equipment, Repairs, Cleaning, Marketing, Salary, Miscellaneous. | M |
| FR-EXP-2 | Each expense shall carry branch, date, amount, category, vendor, note, and receipt attachment. | M |
| FR-EXP-3 | The system shall compute Monthly Profit = Income − Expense per branch and consolidated. | M |
| FR-EXP-4 | Recurring expenses shall auto-generate on schedule. | P2 |

## FR-WRK — Workout Module

| ID | Requirement | Priority |
|---|---|---|
| FR-WRK-1 | An Exercise Library shall store images, videos, instructions, default sets/reps/rest, equipment, muscle group, and difficulty. | M |
| FR-WRK-2 | Trainers shall build Workout Templates and Weekly/Monthly/Personal plans. | M |
| FR-WRK-3 | Members shall complete workouts, log weights/reps, save PRs, and rate workouts. | M |
| FR-WRK-4 | Plans shall be assignable to a member or a group. | M |
| FR-WRK-5 | Workout history and PR progression charts shall be visible to member and trainer. | M |

## FR-DIET — Diet Module

| ID | Requirement | Priority |
|---|---|---|
| FR-DIET-1 | Trainers/Dieticians shall create meal plans with calories, protein, carbs, fat, and water goal. | M |
| FR-DIET-2 | Members shall mark meals complete, upload meal photos, track water, and request changes. | M |
| FR-DIET-3 | Daily/weekly adherence shall be summarized for member and trainer. | M |

## FR-PROG — Progress Tracking

| ID | Requirement | Priority |
|---|---|---|
| FR-PROG-1 | Track weight, BMI, body-fat %, muscle, waist, chest, arms, legs, hips, thighs over time. | M |
| FR-PROG-2 | Visualize via charts/graphs and progress-photo timeline. | M |
| FR-PROG-3 | Before/after photo comparison shall be available. | M |
| FR-PROG-4 | Members and trainers shall both add measurement entries. | M |

## FR-NOTIF — Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-NOTIF-1 | Send workout, meal, water reminders; membership expiry; payment due; birthday; announcements; trainer messages. | M |
| FR-NOTIF-2 | Channels: Push (FCM), SMS, Email, WhatsApp. | M (Push+Email MVP; SMS/WhatsApp P2) |
| FR-NOTIF-3 | Users shall manage notification preferences per channel/type. | M |
| FR-NOTIF-4 | Owner/Manager shall broadcast announcements to a branch or all branches. | M |

## FR-CHAT — Trainer ↔ Member Chat

| ID | Requirement | Priority |
|---|---|---|
| FR-CHAT-1 | 1:1 chat between a member and their assigned trainer, with text and image. | P2 |
| FR-CHAT-2 | Trainers shall send reminders and plan-change notes in chat. | P2 |

## FR-RPT — Reports

| ID | Requirement | Priority |
|---|---|---|
| FR-RPT-1 | Generate Revenue, Expense, Profit, Attendance, Trainer, Member Growth, Package, Salary, Branch Comparison, and Payment reports. | M |
| FR-RPT-2 | Reports shall be filterable by date range and branch (Owner: all/consolidated). | M |
| FR-RPT-3 | Export to Excel, CSV, and PDF. | M |
| FR-RPT-4 | Scheduled email reports (daily/weekly/monthly). | P3 |

## FR-DASH — Dashboards

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-1 | Owner dashboard: total members, revenue, monthly profit, branch comparison, outstanding, expiring memberships, daily attendance. | M |
| FR-DASH-2 | Manager dashboard: same KPIs scoped to assigned branch. | M |
| FR-DASH-3 | Trainer dashboard: today's sessions, assigned members, pending reviews. | M |
| FR-DASH-4 | Reception dashboard: today's check-ins, renewals, payments, enquiries. | M |
| FR-DASH-5 | Member dashboard: today's workout, today's diet, progress, membership status, water goal. | M |

## FR-INV — Inventory & Equipment

| ID | Requirement | Priority |
|---|---|---|
| FR-INV-1 | Track inventory items (stock, reorder level) and equipment (purchase date, warranty, service schedule, status). | P2 |
| FR-INV-2 | Maintenance/service reminders for equipment. | P2 |

## FR-NFR — Non-functional

| ID | Requirement |
|---|---|
| FR-NFR-1 | Mobile-first responsive UI; installable PWA with offline shell. |
| FR-NFR-2 | P95 API latency < 400 ms for read endpoints under normal load. |
| FR-NFR-3 | Support at least 50 branches and 100k members without redesign. |
| FR-NFR-4 | Dark & light modes; WCAG AA contrast. |
| FR-NFR-5 | All money stored in minor units (paise/cents) as integers; single currency per business (configurable). |
| FR-NFR-6 | Audit logging for financial and permission-changing actions. |
