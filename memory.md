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
- [x] Anexos em consultas/exames (`appt_medical`/`appt_class`/`appt_other`) — só foto (sem PDF),
  comprimida no navegador (canvas) e guardada como base64 dentro do próprio documento do evento no
  Firestore; funciona 100% offline, sem serviço externo. Firebase Storage foi tentado primeiro mas
  descartado: desde out/2024 exige o plano Blaze (cartão cadastrado) mesmo dentro da franquia
  grátis, e o usuário optou por não ativar. Ver spec para o histórico completo da mudança de
  arquitetura.
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
