# 4. Complete User Flows

Flows are written as step sequences with decision points. `[✓]` = happy path, `⟂` = branch/decision, `✗` = error/alt path. Diagrams use simple ASCII; convert to Figma/whimsical during design.

---

## 4.1 Authentication

### Staff sign-in
```
Open app ─▶ Sign-in (email/phone + password)
  ⟂ valid ────────▶ Role redirect (Owner/Manager/Reception/Trainer → dashboard)
  ✗ invalid ──────▶ error toast, remain
  ⟂ "Forgot?" ────▶ enter email/phone ─▶ OTP ─▶ set new password ─▶ sign-in
```

### Member sign-in (OTP-first)
```
Enter mobile ─▶ Receive OTP ─▶ Verify
  ⟂ first login ─▶ set name/photo (if missing) ─▶ Member Home
  ✓ returning ───▶ Member Home
```

---

## 4.2 Member Onboarding (8-step wizard) — Receptionist/Manager

```
[Start] New Member  (branch = current branch context)
 Step 1 Personal Info      → name, mobile, email, gender, DOB(→age auto), address, emergency contact, photo
   ⟂ mobile already exists → offer "open existing member" or "continue as new"
 Step 2 Body Measurements  → height, weight (BMI auto), body-fat, waist, chest, arms, hips, thighs
 Step 3 Fitness Goals      → multi-select (weight loss, muscle gain, bodybuilding, general, rehab, strength, flexibility)
 Step 4 Medical Info       → injuries, diseases, allergies, medicines, physical limitations
 Step 5 Food Preference    → veg/vegan/non-veg, food allergies, water intake, meal preference
 Step 6 Membership Package → pick package (filtered to branch); shows price, duration, tax
   ⟂ trainer package ─────▶ requires Step 7 trainer assignment
   ⟂ non-trainer package ─▶ Step 7 optional (skip allowed)
 Step 7 Trainer Assignment → choose available trainer (by specialization/load)
 Step 8 Payment            → method (cash/card/UPI/bank/online/installment)
   ⟂ installment ─────────▶ define schedule (down payment + n installments)
   ⟂ online ──────────────▶ Razorpay/Stripe checkout ─▶ webhook confirms
   [✓] on success → generate Invoice + Receipt + Membership Card (QR)
 [End] Member created, active membership, appears in trainer's list
```

Wizard rules: each step autosaves as **draft member**; back navigation preserved; abandoning keeps a draft the receptionist can resume.

---

## 4.3 Renewal

```
Search member ─▶ Membership tab ─▶ "Renew"
  select package (defaults to current) ─▶ confirm dates
   ⟂ renewed before expiry → new period starts at current expiry (stacking)
   ⟂ renewed after expiry  → new period starts today
  collect payment ─▶ receipt ─▶ membership status = active, new expiry
```

---

## 4.4 Payment & receipt (walk-in / dues)

```
Payments ─▶ New Payment ─▶ pick member ─▶ select outstanding invoice(s) or amount
  choose method
   ⟂ cash/card/UPI/bank → mark paid, capture reference
   ⟂ online link ───────▶ send payment link (SMS/WhatsApp) → webhook updates
  generate receipt (PDF + share) ─▶ outstanding recalculated
```

---

## 4.5 Attendance check-in

```
Check-in screen (Reception kiosk or member app)
  input: QR scan | member ID | mobile
  lookup member
   ⟂ membership active + branch allowed → record check-in, greet by name, show streak
   ✗ expired ───────────────────────────▶ warn staff, offer renew flow
   ✗ wrong branch (no multi-branch) ─────▶ warn, block or override (manager only)
  later: check-out → compute visit duration
```

---

## 4.6 Trainer builds & assigns a workout plan

```
Trainer ─▶ Workouts ─▶ New Plan (or from Template)
  set plan meta (name, goal, weeks, days/week)
  for each day: add exercises from Library → set sets/reps/rest/tempo → reorder
  save as Template (reusable) and/or Assign to member/group
   ⟂ assign → member gets notification; plan appears on member Home
```

---

## 4.7 Member completes a workout

```
Member Home ─▶ Today's Workout ─▶ Start
  per exercise: view demo (image/video/instructions)
    per set: enter weight + reps → tap done
     ⟂ exceeds previous best → "New PR!" celebration, saved
  finish → rate workout (1–5), optional note → summary (volume, time, PRs)
  history + PR charts updated
```

---

## 4.8 Member diet & water tracking

```
Member ─▶ Diet ─▶ today's meals
  tap meal → mark complete (optional photo upload)
  water: tap + per glass → progress ring toward goal
  adherence % updates; trainer sees summary
  ⟂ "Request change" → message to trainer with note
```

---

## 4.9 Progress tracking

```
Member/Trainer ─▶ Progress ─▶ Add Entry (weight, fat%, muscle, girths)
  charts recompute (line per metric, time on X)
  Photos tab → upload (front/side/back) → before/after slider
```

---

## 4.10 Online payment (member self-serve)

```
Member ─▶ Membership/Payments ─▶ "Pay Now" (dues or renewal)
  Razorpay/Stripe checkout
   [✓] success → webhook → payment recorded, receipt available, membership updated
   ✗ failure/timeout → ret[ry], no partial record; pending state cleared on webhook
```

---

## 4.11 Payroll run — Owner/Manager

```
Payroll ─▶ select period + branch
  system computes per staff: base (monthly/hourly), commission, session pay, bonus − deductions
  review → adjust line items → approve
  generate payslips (PDF) → optionally mark paid + record as Salary expense
```

---

## 4.12 Expense entry & monthly profit

```
Expenses ─▶ Add ─▶ category, amount, date, vendor, note, receipt photo
  save → branch expense total updates
Reports/Dashboard ─▶ Monthly Profit = income − expense (branch and consolidated)
```

---

## 4.13 Owner branch comparison

```
Owner ─▶ Reports ─▶ Branch Comparison
  pick metric (revenue/expense/profit/member growth) + period
  view table + bar chart, sorted; %Δ vs previous period
  export (Excel/CSV/PDF)
```

---

## 4.14 Enquiry → conversion

```
Reception ─▶ Enquiries ─▶ New (name, phone, interest, source, follow-up date)
  follow-ups logged; status pipeline: New → Contacted → Trial → Won/Lost
   ⟂ Won → "Convert to member" → prefilled onboarding wizard
```

---

## 4.15 Notifications broadcast

```
Owner/Manager ─▶ Notifications ─▶ New Announcement
  audience: all branches | specific branch | role | segment (expiring, dues)
  channels: push/email (+SMS/WhatsApp P2) → schedule or send now
  delivery + read stats
```

---

## 4.16 Membership freeze (P2)

```
Member/Reception ─▶ Membership ─▶ Freeze
  reason + date range → membership status = frozen
  expiry extended by frozen duration; attendance blocked during freeze
  auto-unfreeze on end date
```
