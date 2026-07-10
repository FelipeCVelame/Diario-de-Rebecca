# memory.md — Progresso dos Epics

> Checar este arquivo (junto com `CLAUDE.md`) antes de continuar trabalho neste projeto.
> Atualizar aqui sempre que um item de Epic for concluído/postergado/decidido.

**Roadmap completo (Objective/Stories/DoD de cada Epic):** `~/.claude/plans/meu-objetivo-com-este-memoized-bear.md` (local, não versionado). Status vivo do board: `docs/tasks/kanban.md`.

## Epic 0 — Fundação de engenharia — quase completo
- [x] `src/domain/` extraído (time, summary, reminder, trends, sync) + 24 testes Vitest
- [x] `app.js` usa ESM nativo (import), sem bundler em produção
- [x] ESLint + Prettier + Husky/lint-staged
- [x] GitHub Actions (quality gate: lint+format+test, sem build/deploy)
- [x] Docs base: `docs/README.md`, `docs/project/{requirements,architecture,tech_stack,design_guidelines}.md`, `docs/architecture/patterns_catalog.md`, `docs/tasks/{kanban,workflow}.md`
- [ ] **Pendente, adiado**: split completo de `app.js` em `src/data/` (STORE+Cloud) e `src/ui/` — só `src/domain/` foi extraído até agora. Decidir com o usuário antes de iniciar (refactor grande num app em uso real).

## Epic 1 — Confiabilidade para uso diário — fechado (para efeitos práticos)
- [x] Indicador de conexão/sync visível no header (offline/sincronizando/sincronizado/erro) + retry manual e automático
- [x] Prompt de "nova versão" — descartado por decisão do usuário (PWA já atualiza sozinho)
- [x] Ícones PNG reais (180/192/512) para instalação no iOS/Android
- [ ] **Postergado por decisão do usuário**: endurecer sync no Firebase Emulator — bloqueado porque `firebase-tools` exige Java 21+ e a máquina só tem Java 8. Retomar só se/quando instalar um JDK 21 portátil.

## Epic 2 — Módulo Saúde — iniciado
- [x] Anexos em consultas/exames (foto/PDF, Firebase Storage) — 1 anexo por compromisso
  (`appt_medical`/`appt_class`/`appt_other`), exige conexão para subir o arquivo (o resto do
  compromisso continua salvando offline), exclusão em cascata best-effort no Storage ao apagar o
  compromisso, limite 5MB, regras de Storage documentadas em `FIREBASE-SETUP.md` (passo 5b).
- [ ] Crescimento (peso/altura + percentil OMS)
- [ ] Vacinas (calendário PNI + lembretes)
- [ ] Medicamentos com lembrete recorrente

## Epic 3 — Registro mais rico & insights — não iniciado
## Epic 4 — Notificações Web Push (app fechado) — não iniciado
## Epic 5 — Qualidade/performance/a11y contínuo — não iniciado
## Epic 6 — Preparação comercial + gatilho de migração — não iniciado (só entra em jogo se fizer sentido comercialmente)

## Decisões/preferências do usuário a lembrar
- Deploy: **ESM nativo, sem build** — GitHub Pages serve `main` direto, sem bundler. Vite/Vitest só dev/test.
- Processo: workflow `ln-*` completo mas right-sized (sem burocracia excessiva, projeto de 2 pessoas).
- Stack: continuar no PWA atual; migração (provável React) só com gatilho concreto (ver plano).
- Sempre commitar+pushar para `epic-0-foundation` no fim de blocos de trabalho, para continuar em outra máquina.
