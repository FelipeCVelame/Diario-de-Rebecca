# Patterns Catalog

Architectural patterns used in Diário da Rebecca.

> **SCOPE:** Pattern inventory. No formal ln-640 audit has run yet — entries below are a manual
> inventory taken during Epic 0 (engineering foundation), not scored against the 4-axis model.
<!-- DOC_KIND: reference -->
<!-- DOC_ROLE: canonical -->
<!-- READ_WHEN: Read when you need the current inventory of architectural patterns in this codebase. -->
<!-- SKIP_WHEN: Skip when you only need one specific ADR or implementation guide. -->
<!-- PRIMARY_SOURCES: docs/project/architecture.md, app.js, src/domain/ -->

## Quick Navigation

- [Architecture](../project/architecture.md)
- [Tech Stack](../project/tech_stack.md)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Tracks the recurring architectural patterns actually used in this small codebase. |
| Read When | You need to know what pattern governs a piece of code before changing it. |
| Skip When | You already know the exact file to inspect. |
| Canonical | Yes |
| Next Docs | [Architecture](../project/architecture.md) |
| Primary Sources | `docs/project/architecture.md`, `app.js`, `src/domain/` |

---

## Pattern Inventory

| # | Pattern | Where | Notes |
|---|---------|-------|-------|
| 1 | Domain/UI separation (ports-and-adapters, lightweight) | `src/domain/*.js` (pure) vs. `app.js` (DOM/UI) | Not a formal hexagonal architecture — just a hard rule that `src/domain/` never touches the DOM or Firebase, kept in place so a future UI rewrite doesn't need to re-derive business rules. See [Architecture §4.2](../project/architecture.md#42-top-level-decomposition). |
| 2 | Local-first / offline-first | `STORE` (localStorage) as source of truth; Firebase sync is additive | The app is fully usable with zero network; sync is a enhancement, not a requirement. |
| 3 | Last-write-wins conflict resolution with tombstones | `src/domain/sync.js` (`mergeRemote`) | Deletions are logical (`deleted: true`), not physical, so they propagate through sync instead of silently reappearing on the other device. |
| 4 | Repository-like data access (informal) | `STORE` object in `app.js` | Single object owns all `localStorage` CRUD; not a generic/pluggable repository interface — there's exactly one local store and one remote (`Cloud`), so an abstraction layer wasn't worth the indirection. |
| 5 | Observer via platform APIs | Firestore `onSnapshot` listeners (`Cloud`), Service Worker `push`/`fetch` events (`sw.js`) | Uses the platform's own pub/sub primitives rather than a custom event bus. |

---

## Excluded Patterns

| Pattern | Why not used |
|---------|----------------|
| Generic Repository/ORM abstraction | Only one local store and one remote store exist; an abstraction layer would add indirection without a second implementation to justify it (YAGNI) |
| State-management library (Redux/Zustand/etc.) | No component framework yet; DOM re-render is triggered directly by `afterMutation()` after each mutation |
| Message queue / job processing | No background jobs exist; all work is either synchronous UI logic or a direct Firestore call |

---

## Pattern Recommendations

| Condition Found | Recommended Pattern | Rationale |
|-----------------|---------------------|-----------|
| A future UI framework migration (React) | Adapter layer wrapping `src/domain/` calls | Keeps the domain modules' pure function signatures stable while the UI layer is rewritten |
| Web Push implementation (planned, FR-PSH-001) | Scheduled Cloud Function + FCM | Requires moving reminder scheduling logic (currently purely client-side) partly server-side |

---

## Maintenance

**Last Updated:** 2026-07-09

**Update Triggers:**
- A new recurring pattern is introduced (e.g., a state-management library if the UI grows)
- `src/domain/` gains or loses a module
- A formal ln-640 pattern audit runs and supersedes this manual inventory

**Verification:**
- [ ] Every pattern row still matches the current code
- [ ] No pattern is listed that has since been removed/refactored away

**Next Audit:** Not scheduled — run `ln-640-pattern-evolution-auditor` if/when the codebase grows enough to warrant scored tracking.
