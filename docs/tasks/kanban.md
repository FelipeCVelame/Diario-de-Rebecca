# Kanban

<!-- DOC_KIND: how-to -->
<!-- DOC_ROLE: working -->
<!-- READ_WHEN: Read when you need the current state of each Epic. -->
<!-- SKIP_WHEN: Skip when you only need workflow policy — see workflow.md instead. -->
<!-- PRIMARY_SOURCES: docs/tasks/workflow.md, ~/.claude/plans/meu-objetivo-com-este-memoized-bear.md -->

<!-- SCOPE: Current Epic-level board state ONLY. Full Epic definitions (Objective/Stories/DoD) live in the roadmap plan file, linked below — this file tracks status, not content. -->
<!-- DO NOT add here: workflow rules → workflow.md, feature scope → ../project/requirements.md -->

> **Roadmap source:** `~/.claude/plans/meu-objetivo-com-este-memoized-bear.md` (local planning file,
> not versioned in this repo — holds each Epic's full Objective/Stories/DoD). This board tracks
> status only.

## Quick Navigation

- [Docs Hub](../README.md)
- [Workflow](workflow.md)
- [Architecture](../project/architecture.md)

## Agent Entry

| Signal | Value |
|--------|-------|
| Purpose | Shows which Epic is active and what's checked off inside it. |
| Read When | You need to know current project status before picking up work. |
| Skip When | You only need lifecycle policy — see [workflow.md](workflow.md). |
| Canonical | No, this is a working document |
| Next Docs | [Workflow](workflow.md) |
| Primary Sources | `docs/tasks/workflow.md`, roadmap plan file |

---

## In Progress

### Epic 0 — Fundação de engenharia (migration-aware)
- [x] Extrair `src/domain/` (time, summary, reminder, trends, sync) com testes Vitest (24 testes)
- [x] `app.js` importa os módulos de domínio via ESM nativo (sem bundler)
- [x] ESLint (flat config) + Prettier configurados e aplicados ao código existente
- [x] Husky + lint-staged (roda lint/format nos arquivos staged + `npm test` a cada commit)
- [x] Secret scan manual (nenhum segredo real encontrado — ver [tech_stack.md](../project/tech_stack.md))
- [x] GitHub Actions como quality gate (lint + format + test em push/PR para `main`)
- [x] Docs base: requirements, architecture, tech_stack, design_guidelines, patterns_catalog, kanban, workflow
- [ ] Split completo de `app.js` em `src/data/` (STORE + Cloud) e `src/ui/` (views/modais) — hoje só `src/domain/` foi extraído; `STORE`, `Cloud` e toda a renderização ainda vivem em `app.js`. Adiado: é uma refatoração maior, arriscada num app em uso real, e não foi pedida explicitamente ainda — decidir com o usuário antes de iniciar.

### Epic 1 — Confiabilidade para uso diário
- [x] Estados de conexão/erro visíveis (pill no header: offline/sincronizando/sincronizado/erro), retry manual (toque no pill) e automático (ao reconectar)
- [ ] Prompt de "nova versão disponível" — descartado: o usuário confirmou que o PWA já atualiza automaticamente no celular, não precisa
- [ ] Endurecer sync no Firebase Emulator (cross-account negado, LWW, tombstone)
- [x] Ícones PNG reais (180/192/512, gerados do `icon.svg` com `sharp` — usado uma vez e removido do `package.json`) para instalação melhor no iOS/Android; `sw.js` cache bump p/ v4

## Backlog

### Epic 2 — Módulo Saúde
_(ainda não iniciado)_

### Epic 3 — Registro mais rico & insights
_(ainda não iniciado)_

### Epic 4 — Notificações de verdade (Web Push, app fechado)
_(ainda não iniciado)_

### Epic 5 — Qualidade, performance & acessibilidade (contínuo)
_(ainda não iniciado)_

### Epic 6 — Preparação comercial + gatilho de migração
_(ainda não iniciado — só entra em jogo se/quando fizer sentido comercialmente)_

## Done

_(nenhum Epic completo ainda — Epic 0 está quase lá, ver acima)_

---

## Maintenance

**Update Triggers:**
- A checklist item is completed
- An Epic moves between Backlog/In Progress/Done
- The roadmap plan file's Epic list changes

**Verification:**
- [ ] Every Epic here matches the roadmap plan file
- [ ] No Epic is in Done with unchecked items

**Last Updated:** 2026-07-09
