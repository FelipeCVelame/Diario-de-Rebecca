# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Diário da Rebecca" — a local-first PWA for tracking a baby's routine (wake, milk ml, meals,
diapers, naps, night sleep, illness, appointments), with calendar/day-log views, trend charts,
a 3h milk reminder, and optional Firebase cloud sync between two phones (shared family account).
It is a **live app already in use** (deployed via GitHub Pages), not a greenfield project — treat
`main` as production and avoid breaking the deployed behavior.

## Deploy model: no build step

The deployed app is **plain ES modules served as-is** — GitHub Pages serves `index.html`,
`app.js`, `styles.css`, `sw.js`, etc. directly, unbundled. `index.html` loads `app.js` via
`<script type="module" src="app.js">`, and `app.js` imports pure logic from `src/domain/*.js`
via native ESM `import`. **There is no Vite/webpack/bundler in the production path.**

Node/Vite/Vitest exist only as **dev-time tooling** for running the test suite — `npm install`
and `npm test` never need to produce a build artifact, and nothing in `src/domain` or `app.js`
should assume a bundler (no JSX, no non-standard syntax, no bare-specifier imports).

`build.ps1` is a separate, legacy concern: it inlines `index.html` + `styles.css` + `app.js` into
a single offline-testing file `DiarioDoBebe.html`, and copies the flat files into `dist/`. Because
`app.js` now has `import` statements, naively inlining it into a single `<script>` block (as
`build.ps1` currently does) **will not work** — this is a known gap, not yet resolved. Don't
assume `DiarioDoBebe.html`/`dist/` are currently valid outputs of `build.ps1` until this is fixed.

## Commands

```
npm install        # installs Vitest (only dev dependency)
npm test           # vitest run — runs the domain test suite once
npm run test:watch # vitest in watch mode
```

Run a single test file: `npx vitest run test/domain/reminder.test.js`

There is no lint/typecheck script configured yet. There is no local dev server task defined in
`package.json`; `serve.ps1` (a minimal `HttpListener`-based static server) or any static file
server can be used to preview `index.html` locally — opening it via `file://` breaks PWA
install/notifications and should be avoided for anything beyond quick inspection.

`vitest.config.js` restricts test discovery to `test/**/*.test.js` — this is required because the
repo also vendors several unrelated skill/tooling packages (`agent-skills/`, `web-quality-skills/`,
etc., all gitignored) that ship their own `.test.mjs` files Vitest would otherwise pick up.

## Architecture

### Domain/UI split (migration-aware)

The codebase is mid-refactor, moving pure business logic out of the `app.js` monolith and into
`src/domain/*.js` — plain, DOM-free, framework-agnostic modules, each covered by tests in
`test/domain/*.test.js`:

- `src/domain/time.js` — `dayKey(d)`, `fmtDuration(ms)`
- `src/domain/summary.js` — `buildIntervals(events, startType, endType)`, `summaryForDay(babyEvents, date)`
- `src/domain/reminder.js` — `milkReminderState(babyEvents, now, thresholdMs)`, `isNightSleeping` (3h milk reminder logic; a night-sleep event suppresses the reminder, a nap does not)
- `src/domain/trends.js` — `seriesForRange(babyEvents, days, today)`, `activeAvg(series, valFn)` (averages only over days that have a non-zero entry)
- `src/domain/sync.js` — `mergeRemote(list, remote)`, pure last-write-wins + tombstone (`deleted: true`) merge, non-mutating
- `src/domain/eventTypes.js` — `FOOD_TYPES`, `APPT_TYPES`, `isFoodSolid`, `isAppt`

The rest — DOM rendering, event wiring, modals, calendar/agenda/trends views, the Firebase `Cloud`
object, `STORE` (localStorage-backed event store) — stays in `app.js`. The intent of this split is
that a future rewrite (React or otherwise) only needs to replace the UI layer; the domain modules
are meant to be portable as-is (there is also a `flutter_starter/` folder with a Dart port of the
same domain rules, from an earlier evaluation of a Flutter rewrite).

**Known inconsistency:** `app.js` currently still has its *own* local `seriesForRange(days)` (in
the Tendências/trends section) that predates and shadows the imported one from
`src/domain/trends.js`, with the old 1-argument signature. When touching trends or averaging
logic, check whether you're editing the live local definition or the imported (but currently
shadowed) `src/domain/trends.js` one, and reconcile them rather than adding a third variant.

### `app.js` layout (single file, organized by comment-delimited sections)

Top to bottom: domain imports → `ICONS` (inline SVG "duotone" icon set, hydrated via
`data-icon` attributes) → `EVENT_TYPES` / `FOOD_TYPES` / `APPT_TYPES` / `KIND_META` /
`BUTTON_LAYOUT` (event taxonomy and the register-screen button grid) → `STORE` (localStorage CRUD
+ `mergeRemote`) → `SETTINGS` → milk reminder wiring (`refreshReminder`, uses
`src/domain/reminder.js`) → small utils → view renderers (register buttons/today-summary, milk
modal, food modal, event editor modal, calendar, day-log modal, agenda, trends/charts, menu &
backup, toast) → `Cloud` (Firebase sync) → `init()` bootstrap at the bottom.

Event data model: every event is `{ id, type, ts (ISO), updatedAt, ...type-specific fields,
deleted? }`. Sleep-related pairs (`nap_start`/`nap_end`, `night_start`/implicit wake) are turned
into intervals by `buildIntervals`, which attributes a sleep interval crossing midnight to its
*start* day.

### Sync model

Firebase Firestore + Auth, one **shared family account** (single email/password used on both
phones) rather than per-user accounts. Data path: `accounts/{uid}/events/{id}`. Firestore security
rules only allow a user to read/write their own `accounts/{uid}` subtree (see
`FIREBASE-SETUP.md` for the exact rules). Conflict resolution is last-write-wins by `updatedAt`;
deletions are logical (`deleted: true` tombstones) so they propagate through sync instead of just
disappearing locally. `firebase-config.js` holds the actual project config (`window.FIREBASE_CONFIG`)
and is intentionally committed — the Firebase web API key is not a secret by design (security is
enforced by Firestore rules, not by hiding the key).

### Service worker

`sw.js` uses a network-first fetch strategy (tries network, falls back to cache), cache name
`baby-diary-v3` (bump this string to force clients to drop old caches on next visit — this is the
main lever for "the phone didn't update" issues, since there is currently no in-app "new version
available" prompt). It also has working `push` and `notificationclick` handlers, ready for Web
Push, though the sending side (VAPID/Cloud Function) is not implemented yet.

## Repo layout notes

- `flutter_starter/` — an earlier, currently-dormant evaluation of porting the domain logic to
  Dart/Flutter; not part of the active PWA build.
- `agent-skills/`, `web-quality-skills/`, `bencium-claude-code-design-skill/`,
  `claude-code-skills/`, `planning-with-files/` — vendored Claude Code skill packages, gitignored,
  not part of the app.
- `_backup_pre_git_sync/`, `dist/`, `dist.rar`, `DiarioDoBebe.html` — regenerable/legacy build
  output, gitignored.
