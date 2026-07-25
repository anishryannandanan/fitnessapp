# FitCore — Fitness & Gym Management Platform

> A modern, mobile-first, multi-branch gym management platform for a **single gym business** owned by **one owner**. **Not a SaaS. Not multi-tenant.** One business, many branches.

This directory contains the **complete product & engineering specification**. It is written to be detailed enough that a UI/UX designer and a full-stack team can start designing and building immediately, without further clarification.

---

## Product name

Working title: **FitCore** (used throughout the docs; rename freely).

Example business used in the docs:

```
Fitness World  (the one business)
├── Kochi Branch
├── Kottayam Branch
├── Ernakulam Branch
└── Trivandrum Branch
```

Everything belongs to the same business. The owner manages all branches; every other role is scoped to a single assigned branch (except Members, who have a Home Branch and optional multi-branch visiting).

---

## Document index (the 20 deliverables)

| # | Deliverable | File |
|---|-------------|------|
| 1 | Product Vision | [`01-product-vision.md`](./01-product-vision.md) |
| 6 | Information Architecture | [`01-product-vision.md`](./01-product-vision.md) (§ IA) |
| 2 | Functional Requirements | [`02-functional-requirements.md`](./02-functional-requirements.md) |
| 3 | User Stories | [`03-user-stories.md`](./03-user-stories.md) |
| 4 | Complete User Flows | [`04-user-flows.md`](./04-user-flows.md) |
| 5 | Screen-by-Screen Wireframes | [`05-wireframes.md`](./05-wireframes.md) |
| 7 | Database Schema | [`06-database-schema.md`](./06-database-schema.md) |
| 8 | API Documentation | [`07-api-documentation.md`](./07-api-documentation.md) |
| 10 | Technology Stack | [`08-technology-stack.md`](./08-technology-stack.md) |
| 9 | Folder Structure | [`09-folder-structure.md`](./09-folder-structure.md) |
| 11 | UI Design Guidelines | [`10-ui-design-guidelines.md`](./10-ui-design-guidelines.md) |
| 12 | Security Model | [`11-security-model.md`](./11-security-model.md) |
| 13 | Notifications | [`12-notifications.md`](./12-notifications.md) |
| 14 | Validation Rules | [`13-validation-rules.md`](./13-validation-rules.md) |
| 15 | Business Rules | [`14-business-rules.md`](./14-business-rules.md) |
| 16 | Reports | [`15-reports.md`](./15-reports.md) |
| 17 | Edge Cases | [`16-edge-cases.md`](./16-edge-cases.md) |
| 18 | MVP Features | [`17-mvp-and-future.md`](./17-mvp-and-future.md) |
| 19 | Future Features | [`17-mvp-and-future.md`](./17-mvp-and-future.md) |
| 20 | Development Roadmap | [`18-development-roadmap.md`](./18-development-roadmap.md) |

---

## How to read this spec

- **Product / stakeholders** → start with `01`, `02`, `03`, `17`, `18`.
- **UX / design** → `04`, `05`, `10`, plus IA in `01`.
- **Backend engineers** → `06`, `07`, `08`, `11`, `13`, `14`.
- **Frontend engineers** → `05`, `08`, `09`, `10`, `12`.
- **QA** → `13`, `14`, `16`, plus acceptance criteria in `03`.

---

## Core constraints (non-negotiable)

1. **Single business, single owner.** There is no super-admin, no tenant registration, no gym signup flow.
2. **Multi-branch.** Unlimited branches. Almost every domain entity carries a `branch_id`.
3. **No SaaS / no gym subscription billing.** Members pay for memberships; the *gym* does not pay us a subscription.
4. **No franchise management.** Branches are operationally owned by the same business.
5. **Mobile-first + PWA.** Designed for phones first; installable; offline-tolerant for key flows.
6. **Role-scoped data.** Owner sees everything; everyone else is scoped to their branch (or their assigned members).
