# Anexos em Consultas/Exames (Epic 2, Story 1)

> Epic 2 — Módulo Saúde. Frente escolhida pelo usuário para começar: consultas/exames com anexo.
> Ver `memory.md` e `~/.claude/plans/meu-objetivo-com-este-memoized-bear.md` para o roadmap completo.

## Objetivo

Permitir anexar 1 arquivo (foto ou PDF, até 5MB) a qualquer compromisso da Agenda (`appt_medical`,
`appt_class`, `appt_other`), guardado no Firebase Storage, com exclusão em cascata quando o
compromisso é apagado.

## Modelo de dados

Evento de compromisso ganha um campo opcional `attachment`:

```js
{
  // ...campos existentes do evento appt (id, type, ts, title, note?, updatedAt, deleted?)
  attachment: {
    path: "accounts/{uid}/attachments/{eventId}/{filename}",
    url: "<download URL do Storage>",
    name: "laudo.pdf",
    type: "application/pdf" | "image/jpeg" | "image/png" | ...,
    size: 123456, // bytes
  },
}
```

Sem anexo, o campo `attachment` fica **ausente** (não `null`), seguindo o padrão já usado por
`note`/`title` (campos opcionais omitidos, não nulos). O binário do arquivo nunca é guardado em
localStorage ou Firestore — só esta referência ao objeto no Storage.

## Storage & regras de segurança

Novo bucket Firebase Storage no mesmo projeto (plano Spark/grátis, não exige billing/Blaze).
Caminho espelha o padrão já usado no Firestore (`accounts/{uid}/events/...`):

```
accounts/{uid}/attachments/{eventId}/{fileName}
```

Regras de segurança (Storage Rules), a publicar manualmente pelo usuário no console, documentadas
como novo passo 8 em `FIREBASE-SETUP.md`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /accounts/{uid}/attachments/{eventId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == uid
                          && request.resource.size < 5 * 1024 * 1024
                          && request.resource.contentType.matches('image/.*|application/pdf');
    }
  }
}
```

`firebase-config.js` precisa ter `storageBucket` preenchido (já é gerado pelo Firebase Console
junto com o resto da config; se o usuário criou o projeto antes de existir esse campo, precisa
conferir/copiar de novo).

## UI/UX

**Editor de compromisso (`#appt-modal`):**
- Novo campo `<input type="file" accept="image/*,application/pdf">` abaixo do campo de nota.
- Se o compromisso já tem `attachment`, mostra uma thumbnail (imagem) ou ícone+nome (PDF) com botão
  "Remover".
- Ao salvar com um arquivo novo selecionado:
  - Se offline: bloqueia só o upload com toast "Anexar exige conexão com a internet." — o resto do
    compromisso (título, hora, nota) salva normalmente offline, como hoje.
  - Se online: sobe o arquivo para o Storage, grava a referência `attachment` no evento junto com
    o resto dos campos, via `STORE.put` (mesmo fluxo de sempre).
- Validação client-side antes do upload: tamanho ≤ 5MB e tipo em `image/*` ou `application/pdf`
  (mesmas regras do Storage, para dar feedback imediato sem round-trip).

**Card da Agenda (`renderAgenda`):**
- Se o compromisso tem `attachment` e é imagem, mostra uma thumbnail pequena no card, ao lado do
  ícone de categoria existente.
- Se é PDF, mostra um ícone de documento no mesmo lugar.
- Tocar no card continua abrindo o editor (comportamento atual). Tocar na thumbnail/ícone do anexo
  abre o arquivo original (`attachment.url`) em nova aba.

## Exclusão em cascata

Ao excluir um compromisso com anexo (`STORE.remove`):
1. Tombstone lógico do evento (`deleted: true`), como já acontece hoje — síncrono, local-first.
2. Dispara `Cloud.deleteAttachment(path)` **best-effort**: se falhar (offline, permissão, etc.),
   só loga no console — não bloqueia nem reverte a exclusão do evento, que já aconteceu localmente.
   Não há retry/fila para esse delete nesta Story (fora de escopo — ver abaixo).

## Fora de escopo desta Story (YAGNI por agora)

- Fila/retry de upload offline (upload exige estar online, ver acima).
- Múltiplos anexos por compromisso (só 1 por evento).
- Anexos em outros tipos de evento fora da Agenda (leite, sono, fraldas, etc.).
- Retry automático de `deleteAttachment` que falhou.

## Testes (domínio, `test/domain/`)

A lógica de anexo é majoritariamente I/O (upload/delete no Storage) e UI (input file, thumbnail),
não puramente funcional — pouco a extrair para `src/domain/`. O que é testável sem DOM/rede:
- Validação client-side (tamanho ≤ 5MB, tipo em `image/*`/`application/pdf`) como função pura em
  `src/domain/eventTypes.js` ou novo `src/domain/attachments.js` (ex.: `isValidAttachment(file)`),
  com casos: arquivo válido (imagem pequena), arquivo grande demais, tipo não permitido.

## Verificação manual

- Anexar foto a uma consulta nova, online: aparece thumbnail no card da Agenda, abre em nova aba.
- Anexar PDF a um "outro compromisso": aparece ícone de documento, abre em nova aba.
- Tentar anexar offline: toast de erro, compromisso salva sem anexo.
- Tentar anexar arquivo > 5MB ou tipo não permitido: erro client-side antes do upload.
- Excluir compromisso com anexo: some da lista e o arquivo correspondente some do Storage (conferir
  no console Firebase).
- Regras do Storage: tentar acessar `accounts/{outro-uid}/attachments/...` autenticado como outro
  usuário deve ser negado (mesma checagem manual que já foi feita para as regras do Firestore).
