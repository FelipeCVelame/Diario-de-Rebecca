# Task Workflow

<!-- DOC_KIND: index -->
<!-- DOC_ROLE: canonical -->
<!-- READ_WHEN: Read when you need the task lifecycle, Epic granularity, or how the board is maintained. -->
<!-- SKIP_WHEN: Skip when you only need the current board — see kanban.md instead. -->
<!-- PRIMARY_SOURCES: docs/tasks/kanban.md, docs/project/requirements.md -->

<!-- SCOPE: Task tracking workflow and rules ONLY. Contains lifecycle states, Epic granularity, and update rules. -->
<!-- DO NOT add here: current board state → kanban.md, feature scope → requirements.md -->

## Quick Navigation

- [Docs Hub](../README.md)
- [Kanban](kanban.md)
- [Requirements](../project/requirements.md)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Defines how work is tracked for this project — no external tracker, plain markdown. |
| Read When | You need to know how to move an item across the board or add a new Epic. |
| Skip When | You only need the current board — see [kanban.md](kanban.md). |
| Canonical | Yes |
| Next Docs | [Kanban](kanban.md) |
| Primary Sources | `docs/tasks/kanban.md`, `docs/project/requirements.md` |

---

## Provider

**No external tracker** (no Linear/Jira/GitHub Projects) — this is a two-person personal project.
The board lives entirely in [kanban.md](kanban.md) as plain markdown, hand-edited alongside the code.

## Granularity

Given the project's scale, work is tracked at **Epic** granularity (matching the roadmap), each
with a checklist of concrete items — not a full Epic → Story → Task hierarchy. An Epic's checklist
item is done when it's shipped and (if it's code) covered by a passing test or manually verified in
the browser preview.

## Lifecycle

```
Backlog → In Progress → Done
```

- **Backlog** — planned, not started.
- **In Progress** — actively being worked on (checklist items get checked off as they land).
- **Done** — all checklist items for the Epic are checked; the Epic's "Pronto (DoD)" condition (from the roadmap) is met.

There is no formal review/rework state — for a two-person project, review happens by using the
feature yourself before checking it off.

## Updating the Board

- Check off an item in [kanban.md](kanban.md) when it's committed and verified (tests passing
  and/or manually confirmed in the browser preview — see `../../CLAUDE.md` for the verification
  workflow).
- Move an Epic from Backlog to In Progress when its first checklist item starts.
- Move an Epic to Done when every checklist item is checked and its DoD condition holds.
- Add a new Epic only when the roadmap changes — the source of truth for the full Epic list and
  each Epic's Objective/Stories/DoD is the plan file referenced in [kanban.md](kanban.md).

## Maintenance

**Update Triggers:**
- A new Epic is added to the roadmap
- An Epic's checklist items change
- The workflow granularity changes (e.g., if the project grows enough to warrant a formal Story/Task split)

**Verification:**
- [ ] Every Epic in `kanban.md` matches the roadmap's Epic list
- [ ] No Epic is marked Done with unchecked items

**Last Updated:** 2026-07-09
