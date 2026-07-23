# 5. Screen-by-Screen Wireframe Descriptions

Textual wireframes (low-fi). Each screen lists: **purpose, layout regions, key components, primary action, states**. Mobile-first (375×812 baseline); desktop notes where relevant. ASCII boxes are illustrative, not pixel-accurate.

Legend: `[ ]` button · `( )` toggle/radio · `▸` list row · `≡` menu · `⌕` search · `＋` FAB.

---

## 5.0 Shared shells

### App shell (mobile)
```
┌───────────────────────────────┐
│ ≡  FitCore · Kochi ▾      ⌕  🔔 │  ← top app bar (branch switcher = Owner only)
├───────────────────────────────┤
│                               │
│         SCREEN CONTENT        │
│                               │
├───────────────────────────────┤
│  ◧    ◑    ＋    ◔    ⚙        │  ← bottom nav (role-specific, max 5) + center FAB
└───────────────────────────────┘
```
States: loading (skeletons), empty (illustration + CTA), error (retry), offline (banner).

### Auth — Sign in
- **Regions:** logo, email/phone field, password, [Sign in], "Forgot password?", theme toggle.
- **Member variant:** phone field + [Send OTP] → OTP 6-box input → [Verify].
- **States:** validating, invalid credentials, locked after N attempts.

---

## 5.1 Owner

### Owner Dashboard (`/owner/dashboard`)
- **Purpose:** business health at a glance.
- **Layout:**
```
[ All Branches ▾ ]        [ This Month ▾ ]
┌ KPI ┐ ┌ KPI ┐ ┌ KPI ┐ ┌ KPI ┐
│Membrs││Revenue││Profit ││Dues  │   ← 2×2 KPI cards (scroll on desktop = 4 across)
└─────┘ └─────┘ └─────┘ └─────┘
[ Revenue trend line chart ]
[ Branch comparison bar chart ]
[ Expiring memberships ▸ list ]
[ Today attendance sparkline ]
```
- **Components:** KPI card (value, label, %Δ, trend arrow), charts, quick links.
- **Primary action:** branch switcher / period filter.
- **States:** consolidated vs single-branch; empty (new business).

### Branches list (`/owner/branches`)
- Rows: branch name, code, members count, MTD revenue, status pill; **＋ Add branch** FAB.
- Tap → **Branch detail**: KPIs, staff list, packages, edit form, activate/deactivate.

### Reports hub (`/owner/reports`)
- Grid of report tiles (Revenue, Expense, Profit, Attendance, Trainer, Member Growth, Package, Salary, Branch Comparison, Payment).
- Each opens a **report screen**: filters (date range, branch), chart, data table, [Export ▾ Excel/CSV/PDF].

### Finance (`/owner/finance`)
- Tabs: Revenue · Expenses · Payroll · Outstanding.
- Outstanding: list of members with dues, aging buckets (0–30/31–60/60+), [Send reminder].

---

## 5.2 Branch Manager

### Manager Dashboard (`/branch/dashboard`)
- Same KPI card system as Owner but **locked to assigned branch** (no branch switcher).
- Widgets: today's check-ins, new members (period), dues, expiring, staff on leave.

### Members list (`/branch/members`, also reception)
```
⌕ search by name/phone/code            [ Filters ▾ ]
▸ Photo · Name · Package · Expiry pill · Dues
▸ ...
＋ Add member
```
- Filters: status (active/expired/frozen), package, trainer, expiring soon.

### Attendance (`/branch/attendance`)
- Tabs: Members · Staff.
- Peak-hours heatmap (hour × day). Daily list with check-in/out times & duration.

---

## 5.3 Receptionist

### Reception Home (`/reception/home`)
- **Purpose:** front-desk cockpit.
```
Today: [ Check-ins 42 ] [ Renewals 5 ] [ Payments ₹18,400 ] [ Enquiries 7 ]
[ ＋ New Member ] [ Check-in ] [ New Payment ] [ New Enquiry ]   ← big touch tiles
Upcoming appointments ▸
Expiring this week ▸
```

