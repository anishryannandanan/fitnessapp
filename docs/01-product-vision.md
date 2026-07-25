# 1. Product Vision & 6. Information Architecture

## 1.1 Vision statement

**FitCore** is the operating system for a growing multi-branch gym business. It replaces the tangle of spreadsheets, WhatsApp groups, paper receipts, and disconnected apps that most gyms run on, with one clean, mobile-first platform that every stakeholder — owner, manager, receptionist, trainer, and member — actually enjoys using.

The product has two hearts:

1. **A business command center** for the owner and managers: real-time revenue, expenses, profit, attendance, member growth, and branch-vs-branch comparison.
2. **A motivating member & training experience** that feels like the premium consumer fitness apps (Fitbod, Strong, Apple Fitness) — workouts, diet, progress photos, streaks, and direct trainer chat.

## 1.2 Problem statement

Independent gyms with more than one branch face predictable pain:

- Revenue and expenses live in different books per branch; the owner never sees a true consolidated P&L.
- Membership renewals and dues are tracked manually, so revenue leaks.
- Trainers manage workout/diet plans on paper or WhatsApp; members lose motivation and churn.
- Attendance is a register book; peak-hour staffing decisions are guesswork.
- There is no single source of truth for a member's history across branches.

## 1.3 Solution

A single, role-aware platform where:

- The **owner** gets consolidated + branch-wise dashboards and comparison reports.
- **Managers** run their branch end-to-end.
- **Receptionists** handle the front desk: onboarding, renewals, payments, check-ins, enquiries.
- **Trainers** build workout/diet plans and coach assigned members.
- **Members** get a beautiful app for workouts, diet, progress, payments, and trainer chat.

## 1.4 Product principles

1. **Mobile-first, thumb-first.** Everything primary is reachable one-handed.
2. **Minimal typing.** Pickers, toggles, QR, and smart defaults over free text.
3. **One source of truth.** Every member, payment, and session lives in one system.
4. **Branch isolation by default, consolidation for the owner.** Roles see exactly what they should.
5. **Motivating, not clinical.** Streaks, PRs, before/after, and encouragement for members.
6. **Fast + resilient.** PWA, optimistic UI, offline-tolerant check-in and workout logging.

## 1.5 Target users (personas)

| Persona | Name | Goals | Frustrations today |
|---|---|---|---|
| Owner | Rajan, 45 | See true profit per branch, compare branches, cut leaks | Books don't reconcile; no live view |
| Branch Manager | Meera, 34 | Hit branch revenue targets, staff peak hours | Manual reports, no attendance insight |
| Receptionist | Anu, 26 | Fast onboarding & renewals, zero disputes | Paper receipts, missed dues |
| Trainer | Vishnu, 29 | Retain members, show results | Plans on paper, no progress data |
| Member | Fathima, 31 | Lose weight, stay motivated | No plan visibility, no feedback |

## 1.6 Success metrics (product KPIs)

- **Revenue capture:** % of dues collected on time ↑; overdue amount ↓.
- **Retention:** member churn ↓; renewal rate ↑.
- **Engagement:** weekly active members; workouts completed; diet adherence.
- **Ops efficiency:** onboarding time < 4 min; receipt disputes → ~0.
- **Owner adoption:** daily dashboard opens; report exports.

## 1.7 Scope guardrails

**In scope:** single business, multi-branch, all modules in the brief.
**Explicitly out of scope:** SaaS signup, multi-tenant isolation, gym subscription billing, franchise/royalty management, super-admin. There is exactly **one** business record, seeded at deployment.

---

# 6. Information Architecture

## 6.1 Entity hierarchy

```
Business (exactly 1)
└── Branch (1..N)
    ├── Staff (Manager, Receptionist, Trainer, Dietician, Cleaner, Sales, Maintenance)
    ├── Members (Home Branch)
    ├── Packages
    ├── Memberships  ── Payments / Invoices / Receipts
    ├── Attendance (members + staff)
    ├── Expenses
    ├── Inventory & Equipment
    ├── Workout & Diet plans (via Trainer ↔ Member)
    └── Notifications / Announcements
```

## 6.2 Role → primary navigation (bottom nav, mobile-first)

Each role gets a tailored **bottom tab bar** (max 5 items) plus a "More" sheet.

**Owner**
`Dashboard · Branches · Reports · Finance · More`
(More: Members, Staff, Packages, Notifications, Settings, Profile)

**Branch Manager**
`Dashboard · Members · Staff · Finance · More`
(More: Attendance, Packages, Expenses, Reports, Notifications)

**Receptionist**
`Home · Check-in · Members · Payments · More`
(More: Enquiries, Appointments, Renewals, Receipts)

**Trainer**
`Today · Members · Workouts · Diet · More`
(More: PT Schedule, Progress, Chat, Notes)

**Member**
`Home · Workout · Diet · Progress · More`
(More: Membership, Payments, Attendance, Chat, Profile)

## 6.3 Global navigation map (sitemap)

```
/                         → role-based redirect to dashboard
/auth
  /sign-in  /forgot-password  /reset  /verify-otp

/owner
  /dashboard              (consolidated + branch switcher)
  /branches               list → /branches/:id (detail, staff, KPIs)
  /reports                (revenue, expense, profit, comparison, ...)
  /finance                (revenue, expenses, payroll, outstanding)
  /members  /staff  /packages  /notifications  /settings

/branch                   (manager, scoped to assigned branch)
  /dashboard  /members  /staff  /attendance  /payments
  /packages  /expenses  /reports

/reception
  /home  /check-in  /members  /members/new (onboarding wizard)
  /payments  /renewals  /receipts  /enquiries  /appointments

/trainer
  /today  /members  /members/:id
  /workouts  /workouts/templates  /workouts/builder
  /diet  /diet/builder  /pt-schedule  /progress  /chat

/member  (also the PWA "app")
  /home  /workout  /workout/:planId  /diet  /progress
  /membership  /payments  /attendance  /chat  /profile

/shared
  /notifications  /profile  /settings  /help
```

## 6.4 Navigation patterns

- **Bottom tab bar** on mobile; **collapsible left sidebar** on tablet/desktop (same items).
- **Branch switcher** in the top app bar — visible only to Owner (and to staff assigned to >1 branch, rare).
- **Contextual FAB** (floating action button) for the primary action per screen (e.g., "Add Member", "New Payment", "Log Workout").
- **Search** in the top bar, scoped to the current role's data.
- **Back-stack** preserved per tab (native-app feel in the PWA).

## 6.5 Content model summary (see `06-database-schema.md` for full detail)

Core aggregates: **Business, Branch, User, StaffProfile, MemberProfile, Package, Membership, Invoice, Payment, AttendanceLog, Expense, PayrollRecord, Exercise, WorkoutPlan, DietPlan, ProgressEntry, Notification, Enquiry, Appointment, Inventory, Equipment.**
