# 11. UI Design Guidelines

Design target: the polish of **Fitbod, Strong, MyFitnessPal, Apple Fitness, Google Fit** — clean, motivating, rounded, fast, mobile-first. Dark and light modes are first-class.

## 11.1 Design principles
1. **Thumb-first.** Primary actions in the bottom third; bottom nav + FAB.
2. **One primary action per screen.** Everything else is secondary.
3. **Cards over tables** on mobile; tables appear on tablet/desktop.
4. **Motion with meaning.** Subtle spring animations for state changes, PR celebrations, progress rings.
5. **Data as delight.** Streaks, rings, PRs, before/after — make numbers feel like wins.
6. **Accessible always.** WCAG AA contrast, 44px min touch targets, focus states, reduced-motion support.

## 11.2 Color palette (fitness, energetic, trustworthy)

**Brand / accent**
| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `#16A34A` (energetic green) | `#22C55E` | primary buttons, active nav, progress |
| `--primary-foreground` | `#FFFFFF` | `#062B14` | text on primary |
| `--accent` | `#F97316` (orange) | `#FB923C` | streaks, highlights, PRs |
| `--info` | `#3B82F6` | `#60A5FA` | links, informational |
| `--success` | `#22C55E` | `#4ADE80` | paid, completed |
| `--warning` | `#F59E0B` | `#FBBF24` | expiring, dues soon |
| `--danger` | `#EF4444` | `#F87171` | overdue, errors, destructive |

**Neutrals (surfaces)**
| Token | Light | Dark |
|---|---|---|
| `--background` | `#F8FAFC` | `#0B0F14` |
| `--surface` (card) | `#FFFFFF` | `#141A21` |
| `--surface-2` | `#F1F5F9` | `#1C242D` |
| `--border` | `#E2E8F0` | `#26303A` |
| `--text` | `#0F172A` | `#E5EDF5` |
| `--text-muted` | `#64748B` | `#94A3B8` |

**Data-viz sequence** (charts, branch comparison): `#16A34A, #3B82F6, #F97316, #A855F7, #EC4899, #14B8A6`.

Gender-neutral, motivating gradient for hero cards: `linear-gradient(135deg,#16A34A,#3B82F6)`.

## 11.3 Typography
- **Font:** Inter (UI) + optional `Sora`/`Space Grotesk` for big numbers/headers. Tabular numerals for money & stats.
- **Scale (rem):** display 2.25 / h1 1.875 / h2 1.5 / h3 1.25 / body 1 / small 0.875 / caption 0.75.
- **Weights:** 700 headings, 600 emphasis, 400 body. Line-height 1.4–1.6.

## 11.4 Spacing, radius, elevation
- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40 (Tailwind default).
- **Radius:** `sm 8`, `md 12`, `lg 16`, `xl 20`, `2xl 24`, `full` for pills/avatars. Cards default `2xl` (rounded, premium feel).
- **Shadows:** soft, low-opacity (`0 1px 2px`, `0 8px 24px` for elevated sheets). In dark mode use subtle borders instead of heavy shadows.

## 11.5 Core components (shadcn/ui based)
- **KPI Card:** big tabular number, label, %Δ chip (green up / red down), sparkline.
- **Stat Ring:** water/diet/workout completion (animated SVG ring).
- **Member Card:** avatar, name, membership pill, dues badge, quick actions.
- **Package Card:** name, price, duration, sessions, "select" CTA.
- **Bottom Nav:** 4–5 items + center FAB, active state uses `--primary`.
- **Branch Switcher:** segmented dropdown in top bar (Owner only) with "All Branches".
- **Wizard Stepper:** top progress bar + step dots; sticky Back/Next footer.
- **Chart wrappers:** LineChart, BarChart (comparison), Heatmap (peak hours), all responsive.
- **Sheets & Dialogs:** bottom sheets on mobile, centered dialogs on desktop.
- **Toasts / Inline alerts / Empty states / Skeletons** per `05-wireframes.md §5.6`.
- **Membership Card:** QR + branding, downloadable/shareable.

## 11.6 Iconography & imagery
- **Icons:** Lucide (consistent stroke). Exercise/muscle icons custom or from a fitness icon set.
- **Imagery:** exercise demos as looping muted video/GIF or image; progress photos in secure signed URLs; avatar fallbacks with initials.

## 11.7 Mobile-first & PWA requirements
- **Breakpoints:** base (mobile) → `sm 640` → `md 768` (bottom nav → sidebar) → `lg 1024` (multi-column dashboards).
- **Touch:** min 44×44px targets; generous padding; large steppers for numeric entry (minimal typing).
- **PWA:** installable, `manifest.webmanifest`, maskable icons, splash; offline shell; cached exercise media; queued check-in & workout logs; "Add to Home Screen" prompt.
- **Performance budgets:** LCP < 2.5s on 4G, initial JS < 200KB gzipped per route, images lazy + responsive.
- **Gestures:** swipe between workout exercises, pull-to-refresh lists, swipe-to-complete meals.

## 11.8 Dark & light mode
- Theme via CSS variables + Tailwind `dark:` class; toggle persists (localStorage + `prefers-color-scheme` default).
- Charts and gradients have dark variants; ensure contrast AA in both.

## 11.9 Motion
- Durations 150–300ms, spring for celebratory (PR, streak). Respect `prefers-reduced-motion`.
- Micro-interactions: ring fill on completion, confetti burst on new PR, count-up on KPI load.

## 11.10 Accessibility checklist
- Semantic HTML + ARIA on custom controls (Radix handles most).
- Focus-visible rings; keyboard nav for all flows; logical tab order in wizard.
- Color never sole signal (icons/labels accompany status colors).
- Form errors announced; labels tied to inputs; error text adjacent to field.
- Alt text for images; captions/transcripts for exercise videos where possible.
