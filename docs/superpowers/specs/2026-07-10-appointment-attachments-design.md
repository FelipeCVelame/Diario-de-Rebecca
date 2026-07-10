# Anexos em Consultas/Exames (Epic 2, Story 1)

> Epic 2 — Módulo Saúde. Frente escolhida pelo usuário para começar: consultas/exames com anexo.
> Ver `memory.md` e `~/.claude/plans/meu-objetivo-com-este-memoized-bear.md` para o roadmap completo.

## Revisão (2026-07-10, pós-implementação): pivô para base64 no Firestore

A primeira versão desta Story foi implementada e revisada inteiramente com **Firebase Storage**
(seções abaixo, mantidas como histórico). Ao tentar habilitar o Storage no console, descobriu-se
que, desde outubro de 2024, o Google **exige o plano Blaze** (pay-as-you-go, cartão cadastrado)
para qualquer bucket novo — o Spark (grátis) não cobre mais Storage, ao contrário do
Firestore/Auth. Essa era uma suposição errada da versão original desta spec ("plano Spark/grátis,
não exige billing"). O usuário decidiu **não** ativar o Blaze e seguir sem serviço de arquivos
separado.

**Nova arquitetura (substitui a seção "Storage & regras de segurança" abaixo):** o anexo é
comprimido no navegador (canvas, redimensiona + reduz qualidade JPEG) e guardado como **base64
embutido no próprio documento do evento no Firestore** — mesmo mecanismo que já sincroniza título/
nota/hora, sem serviço novo, sem risco de cobrança. Isso implica duas mudanças de escopo:

- **Só foto, sem PDF.** Um PDF não comprime da mesma forma e não caberia com segurança no limite
  de 1MiB por documento do Firestore — suporte a PDF fica para uma fase futura (ex.: se um dia
  ativarem o Blaze, ou outro serviço).
- **Upload deixa de existir** (não há mais round-trip de rede): comprimir e guardar é uma operação
  local, então salvar um compromisso com foto funciona **100% offline**, como qualquer outro campo
  — a lógica de "bloquear só o upload quando offline" (Tasks 2/3 originais) foi removida por não
  fazer mais sentido.
- **Exclusão em cascata deixa de ser necessária**: como o anexo vive dentro do próprio documento do
  evento, apagar/tombstonar o evento já remove o anexo — não há mais um objeto remoto separado para
  limpar (a Task 5 original — `Cloud.deleteAttachment` no `#appt-delete` — foi revertida).

Novo modelo de dados: `attachment: { url: "data:image/jpeg;base64,...", name: "foto.jpg" }` — o
campo `url` continua se chamando `url` (não `dataUrl`) de propósito, para que todo o código de
exibição (preview no editor, thumbnail na Agenda, "Abrir em nova aba") continue funcionando sem
mudança, já que um `data:` URI é um valor válido para `src`/`href` igual a um link do Storage.
Campos `path`/`type`/`size` (que existiam para o Storage) são removidos — sem `type`, o branch
"PDF vs imagem" na Agenda também é removido (agora é sempre imagem).

Novo limite: em vez de 5MB no arquivo original, o que importa agora é o **tamanho do base64
resultante após compressão**, com orçamento de ~700KB (deixando folga sob o 1MiB do documento
Firestore, que também carrega outros campos do evento). O arquivo de entrada continua validado
(deve ser `image/*`), com um limite de sanidade generoso (15MB) só para não travar o navegador
tentando comprimir um arquivo absurdamente grande — quem garante o tamanho final é a compressão,
não mais uma checagem simples de "arquivo ≤ 5MB".

As seções "Storage & regras de segurança" e as menções a Firebase Storage/Cloud.uploadAttachment/
Cloud.deleteAttachment abaixo descrevem a arquitetura **abandonada** — mantidas só como registro
histórico da primeira tentativa, não como especificação vigente.

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