### Onboarding Wizard (`/reception/members/new`)
- **Global chrome:** top progress bar `Step 3 / 8`, [Back] [Next]; autosaves draft.
- **Step 1 Personal:** name, mobile, email, gender (chips), DOB (date → age auto), address, emergency contact, **photo (camera/upload)**.
- **Step 2 Measurements:** numeric steppers for height/weight (BMI auto-badge), body-fat, waist, chest, arms, hips, thighs.
- **Step 3 Goals:** multi-select goal chips with icons.
- **Step 4 Medical:** repeatable rows for injuries/diseases/allergies/medicines; limitations textarea.
- **Step 5 Food:** diet type radio, allergies, water intake stepper, meal preference.
- **Step 6 Package:** cards (name, price, duration, sessions) filtered to branch; selecting a trainer package flags Step 7 as required.
- **Step 7 Trainer:** trainer cards (photo, specialization, current load); search; "Skip" if allowed.
- **Step 8 Payment:** method chips; installment builder; online → checkout; on success **success screen** with [View Invoice] [Share Receipt] [Membership Card].
- **States:** duplicate-mobile warning; validation per step; resume draft.

### Check-in (`/reception/check-in`)
- Big **QR scanner** viewport + "or enter ID/phone".
- On match: member card (photo, name, membership pill, streak), [Check in] / [Check out].
- Warnings: expired (→ [Renew]), wrong branch (manager override).

### Payments / Receipts
- New payment form (member picker, invoice/amount, method); receipt preview → [Share ▾ WhatsApp/SMS/Email] [Download PDF].

### Enquiries
- Kanban or list pipeline: New → Contacted → Trial → Won/Lost; row → detail with follow-ups; [Convert to member].

---

## 5.4 Trainer

### Trainer Today (`/trainer/today`)
```
Today's sessions ▸ (time · member · type)
Assigned members: 24        Pending reviews: 3
[ ＋ New Plan ] [ Schedule PT ]
Quick: members needing attention (low adherence) ▸
```

### Assigned Members (`/trainer/members`)
- List with adherence ring, last workout, goal; tap → **member coaching profile** (measurements, plans, progress, notes, chat).

### Workout Builder (`/trainer/workouts/builder`)
```
Plan name ____   Goal ▾   Weeks __   Days/week __
[ Day 1 ][ Day 2 ]... tabs
  Day 1:
   ▸ Exercise (drag ⋮⋮)  sets×reps  rest  [demo]
   [ ＋ Add exercise ]  → library search (filters: muscle, equipment, difficulty)
[ Save as Template ]  [ Assign ▾ member/group ]
```
- Exercise library modal: thumbnail, name, muscle, equipment, difficulty; tap to add.

### Diet Builder (`/trainer/diet/builder`)
- Meals (Breakfast/Lunch/Dinner/Snacks) with items; per meal macros; day totals (kcal/P/C/F) auto-summed; water goal; [Assign].

### Progress (`/trainer/progress` / member profile tab)
- Metric selector chips → line chart; measurement table; photos before/after slider.

---

## 5.5 Member (the consumer app)

### Member Home (`/member/home`)
```
Hi Fathima 👋   🔥 12-day streak
[ Today's Workout card → Start ]
[ Today's Diet card → 2/5 meals ]
[ Water ring 1.2 / 3.0 L  + ]
Membership: Active · expires in 18 days [ Renew ]
Progress snapshot (weight −2.1 kg this month)
```

### Workout Player (`/member/workout/:planId`)
- Exercise carousel; demo (image/video/steps); **set logger** (weight/reps steppers, done check); rest timer; PR badge; finish → rating + summary.

### Diet (`/member/diet`)
- Meal list with macros; tap meal → complete + photo; water tracker ring; adherence %; [Request change].

### Progress (`/member/progress`)
- Charts (weight/BMI/fat%/girths) with range chips (1M/3M/6M/1Y); photos tab with before/after slider; [Add entry].

### Membership & Payments (`/member/membership`)
- Card: package, start/expiry, sessions left; dues alert; [Pay now] → gateway; payment history list; receipts downloadable; **digital membership card (QR)**.

### Chat (`/member/chat`) — P2
- 1:1 with assigned trainer; text + image; plan-change requests threaded.

### Profile / Settings (shared)
- Personal info, notification preferences (per channel/type toggles), theme (system/light/dark), language, sign out.

---

## 5.6 Empty / error / offline patterns (all screens)
- **Empty:** friendly illustration + one-line explainer + primary CTA.
- **Loading:** skeleton cards matching final layout (no spinners for lists).
- **Error:** inline card with cause + [Retry]; toast for transient failures.
- **Offline:** top banner "You're offline — changes will sync"; check-in & workout logging remain usable (queued).
- **Permission denied:** full-screen 403 with "Go to your dashboard".
