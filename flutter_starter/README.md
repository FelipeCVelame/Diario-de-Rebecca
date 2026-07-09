# flutter_starter — código-semente do app Flutter

Estes arquivos são o **primeiro código de verdade** do app Flutter (Fase 0). Eles são
**Dart puro** (sem dependências além do SDK), portados do PWA e cobertos por testes.

## Como usar
1. Crie o projeto (ver `../FASE-0-ANDROID-SETUP.md`):
   `flutter create --org com.velame --project-name diario_crianca app`
2. Copie para dentro do projeto:
   - `lib/domain/`  → `app/lib/domain/`
   - `test/domain/` → `app/test/domain/`
3. Rode: `cd app && flutter test`  → todos verdes = lógica validada.

> Os `import 'package:diario_crianca/...'` dependem do nome do projeto ser **diario_crianca**.
> Se usar outro nome, ajuste os imports nos testes.

## O que já está aqui
- `lib/domain/event.dart` — modelo `Event` + `EventType` (com `updatedAt`/`deleted` para sync).
- `lib/domain/summary.dart` — `dayKey`, `buildIntervals` (sono cruzando meia-noite) e
  `summaryForDay` (leite/sonecas/noite/fraldas/refeições).
- `lib/domain/reminder.dart` — `isNightSleeping` e `milkReminderState` (lembrete de 3h).
- `test/domain/*` — cenários idênticos aos validados no PWA.

## Arquitetura-alvo (vamos preencher nas próximas etapas)
```
app/lib/
  domain/        <- regras e modelos puros (já começando aqui)
  data/          <- repositórios + fontes (Firestore, cache local)
  application/   <- providers/controllers (Riverpod)
  presentation/  <- telas e widgets (Material 3)
  core/          <- tema/design tokens, router (go_router), utils
  main.dart
```

## Próximas etapas (depois do `flutter test` verde)
1. Design system (tema M3, cor semente #7c6cf0) + navegação (go_router + Riverpod).
2. Firebase (flutterfire configure no projeto dev `diario-de-rebecca`).
3. Repositório de eventos (Firestore + offline) reusando a lógica de `domain/`.
4. Tela **Hoje/Registrar** (grade de 1 toque) e log do dia.
