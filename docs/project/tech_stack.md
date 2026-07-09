# Technology Stack: Diário da Rebecca

**Document Version:** 1.0
**Date:** 2026-07-09
**Status:** Living document

<!-- DOC_KIND: reference -->
<!-- DOC_ROLE: canonical -->
<!-- READ_WHEN: Read when you need exact technologies, versions, tooling, or external service choices. -->
<!-- SKIP_WHEN: Skip when you only need business scope or runtime procedures. -->
<!-- PRIMARY_SOURCES: package.json, docs/reference/adrs/ -->

<!-- SCOPE: Technology stack (specific versions, libraries), development tools, naming conventions ONLY. -->
<!-- DO NOT add here: Architecture patterns → architecture.md, Requirements → requirements.md -->

## Quick Navigation

- [Docs Hub](../README.md)
- [Requirements](requirements.md)
- [Architecture](architecture.md)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Lists the actual stack, versions, tooling, and rationale for selected technologies. |
| Read When | You need exact framework, library, runtime, or tool choices. |
| Skip When | You only need workflow instructions or feature scope. |
| Canonical | Yes |
| Next Docs | [Architecture](architecture.md) |
| Primary Sources | `package.json`, `docs/reference/adrs/` |

---

## 1. Introduction

### 1.1 Purpose
Specifies the exact technologies used to build and ship "Diário da Rebecca".

### 1.2 Scope
**In scope:** the deployed PWA stack, the Firebase backend, and the dev-time tooling (test/lint).
**Out of scope:** infrastructure provisioning (there is none — GitHub Pages and Firebase Spark are
both managed/free-tier services with no servers to provision).

---

## 2. Technology Stack

### 2.1 Stack Overview

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **UI** | Vanilla HTML/CSS/JS, native ES Modules | N/A (browser-native) | No framework needed at current feature scope; zero migration debt from an unused framework |
| **Domain logic** | Plain ES modules (`src/domain/`) | ES2023 | Framework-agnostic, portable to a future rewrite |
| **Backend / sync** | Firebase Firestore + Auth | SDK 10.12.0 (compat, loaded via CDN `<script>`) | Free tier covers family-scale usage; managed offline persistence and realtime sync |
| **Hosting** | GitHub Pages | N/A | Free, serves the repo's static files directly from `main`, no build/deploy pipeline |
| **Testing** | Vitest | ^2.1.8 | Fast ESM-native test runner for `src/domain/` |
| **Dev tooling (not shipped)** | Vite (via Vitest) | transitive | Only used as Vitest's engine, never as a production bundler |
| **Linting/formatting** | ESLint (flat config) + Prettier | ESLint ^9.39, Prettier ^3.9 | Consistent style, catches undefined-global/unused-var bugs |
| **Git hooks** | Husky + lint-staged | Husky ^9.1, lint-staged ^16.4 | Auto-fix + test on every commit |
| **CI** | GitHub Actions | N/A | Quality gate (lint + format + test) on push/PR to `main`; does not build or deploy anything |

### 2.2 Key Libraries & Dependencies

**Runtime (loaded in the browser, not npm packages):**
- Firebase compat SDKs (`firebase-app-compat.js`, `firebase-auth-compat.js`, `firebase-firestore-compat.js`) — loaded via `<script>` tags from `gstatic.com`, pinned to `10.12.0`.

**Dev dependencies (`package.json`):**
- `vitest` — test runner for `src/domain/`.
- `eslint`, `@eslint/js`, `eslint-config-prettier`, `globals` — linting.
- `prettier` — formatting.
- `husky`, `lint-staged` — pre-commit automation.

None of the above ship to production — the deployed app has zero npm dependencies at runtime.

---

## 3. Development Tools

### 3.1 Required Tools

| Tool | Version | Purpose | Installation |
|------|---------|---------|---------------|
| Node.js | 22.x (LTS) | Runs the dev/test tooling only | https://nodejs.org/ |
| Git | any recent | Version control | https://git-scm.com/ |

### 3.2 Linters & Code Quality Tools

| Tool | Purpose | Command | Config File |
|------|---------|---------|--------------|
| ESLint | JS linting (flat config, no TypeScript) | `npm run lint` | `eslint.config.js` |
| Prettier | Code formatting (JS/CSS/HTML/JSON — markdown excluded) | `npm run format:check` | `.prettierrc.json`, `.prettierignore` |
| Vitest | Domain unit tests | `npm test` | `vitest.config.js` |

**CI/CD Integration:**
- Pre-commit hook (Husky + lint-staged): `eslint --fix` + `prettier --write` on staged files, then `npm test`.
- GitHub Actions (`.github/workflows/ci.yml`): `npm ci && npm run lint && npm run format:check && npm test` on push/PR to `main`. Quality gate only — no build/deploy step.

**Run All Quality Checks:**
```bash
npm run lint:all
```

---

## 4. Naming Conventions

### 4.1 File Naming
- Domain modules: `camelCase.js` under `src/domain/` (e.g., `reminder.js`, `summary.js`).
- Tests: mirror the source path under `test/`, suffixed `.test.js` (e.g., `test/domain/reminder.test.js`).

### 4.2 Variable Naming
`camelCase` for variables/functions, `UPPER_SNAKE_CASE` for module-level constants (e.g.,
`EVENT_TYPES`, `MILK_REMINDER_MS`).

---

## Maintenance

**Last Updated:** 2026-07-09

**Update Triggers:**
- A dependency is added, removed, or has a major version upgrade
- A new dev tool is introduced (linter, test framework, CI step)
- The deploy model changes (e.g., a bundler is introduced)

**Verification:**
- [ ] Versions here match `package.json`
- [ ] `npm run lint:all` passes
