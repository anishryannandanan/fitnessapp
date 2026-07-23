# 13. Notifications

Multi-channel notification system: **Push (FCM), Email, SMS, WhatsApp**. Users control preferences per type/channel. Delivery is queued via BullMQ workers.

## 13.1 Notification catalog

| Type | Trigger | Default channels | Recipient | Priority |
|---|---|---|---|---|
| `workout_reminder` | Scheduled time / planned workout day | Push | Member | Normal |
| `meal_reminder` | Meal time windows | Push | Member | Low |
| `water_reminder` | Interval until daily goal met | Push | Member | Low |
| `membership_expiry` | 7 days, 3 days, day-of before `end_date` | Push, Email, (SMS/WhatsApp) | Member (+ reception summary) | High |
| `payment_due` | Due today / overdue (daily) | Push, Email, (SMS/WhatsApp) | Member (+ reception) | High |
| `birthday` | Member DOB | Push, WhatsApp | Member | Normal |
| `announcement` | Owner/Manager broadcast | Push, Email, (SMS/WhatsApp) | Segment/branch/all | Normal |
| `trainer_message` | Trainer sends note/chat | Push | Member | Normal |
| `pt_session_reminder` | Before scheduled PT session | Push, SMS | Member + Trainer | High |
| `plan_assigned` | New workout/diet plan assigned | Push | Member | Normal |
| `payment_success` | Gateway webhook confirms | Push, Email | Member | High |
| `system` | Account/security events | Email, Push | User | High |

## 13.2 Channels & providers

| Channel | Provider | Notes |
|---|---|---|
| Push | Firebase Cloud Messaging | Web push (PWA) + future native; tokens in `device_tokens`. |
| Email | Resend / SES | Transactional (receipts, reports, expiry). Templated (React Email). |
| SMS | MSG91 / Twilio | DLT-compliant templates for India; used for high-priority (expiry, dues, OTP). |
| WhatsApp | WhatsApp Cloud API / MSG91 | Approved template messages; rich receipts & reminders (P2). |

**MVP:** Push + Email. **P2:** SMS + WhatsApp.

## 13.3 Preferences model
- `notification_preferences(user_id, type, channel, enabled)` — matrix toggles in Settings.
- Sensible defaults per table 13.1; users can mute low-priority types.
- High-priority financial/security notices (payment_due, security) may be non-mutable on at least one channel.

## 13.4 Scheduling & delivery pipeline
```
Trigger (cron / event / webhook)
  → build notification rows (recipients resolved from segment/branch)
  → enqueue per channel (BullMQ)
  → worker sends via provider adapter
  → record status (queued→sent/failed), sent_at
  → in-app: notifications feed + unread badge; read_at on open
Retry: exponential backoff, max N; dead-letter for failures.
```

### Scheduled jobs (cron)
| Job | Schedule | Action |
|---|---|---|
| Expiry sweep | daily 08:00 (branch tz) | membership_expiry at 7/3/0 days |
| Dues sweep | daily 09:00 | payment_due today + overdue |
| Birthday | daily 07:00 | birthday wishes |
| Workout/meal/water | per-user windows | reminders if not yet done today |
| PT reminders | every 15 min | sessions in next hour |
| Report digests (P3) | daily/weekly/monthly | owner/manager summaries |

## 13.5 In-app center
- Bell icon → notifications feed (grouped by day), unread badge, deep-links to relevant screen (e.g., tap payment_due → membership/payments).
- Announcements show delivery + read stats to Owner/Manager.

## 13.6 Broadcast (announcements)
- Audience builder: **all branches | specific branch(es) | role | segment** (expiring soon, has dues, inactive 14d).
- Choose channels + schedule now/later.
- Rate-limited; preview before send; logged for audit.

## 13.7 Compliance & etiquette
- Respect quiet hours (e.g., 21:00–07:00) for non-urgent pushes.
- SMS/WhatsApp use pre-approved templates (DLT / WA template approval).
- Unsubscribe/opt-out honored for marketing-type messages; transactional exempt.
- Never include sensitive financial detail beyond amount + due date in SMS.
