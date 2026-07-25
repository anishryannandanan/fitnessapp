# FitCore — Web (frontend)

A **React SPA** (Single Page Application) for the FitCore multi-branch gym management platform. Built with **Vite + React 18 + TypeScript + Tailwind CSS**, with client-side routing (no full page reloads) and installable PWA support — for a fast, app-like experience on mobile.

See the full product & engineering spec in [`../../docs`](../../docs).

## Tech stack

- **Vite 5** — fast dev server + optimized, code-split production builds
- **React 18 + TypeScript**
- **React Router 6** — client-side routing (instant navigation)
- **TanStack Query** — server-state/data fetching (currently backed by a mock API)
- **Zustand** — light client state (auth session, active branch)
- **Tailwind CSS** — design tokens with light/dark theme
- **Recharts** — dashboard charts
- **vite-plugin-pwa** — installable Progressive Web App

## Getting started

```bash
# from apps/web
pnpm install      # or: npm install
pnpm dev          # start dev server at http://localhost:5173
pnpm build        # typecheck + production build to dist/
pnpm preview      # preview the production build
```

## What's included (scaffold)

- **Role-based sign-in** (demo): pick Owner / Manager / Receptionist / Trainer / Member.
- **App shell**: top bar (with branch switcher for Owner), sidebar (desktop) and bottom navigation (mobile), dark/light theme toggle.
- **Role-scoped routing** with a `RequireRole` guard mirroring the backend RBAC.
- **Dashboards**: Owner (KPIs + revenue trend + branch comparison charts), Manager, Reception, Trainer, and Member home.
- **Members list** with search UI and status/dues badges.
- Remaining screens are **scaffolded placeholders** ("Coming soon") wired into navigation, ready to be built out per the spec.

## Mock data → real API

Data currently comes from `src/lib/api.ts` (mock, backed by `src/lib/mockData.ts`).
Swap those functions for real `fetch` calls to the REST API in
[`../../docs/07-api-documentation.md`](../../docs/07-api-documentation.md) — component code stays the same.

## Structure

```
src/
  components/     UI primitives (Card, KpiCard…) + layout (AppShell, TopBar, BottomNav, Sidebar)
  config/         navigation.ts (role-based nav + landing routes)
  lib/            api (mock), types, mockData, format, cn
  pages/          role screens (owner, branch, reception, trainer, member, shared)
  providers/      ThemeProvider, QueryProvider
  stores/         auth (zustand)
  router.tsx      route tree with role guards
  main.tsx        entry point
```
