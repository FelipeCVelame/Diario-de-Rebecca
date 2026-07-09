# Docs Hub — Diário da Rebecca

<!-- DOC_KIND: index -->
<!-- DOC_ROLE: navigation -->
<!-- READ_WHEN: Read first when you need to find which project doc covers a topic. -->
<!-- SKIP_WHEN: Skip when you already know the exact doc you need. -->
<!-- PRIMARY_SOURCES: docs/project/, docs/architecture/, docs/tasks/, ../CLAUDE.md -->

<!-- SCOPE: Navigation index for project documentation ONLY — links out, does not duplicate content. -->
<!-- DO NOT add here: any actual requirements/architecture/task content — those live in the linked docs. -->

## Quick Navigation

- [Requirements](project/requirements.md)
- [Architecture](project/architecture.md)
- [Tech Stack](project/tech_stack.md)
- [Design Guidelines](project/design_guidelines.md)
- [Patterns Catalog](architecture/patterns_catalog.md)
- [Kanban](tasks/kanban.md)
- [Workflow Rules](tasks/workflow.md)
- [CLAUDE.md](../CLAUDE.md) (guidance for AI agents working in this repo)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Entry point into this project's documentation set. |
| Read When | You need to find which doc covers a topic before reading it. |
| Skip When | You already know the exact doc you need. |
| Canonical | No (navigation only) |
| Next Docs | [Requirements](project/requirements.md), [Architecture](project/architecture.md), [Tech Stack](project/tech_stack.md) |
| Primary Sources | `docs/project/`, `docs/architecture/`, `docs/tasks/`, `../CLAUDE.md` |

---

## What this project is

"Diário da Rebecca" is a local-first PWA for tracking a baby's daily routine, in real use by two
parents on two phones, with optional Firebase sync between them. See [Requirements](project/requirements.md)
for scope and [Architecture](project/architecture.md) for how it's built.

## Where things live

| Topic | Doc |
|-------|-----|
| Product scope, features, priorities | [requirements.md](project/requirements.md) |
| System structure, sync model, service worker | [architecture.md](project/architecture.md) |
| Exact stack, versions, tooling | [tech_stack.md](project/tech_stack.md) |
| Color tokens, typography, accessibility rules | [design_guidelines.md](project/design_guidelines.md) |
| Recurring code patterns and their health | [patterns_catalog.md](architecture/patterns_catalog.md) |
| Current work board | [kanban.md](tasks/kanban.md) |
| How Epics/Stories/Tasks flow | [workflow.md](tasks/workflow.md) |
| Day-to-day command reference, code layout for AI agents | [../CLAUDE.md](../CLAUDE.md) |

## Maintenance

**Last Updated:** 2026-07-09

**Update Triggers:**
- A new doc is added to `docs/project/`, `docs/architecture/`, or `docs/tasks/`
- A doc is renamed or removed

**Verification:**
- [ ] Every doc under `docs/` is linked from here
- [ ] All links resolve
