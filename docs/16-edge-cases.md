# 17. Edge Cases

Grouped by domain. Each lists the scenario and the **expected handling**. QA should turn these into test cases.

## 17.1 Members & onboarding
- **Duplicate mobile** during onboarding → warn; offer "open existing member" or continue; never silently duplicate.
- **Abandoned wizard** → saved as `draft`; resumable; drafts excluded from active counts.
- **Underage member (<12)** → block by default; Manager override with note.
- **Member with no email** → allowed (phone/OTP identity); email-only notifications skipped.
- **Photo upload fails** → onboarding continues; avatar falls back to initials; retry later.
- **Member deleted but has financial history** → anonymize PII, retain financial rows (BR-51).

## 17.2 Multi-branch
- **Check-in at non-home branch without access** → blocked; Manager override logged; suggest enabling multi-branch access.
- **Member transferred to another home branch** → historical revenue/attendance stay with original branch; future with new branch.
- **Branch deactivated with active members** → no new operations; existing members warned; Owner reassigns or members migrate.
- **Staff assigned to a deactivated branch** → access suspended; reassign required.

## 17.3 Packages & memberships
- **Price changed after member bought** → historical `price_snapshot` unchanged; only new sales use new price.
- **Renew before expiry** → stack (new term starts at current expiry).
- **Renew long after expiry** → new term starts today; gap recorded (affects churn metrics).
- **Overlapping memberships** → blocked (one active) unless add-on (P2).
- **Package deleted/deactivated with active members** → memberships continue to their end; not renewable on that package.
- **Freeze spanning renewal** → expiry extended by freeze; interactions with new term resolved by "extend then apply renewal".

## 17.4 Payments
- **Online payment succeeds at gateway but webhook delayed** → payment shows pending; webhook reconciles; no double-charge; membership activates on confirmation.
- **Webhook received before client returns** → idempotent by gateway id; single payment record.
- **Duplicate webhook** → ignored (idempotency).
- **Partial payment / installments** → invoice `partially_paid`; balance tracked; overdue installment triggers reminder.
- **Refund after revenue recognized** → refund record reduces net revenue in period of refund; audit-logged.
- **Overpayment attempt** → rejected (MVP); advance credit is P2.
- **Cash mismatch / wrong amount entered** → correction via void + re-enter (append-only), not edit; audit trail.
- **Currency mismatch** → single business currency enforced; no mixed-currency payments.

## 17.5 Attendance
- **Member never checks out** → auto-close at branch closing time (configurable) with flagged duration; excluded from avg-duration accuracy or capped.
- **Double check-in (already open)** → return existing open session or force checkout per policy; no duplicate open sessions.
- **Expired membership check-in** → warn + offer renewal (configurable to hard-block).
- **Clock skew / offline check-in** → queued with device timestamp; server validates; deduped on sync.
- **QR of another member** → validated against member record + branch; mismatch rejected.

## 17.6 Staff & payroll
- **Negative net pay** (deductions > earnings) → blocked/warn; requires explicit adjustment.
- **Trainer leaves mid-period** → prorate; unassign members (reassign flow); commission settled up to date.
- **Staff attendance missing for hourly pay** → flagged; manual entry required before payroll approval.
- **Commission for a membership later refunded** → clawback rule (P2) or manual deduction.

## 17.7 Workouts & diet
- **Trainer unassigned from member** → member keeps existing plans (read-only) until reassigned; new trainer can edit.
- **Member logs a workout with no assigned plan** → allowed as free/ad-hoc log; still contributes to history/PRs.
- **PR tie** (same weight, more reps) → new PR by reps; documented rule.
- **Plan assigned then deleted** → member sees archived plan; logs preserved.
- **Water/meal reminders after goal met** → suppressed for the day.

## 17.8 Progress
- **Impossible measurement** (out of range) → rejected by validation.
- **Photos of wrong pose / missing tag** → still stored; before/after uses same pose; warn if comparing different poses.
- **Backdated entry** → allowed if not future; charts re-sorted by date.

## 17.9 Notifications
- **Push token expired/unregistered** → mark stale, remove; fall back to email/SMS for high-priority.
- **SMS/WhatsApp provider outage** → fallback channel; retry with backoff; dead-letter.
- **Quiet hours vs high-priority** → high-priority (dues/security) may bypass quiet hours; low-priority deferred.
- **Broadcast segment resolves to 0 recipients** → blocked with message.

## 17.10 Auth & access
- **Role/branch changed mid-session** → tokens re-issued/short-lived; access re-evaluated on next request; sensitive actions re-checked.
- **Manager tries another branch's record** → 403; UI hides.
- **Trainer accesses unassigned member** → 403.
- **Member accesses another member** → 403.
- **Concurrent edits** (two staff edit same member) → optimistic concurrency (updated_at check); last-writer warned/merged.

## 17.11 Reports & data
- **Empty period** → report renders zero-state, not error.
- **Timezone boundaries** → aggregates use branch timezone; "today" respects branch tz.
- **Large export** → runs as job; link delivered when ready; guarded against timeout.
- **Consolidated across branches with different currencies** → not applicable (single currency), documented assumption.

## 17.12 System & PWA
- **Offline** → check-in and workout logging queued; sync on reconnect; conflicts resolved by timestamp + server rules.
- **Stale cached data** → TanStack Query revalidation; show "updated X ago".
- **Failed background job** → retried; alerts on repeated failure; idempotent so safe to re-run.
- **First-run (no branches yet)** → guided setup for Owner to create the first branch, packages, and staff.
