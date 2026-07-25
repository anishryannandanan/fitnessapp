# 15. Business Rules

Authoritative business logic. These are enforced server-side and drive validation, permissions, and reporting.

## 15.1 Business & branch
- **BR-1** Exactly **one** business exists. No UI/API creates or deletes a business. Seeded at deployment.
- **BR-2** Branches are unlimited. Every operational record belongs to exactly one branch (except business-level: exercise library, business settings).
- **BR-3** A branch cannot be hard-deleted if it has members/payments/history; it is **deactivated** (blocks new operations, keeps history).
- **BR-4** The Owner sees all branches (consolidated or single). All other roles are locked to their assigned branch(es).

## 15.2 Roles & access
- **BR-5** Managers, Receptionists, Trainers each belong to one branch (rarely more via `user_branches`).
- **BR-6** Trainers access only their **assigned** members' training/health data.
- **BR-7** Salary/payroll data is invisible to Receptionists and Trainers (trainers see only their own payslip).
- **BR-8** Only Owner manages branches, business settings, and cross-branch pricing; Managers manage within their branch.

## 15.3 Members & branches
- **BR-9** Every member has exactly one **Home Branch**.
- **BR-10** A member may check in at other branches **only** if `multi_branch_access` is enabled (Owner-controlled, default off).
- **BR-11** A phone number should be unique per member; duplicates are flagged (merge/open-existing), not silently duplicated.
- **BR-12** Member revenue, attendance, and reports are attributed to the branch where the transaction/visit occurred; membership belongs to home branch unless configured otherwise.

## 15.4 Packages & memberships
- **BR-13** Package types: **Trainer** (includes trainer + PT sessions), **Non-Trainer** (gym/cardio/classes/duration-based), **Custom**.
- **BR-14** A trainer package **requires** a trainer assignment; non-trainer packages may skip.
- **BR-15** `price_snapshot` and `tax_snapshot` on a membership are immutable; later price edits never change historical memberships or receipts.
- **BR-16** Renewal stacking: renewing **before** expiry starts the new term at the current expiry (no lost days); renewing **after** expiry starts today.
- **BR-17** Freezing pauses the membership and **extends expiry** by the frozen duration; attendance is blocked during a freeze.
- **BR-18** Only one **active** membership per member at a time (renewals extend/queue; overlapping active memberships not allowed unless add-on package — P2).

## 15.5 Payments, invoices, receipts
- **BR-19** Every membership sale/renewal generates an **invoice**; every payment generates a **receipt**.
- **BR-20** A membership becomes **active** only when the required amount is paid, or a valid installment plan (with down payment) is created.
- **BR-21** Payments never exceed invoice balance; overpayment is disallowed (advance credit is P2).
- **BR-22** Online payment status is authoritative via **webhook** (verify signature; idempotent by gateway payment id). Client "success" alone never activates.
- **BR-23** Refunds reduce recognized revenue, require Manager+ approval, carry a reason, and are audit-logged.
- **BR-24** Outstanding = sum of invoice balances; aged into 0–30 / 31–60 / 60+ buckets for dunning.
- **BR-25** Installments: total = down payment + Σ installments; each installment tracked with due date & status; overdue installments trigger `payment_due`.

## 15.6 Attendance
- **BR-26** Check-in methods: QR, member ID, mobile, manual. Visit duration = check_out − check_in.
- **BR-27** Expired membership check-in **warns** staff and offers renewal (does not hard-block by default; configurable to block).
- **BR-28** Wrong-branch check-in without multi-branch access is **blocked**; a Manager may override (logged).
- **BR-29** Peak-hour analytics computed from check-in timestamps per branch.
- **BR-30** Staff attendance and leave are tracked separately and feed hourly payroll.

## 15.7 Payroll
- **BR-31** Salary models: monthly, hourly, trainer commission, per-session, plus bonus and deduction.
- **BR-32** Trainer commission computed from assigned/converted memberships or completed sessions per configurable rule (P2 automation; MVP = manual entry).
- **BR-33** Net pay = base + commission + session pay + bonus − deduction; cannot be negative (warn/adjust).
- **BR-34** Approved payroll can be recorded as a **Salary expense** feeding branch profit.
- **BR-35** Payslips generated only after approval.

## 15.8 Expenses & profit
- **BR-36** Expenses categorized (rent, electricity, internet, equipment, repairs, cleaning, marketing, salary, misc), always branch-scoped.
- **BR-37** **Monthly Profit (branch)** = Income (payments recognized, minus refunds) − Expenses (incl. salary) for the period.
- **BR-38** **Consolidated Profit** = Σ branch profits (Owner view).
- **BR-39** Recurring expenses auto-generate on schedule (P2).

## 15.9 Workouts & diet
- **BR-40** Only Trainers/Dieticians create plans; assigned to member or group. Members log completion.
- **BR-41** PRs are computed server-side from logged sets; a new max weight (or reps at weight) sets a PR.
- **BR-42** Diet adherence % = completed meals / planned meals for the day; water progress vs goal.
- **BR-43** Members may request plan changes; trainer approves/edits.

## 15.10 Progress
- **BR-44** Measurements form a time series; BMI derived and stored per entry for historical accuracy.
- **BR-45** Both member and assigned trainer can add entries; before/after comparison uses tagged photos.

## 15.11 Notifications
- **BR-46** High-priority financial/security notices always delivered on ≥ 1 channel regardless of mute.
- **BR-47** Expiry reminders at 7/3/0 days; dues reminders daily until cleared.
- **BR-48** Announcements target all branches / branch / role / segment; Managers limited to their branch.
- **BR-49** Quiet hours honored for non-urgent messages.

## 15.12 Data lifecycle
- **BR-50** Financial records (invoices, payments, payroll) are retained per policy (default 7 years) and are **append-only** (corrections via new entries/void, not edits).
- **BR-51** Member deletion anonymizes personal/health data but preserves financial history (tied to branch reporting).
- **BR-52** All financial and permission-changing actions are audit-logged with actor + before/after.

## 15.13 Currency & tax
- **BR-53** Single business currency (default INR), configurable in settings; all money stored in minor units.
- **BR-54** Tax percent per package; invoice stores computed subtotal/tax/total snapshots.
