# 18. MVP Features & 19. Future Features

## 18. MVP Features (Phase 1 — production-ready core)

The MVP delivers a fully usable multi-branch gym operation: onboard members, sell/renew memberships, take payments, track attendance, run training, and see money.

### 18.1 MVP scope
**Foundation**
- Single business seeded; Owner account; **branch CRUD** (create/edit/deactivate).
- Auth: staff email/password, member phone-OTP; roles (Owner, Manager, Reception, Trainer, Member); **branch-scoped access**.
- Mobile-first responsive UI + **PWA install**; dark/light mode.

**Members & sales**
- **8-step onboarding wizard** with invoice + receipt + membership card (QR).
- Member profile aggregate (personal, medical, measurements, goals, food, membership, payments, plans, progress, notes, documents).
- Packages (trainer / non-trainer / custom); **memberships + renewals** (stacking rule).
- **Payments:** cash/card/UPI/bank + **online (Razorpay)**; invoices, receipts (PDF/share); outstanding + due/overdue/expiry alerts; installments (basic).

**Operations**
- **Attendance:** QR / member ID / mobile / manual check-in/out; visit duration; peak-hours; staff attendance.
- **Staff management** + **payroll** (monthly/hourly/commission/session, bonus/deduction, payslip PDF) — manual commission entry.
- **Expenses** by category; **monthly profit** (branch + consolidated).

**Training**
- **Exercise library**; trainer **workout plans/templates**; member workout logging + PRs + rating.
- **Diet plans** with macros + water goal; member meal completion + water tracking.
- **Progress:** measurements + charts + progress photos + before/after.

**Insight & comms**
- **Dashboards** for all 5 roles.
- **Reports** (revenue, expense, profit, attendance, trainer, member growth, package, salary, payment, branch comparison) with Excel/CSV/PDF export.
- **Notifications:** Push (FCM) + Email; expiry, dues, workout/meal/water reminders, announcements; preferences.

### 18.2 Explicitly NOT in MVP
SaaS/multi-tenant, franchise, super-admin (never), SMS/WhatsApp, in-app chat, advanced commission automation, inventory/equipment, wearables, AI features, marketplace.

### 18.3 MVP acceptance (definition of done)
- A receptionist can onboard + collect payment in < 4 min end-to-end.
- Owner sees consolidated + per-branch revenue/profit that reconciles with payments/expenses.
- Manager/reception/trainer cannot access other branches (verified 403s).
- Member can view today's plan, log a workout, pay online, and see receipt.
- PWA installs; dark mode works; core flows usable on a mid-range phone.

---

## 19. Future Features (post-MVP)

### 19.1 Phase 2 (near-term, high value)
- **SMS + WhatsApp** notifications (DLT/template-approved); rich receipts via WhatsApp.
- **In-app trainer ↔ member chat** (text + image), plan-change requests.
- **Membership freeze/pause** UI + auto-extend; **upgrades/downgrades** with proration.
- **Inventory & equipment** management + maintenance reminders.
- **Advanced trainer commission** automation (rules from sales/sessions) + clawback on refund.
- **Offline-first** check-in & workout logging with robust sync.
- **Advance credit / wallet** for overpayments and prepaid balances.
- **Group classes & scheduling** (class calendar, capacity, bookings).
- **Recurring expenses** automation.

### 19.2 Phase 3 (differentiators)
- **Scheduled email report digests**; owner weekly business review.
- **Lead/CRM enhancements:** campaigns, WhatsApp drip, conversion analytics.
- **Wearable/health integrations** (Apple Health, Google Fit) for steps/HR/sleep.
- **Habit streaks, challenges, leaderboards** (per branch) for engagement/retention.
- **Referral program** & member-get-member rewards.
- **Biometric/RFID access control** integration at branch doors.
- **Native apps** (React Native/Expo) sharing the REST API.
- **Trainer marketplace / PT booking** across branches.

### 19.3 Phase 4 (intelligence)
- **AI workout & diet suggestions** from goals + progress + adherence.
- **Churn prediction** and proactive retention nudges.
- **Demand forecasting** for staffing from attendance patterns.
- **Smart pricing / package recommendations** per branch.
- **Anomaly detection** in payments/expenses (fraud/leak alerts).

### 19.4 Deliberately excluded (by product mandate)
- Multi-tenant SaaS, gym self-signup, gym subscription billing.
- Franchise/royalty management.
- Super-admin across multiple businesses.
