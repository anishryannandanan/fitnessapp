# 3. User Stories

Format: **As a `<role>`, I want `<capability>`, so that `<value>`.** Each story lists acceptance criteria (AC). Stories are grouped by role. IDs: `US-<ROLE>-<n>`.

---

## Owner

### US-OWN-1 — Consolidated dashboard
As an **Owner**, I want a consolidated dashboard across all branches, so that I understand overall business health at a glance.
- **AC1:** Shows total members, total revenue (period), monthly profit, outstanding payments, expiring memberships, daily attendance.
- **AC2:** A branch switcher toggles between "All Branches" and a single branch.
- **AC3:** All figures respect the selected date range.
- **AC4:** Numbers reconcile with the underlying reports (same totals).

### US-OWN-2 — Branch comparison
As an **Owner**, I want to compare branches on revenue, expense, profit, and member growth, so that I can spot under/over-performers.
- **AC1:** Side-by-side table + bar chart for the selected metric and period.
- **AC2:** Branches sortable by any metric; % change vs previous period shown.
- **AC3:** Exportable to Excel/PDF.

### US-OWN-3 — Manage branches
As an **Owner**, I want to create and manage branches, so that the business can expand.
- **AC1:** Create with name, code, address, hours, contact.
- **AC2:** Deactivate blocks new members/payments but keeps history.
- **AC3:** Reassigning a manager updates access immediately.

### US-OWN-4 — Manage packages & pricing
As an **Owner**, I want to define packages and prices, so that sales are consistent.
- **AC1:** Create trainer/non-trainer/custom packages with duration, price, tax, sessions.
- **AC2:** Set package as branch-specific or all-branches.
- **AC3:** Editing price does not alter historical membership price snapshots.

### US-OWN-5 — Payroll oversight
As an **Owner**, I want to review and approve payroll, so that staff are paid correctly.
- **AC1:** See salary, commission, bonus, deductions per staff per period.
- **AC2:** Generate payslips (PDF).
- **AC3:** Salary data hidden from non-privileged roles.

---

## Branch Manager

### US-MGR-1 — Branch-scoped dashboard
As a **Manager**, I want a dashboard for my branch only, so that I focus on my targets.
- **AC1:** All widgets scoped to assigned branch; no other branch data visible.
- **AC2:** Attempting to access another branch's records is denied (403).

### US-MGR-2 — Manage members & staff
As a **Manager**, I want to manage members and staff in my branch, so that operations run smoothly.
- **AC1:** Create/edit members, assign trainers, adjust memberships.
- **AC2:** Add/edit staff except cannot exceed own permission level.

### US-MGR-3 — Expenses & profit
As a **Manager**, I want to record branch expenses and see branch profit, so that I control costs.
- **AC1:** Add expense with category, amount, vendor, receipt.
- **AC2:** Monthly profit = branch income − branch expense, shown live.

---

## Receptionist

### US-REC-1 — Onboard a member (wizard)
As a **Receptionist**, I want a fast step-by-step onboarding, so that I register members in minutes.
- **AC1:** 8 steps; progress saved between steps; can go back.
- **AC2:** Minimal typing (pickers, toggles); photo capture from camera.
- **AC3:** Ends with invoice, receipt, and membership card.
- **AC4:** Onboarding completes in under 4 minutes for a typical member.

### US-REC-2 — Renew membership
As a **Receptionist**, I want to renew a membership, so that members stay active.
- **AC1:** Search member → select package → collect payment → new period created.
- **AC2:** If renewed before expiry, new period starts at old expiry (no lost days).

### US-REC-3 — Collect payment & receipt
As a **Receptionist**, I want to collect payment and issue a receipt, so that records are accurate.
- **AC1:** Choose method (cash/card/UPI/bank/online/installment).
- **AC2:** Receipt PDF generated + shareable via WhatsApp/SMS/email.
- **AC3:** Outstanding balance updates immediately.

