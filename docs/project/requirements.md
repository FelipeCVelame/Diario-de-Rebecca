# Requirements: Diário da Rebecca

**Document Version:** 1.0
**Date:** 2026-07-09
**Status:** Living document (app already in production use)

<!-- DOC_KIND: explanation -->
<!-- DOC_ROLE: canonical -->
<!-- READ_WHEN: Read when you need product scope, functional requirements, or acceptance boundaries. -->
<!-- SKIP_WHEN: Skip when you only need implementation details, operations, or low-level schema facts. -->
<!-- PRIMARY_SOURCES: docs/README.md, docs/project/architecture.md, docs/project/tech_stack.md -->

<!-- SCOPE: Functional requirements (FR-XXX-NNN) with MoSCoW prioritization, acceptance criteria, constraints, assumptions ONLY. -->
<!-- DO NOT add here: Tech stack → tech_stack.md, Architecture → architecture.md, Design system → (none yet), Task tracking → tasks/kanban.md -->

## Quick Navigation

- [Docs Hub](../README.md)
- [Architecture](architecture.md)
- [Tech Stack](tech_stack.md)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Defines functional scope, priorities, and acceptance boundaries for the app. |
| Read When | You need feature scope, priorities, or requirement traceability. |
| Skip When | You only need implementation details or runtime procedures. |
| Canonical | Yes |
| Next Docs | [Architecture](architecture.md), [Tech Stack](tech_stack.md) |
| Primary Sources | `docs/README.md`, `docs/project/architecture.md`, `docs/project/tech_stack.md` |

---

## 1. Introduction

### 1.1 Purpose
Specifies what "Diário da Rebecca" does today, and what's planned next, for two parents tracking
their baby's routine.

### 1.2 Scope
PWA for logging and reviewing a baby's daily events (feeding, sleep, diapers, appointments,
illness), viewing trends over time, and syncing that data between two phones. **Out of scope for
now:** multi-child/multi-caregiver accounts, paid tiers, native app store distribution — these are
deferred to a future commercial phase (see Section 6).

### 1.3 Intended Audience
The two parents using the app day-to-day, and any future developer (human or AI agent) extending it.

### 1.4 References
- Roadmap/Epic plan: `~/.claude/plans/meu-objetivo-com-este-memoized-bear.md` (local planning file, not versioned in this repo)
- [Architecture](architecture.md)

---

## 2. Overall Description

### 2.1 Product Perspective
Standalone PWA, installable on Android (Chrome) and iOS (Safari "Add to Home Screen"). No backend
server of its own — data lives in `localStorage` per device and optionally syncs through Firebase
(Firestore + Auth) to a second device. Deployed as static files via GitHub Pages, no build step.

### 2.2 User Classes and Characteristics
- **Parents (the only user class today):** two adults, non-technical, using the app on a phone,
  logging events in the moment or retroactively. Both share one Firebase account so either can log
  for the other.

### 2.3 Operating Environment
- Client: Chrome (Android) and Safari (iOS 16.4+, required for install + notifications), latest
  versions. Installed as a PWA (not used inside a browser tab day-to-day).
- Backend: Firebase Firestore + Auth (Spark/free tier), `southamerica-east1` region.
- Hosting: GitHub Pages serving the repo's static files directly from `main`.

---

## 3. Functional Requirements

### 3.1 Event Logging
- FR-LOG-001 (MUST): User shall log one-tap events: wake, milk (with ml amount), meal (snack/lunch/dinner), diaper (wet/poop), nap start/end, night sleep start, illness.
- FR-LOG-002 (MUST): User shall add an event retroactively with a custom date/time (not just "now").
- FR-LOG-003 (MUST): User shall edit or delete any previously logged event.
- FR-LOG-004 (MUST): A milk event shall prompt for an amount in ml (default preset + custom input).
- FR-LOG-005 (MUST): A diaper event shall record whether it included poop.

### 3.2 Calendar & Day Log
- FR-CAL-001 (MUST): User shall view a monthly calendar with a visual marker on days that have logged events.
- FR-CAL-002 (MUST): User shall open any day to see its full event timeline and a per-day summary (total milk ml, nap time, night sleep time, diaper counts).
- FR-CAL-003 (MUST): User shall add/edit/delete events from within the day log view (not just "today").