### US-REC-4 — Check-in / check-out
As a **Receptionist**, I want to check members in/out, so that attendance is captured.
- **AC1:** QR / member ID / phone lookup.
- **AC2:** System warns on expired membership or no branch access.

### US-REC-5 — Enquiries & appointments
As a **Receptionist**, I want to log enquiries and schedule appointments, so that leads convert.
- **AC1:** Capture lead (name, phone, interest, source, follow-up date).
- **AC2:** Convert an enquiry into a member (prefills wizard).

---

## Trainer

### US-TRN-1 — See assigned members
As a **Trainer**, I want to see only my assigned members, so that I focus on my clients.
- **AC1:** List shows my members with goal, last workout, adherence.
- **AC2:** No access to unassigned members' plans.

### US-TRN-2 — Build workout plans
As a **Trainer**, I want to build workout plans from the exercise library, so that members train effectively.
- **AC1:** Create templates and weekly/monthly/personal plans.
- **AC2:** Add exercises with sets/reps/rest; reorder; assign to member/group.

### US-TRN-3 — Build diet plans
As a **Trainer/Dietician**, I want to create diet plans with macros, so that nutrition supports goals.
- **AC1:** Meals with calories, protein, carbs, fat; daily water goal.
- **AC2:** Assign to a member; member can request changes.

### US-TRN-4 — Track progress & measurements
As a **Trainer**, I want to update measurements and view progress, so that I can show results.
- **AC1:** Add measurement entry; charts update.
- **AC2:** Before/after photo comparison available.

### US-TRN-5 — PT sessions & reminders
As a **Trainer**, I want to schedule PT sessions and send reminders, so that sessions aren't missed.
- **AC1:** Create session (member, date/time, duration).
- **AC2:** Reminder pushed to member; trainer notes attachable.

---

## Member

### US-MBR-1 — Today's plan
As a **Member**, I want to see today's workout and diet, so that I know exactly what to do.
- **AC1:** Home shows today's workout, today's meals, water goal, membership status.
- **AC2:** Tapping a workout opens the logging screen.

### US-MBR-2 — Log workout & PRs
As a **Member**, I want to log weights/reps and save PRs, so that I track progress.
- **AC1:** Per set, enter weight/reps; mark set/exercise done.
- **AC2:** New PR is highlighted and saved.
- **AC3:** Rate the workout (1–5) on completion.

### US-MBR-3 — Track diet & water
As a **Member**, I want to mark meals complete, upload meal photos, and track water, so that I stay accountable.
- **AC1:** Tap to complete a meal; upload photo; water counter increments.
- **AC2:** Daily adherence % shown.

### US-MBR-4 — Progress & photos
As a **Member**, I want to record measurements and upload progress photos, so that I see my transformation.
- **AC1:** Add measurements; view charts.
- **AC2:** Before/after slider.

### US-MBR-5 — Membership & online payment
As a **Member**, I want to see my membership status and pay online, so that I never lapse.
- **AC1:** Shows package, expiry, dues.
- **AC2:** Pay via Razorpay/Stripe; receipt available after success.

### US-MBR-6 — Reminders & chat
As a **Member**, I want reminders and trainer chat, so that I stay motivated and supported.
- **AC1:** Receive workout/meal/water/expiry reminders per my preferences.
- **AC2:** Chat 1:1 with assigned trainer (P2).

---

## Cross-cutting stories

### US-X-1 — Data isolation
As **any staff below Owner**, I must never see data outside my branch (or my assigned members), so that privacy and integrity hold.
- **AC1:** API rejects out-of-scope reads/writes with 403.
- **AC2:** UI never renders out-of-scope entities.

### US-X-2 — Dark mode & offline
As **any user**, I want dark mode and reliable offline behavior for core flows, so that the app is pleasant and dependable.
- **AC1:** Theme toggle persists.
- **AC2:** Check-in and workout logging queue offline and sync later (P2).

### US-X-3 — Audit trail
As an **Owner**, I want financial and permission changes logged, so that I can investigate disputes.
- **AC1:** Each such action records actor, timestamp, before/after.