### 3.3 Trends
- FR-TRD-001 (MUST): User shall view bar charts over a selectable date range (e.g., 7/14/30 days) for: milk ml/day, feeds/day, nap time/day, nap count/day, night sleep time/day, diaper changes/day, poop/day.
- FR-TRD-002 (MUST): Each chart shall show an average computed only over days that have at least one entry for that metric (an inactive day doesn't drag the average toward zero).

### 3.4 Milk Reminder
- FR-RMD-001 (MUST): App shall show a reminder banner when it's been 3+ hours since the last milk event.
- FR-RMD-002 (MUST): The reminder shall be suppressed while the baby is in a logged night-sleep interval, but NOT suppressed during a nap.
- FR-RMD-003 (SHOULD): User shall be able to turn the reminder on/off in settings.

### 3.5 Agenda
- FR-AGD-001 (MUST): User shall log appointments (medical, class, other) with a date/time and note.
- FR-AGD-002 (MUST): User shall view, edit, and delete upcoming appointments in an agenda list.

### 3.6 Cloud Sync
- FR-SYN-001 (MUST): App shall work fully offline using local storage when Firebase is not configured or the device is offline.
- FR-SYN-002 (SHOULD): User shall sign in with one shared family email/password to sync events between two devices.
- FR-SYN-003 (MUST): Conflicting edits shall resolve by last-write-wins (`updatedAt` timestamp).
- FR-SYN-004 (MUST): Deleting an event shall propagate to the other device (logical deletion, not silently local-only).

### 3.7 Backup
- FR-BAK-001 (SHOULD): User shall export all events to a local `.json` file.
- FR-BAK-002 (SHOULD): User shall import a previously exported `.json` file, merging into existing data.

### 3.8 Planned — Health Module (not yet built)
- FR-HLT-001 (SHOULD): User shall log growth measurements (weight/height/head circumference).
- FR-HLT-002 (COULD): App shall plot growth against WHO percentile curves.
- FR-HLT-003 (SHOULD): User shall track vaccination records against the Brazilian PNI schedule, with reminders.
- FR-HLT-004 (COULD): User shall attach a photo/PDF to a medical appointment (requires Firebase Storage).
- FR-HLT-005 (COULD): User shall log medications with a recurring reminder.

### 3.9 Planned — Richer Logging & Insights (not yet built)
- FR-RCH-001 (COULD): User shall log breastfeeding side (left/right) and duration via a timer.
- FR-RCH-002 (COULD): User shall attach a photo or free-text note to any event.
- FR-RCH-003 (COULD): App shall generate a weekly summary and a PDF report for the pediatrician.

### 3.10 Planned — Closed-app Notifications (not yet built)
- FR-PSH-001 (SHOULD): App shall send a push notification for the milk/medication/appointment reminder even when fully closed (requires Web Push via FCM + a scheduling Cloud Function).

---

## 4. Acceptance Criteria (High-Level)

1. All MUST requirements in Sections 3.1–3.7 are implemented and manually verified by both parents in daily use.
2. Domain logic with non-obvious rules (sleep-interval midnight crossing, reminder suppression, active-day averaging, sync merge) has an automated Vitest test per rule — see `test/domain/`.
3. No feature in Section 3.8–3.10 ships without the parents having actually used and confirmed value in the corresponding MUST/SHOULD features first (build-now-migrate-later principle — see [Architecture §4](architecture.md#4-solution-strategy)).

---

## 5. Constraints

### 5.1 Technical Constraints
- No bundler/build step in the deploy path — GitHub Pages serves the repository's static files from `main` directly (see [Tech Stack](tech_stack.md)).
- Firebase Spark (free) tier only, until a concrete need justifies Blaze (e.g., Cloud Functions for push in FR-PSH-001).
- iOS Web Push requires the PWA to be installed via "Add to Home Screen" (Safari tab notifications don't work).

### 5.2 Regulatory Constraints
- None today (two-person personal use, no PII beyond the baby's name/health data typed in by the parents themselves, no third-party data sharing). Revisit if a commercial/multi-user phase happens (LGPD, medical-disclaimer language) — see Section 6.

---

## 6. Assumptions and Dependencies

### 6.1 Assumptions
1. Both parents have a modern smartphone with a supported browser and a intermittent-but-generally-available internet connection.
2. Usage stays at "one family" scale — Firebase Spark tier's free quota (tens of thousands of reads/writes/day) is far above actual usage.
3. The product stays personal-use-first; a commercial/multi-tenant phase (Epic 6 in the roadmap) is deferred until there's a concrete reason to pursue it.

### 6.2 Dependencies
1. Firebase (Firestore + Auth, project `diario-de-rebecca`) for sync.
2. GitHub Pages for hosting.
3. Browser PWA install support (Chrome/Android, Safari/iOS 16.4+).

---

## 7. Out of Scope (This Phase)

Deferred to a future commercial phase, only if pursued: multi-child support, multi-caregiver
accounts with roles/invites, paywall/subscription, app-store native distribution requirements
(privacy policy, account deletion flow, LGPD consent), i18n, alternate light theme, custom branding.

---

## Maintenance

**Last Updated:** 2026-07-09

**Update Triggers:**
- A new feature is planned or implemented
- An existing MUST/SHOULD requirement's behavior changes
- Scope moves in/out of Section 7 (Out of Scope)

**Verification:**
- [ ] Every implemented feature has a corresponding FR-XXX entry
- [ ] No FR-XXX entry describes behavior that no longer exists in the app
