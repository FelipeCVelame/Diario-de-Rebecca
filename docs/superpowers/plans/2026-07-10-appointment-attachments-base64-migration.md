# Anexos: migrar de Firebase Storage para base64 no Firestore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Firebase Storage-based attachment implementation (currently live on `main`,
non-functional because Storage requires the Blaze plan) with a base64-embedded-in-Firestore
approach: client-side compressed photo, no separate upload/network step, no separate delete
cascade, no PDF support.

**Architecture:** Remove `Cloud.storage`/`uploadAttachment`/`deleteAttachment` and the Storage SDK
script tag entirely (dead code once this lands). Compress the picked image via `<canvas>` at
selection time in the editor, producing a `data:image/jpeg;base64,...` string that's stored
directly on the event's `attachment.url` field — same field name as before, so the preview/agenda
rendering code needs no change beyond dropping the now-unused "is it a PDF" branch. Saving becomes
fully synchronous and offline-capable again, since there's no network round-trip.

**Tech Stack:** Same as the rest of the project — vanilla JS, Canvas API, Vitest for the pure
domain validation module. No new dependencies.

## Global Constraints

- Only `image/*` files accepted — PDF support is dropped from this Story (revisit only if a
  Storage-like service is adopted later).
- Raw input file sanity limit: 15MB (just to avoid the browser choking on a pathological file —
  the real limit is enforced on the compressed output, not the input).
- Compressed output budget: ~700KB of base64 string length (`MAX_ATTACHMENT_DATA_URL_LENGTH`),
  leaving headroom under Firestore's 1MiB per-document cap alongside the event's other fields.
- Attachment shape becomes `{ url: "data:image/jpeg;base64,...", name: "foto.jpg" }` — `path`,
  `type`, `size` fields are dropped (no longer meaningful without Storage).
- No network dependency anywhere in this flow — saving an appointment with a photo must work
  fully offline, same as any other field.
- No separate cascade-delete call on appointment deletion — the tombstone mechanism already
  covers it since the photo lives inside the same Firestore document.

---

### Task A: Domain module rework + remove dead Storage code

**Files:**
- Modify: `src/domain/attachments.js`
- Modify: `test/domain/attachments.test.js`
- Modify: `index.html:364` (remove the `firebase-storage-compat.js` script tag added previously)
- Modify: `app.js` (the `Cloud` object: remove `storage` field, its init line, and the
  `uploadAttachment`/`deleteAttachment` methods)
- Modify: `FIREBASE-SETUP.md` (remove the "5b) Ativar o Storage" section entirely)

**Interfaces:**
- Produces: `MAX_ATTACHMENT_INPUT_BYTES` (number), `MAX_ATTACHMENT_DATA_URL_LENGTH` (number),
  `validateAttachment(file)` → `{valid, reason?: "no-file"|"too-large"|"bad-type"}` (same shape as
  before, but `bad-type` now covers anything that isn't `image/*`, including PDF),
  `isDataUrlWithinBudget(dataUrl)` → `boolean`.

- [ ] **Step 1: Rewrite the domain module and its tests (TDD)**

Replace the full contents of `test/domain/attachments.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  validateAttachment,
  isDataUrlWithinBudget,
  MAX_ATTACHMENT_INPUT_BYTES,
  MAX_ATTACHMENT_DATA_URL_LENGTH,
} from "../../src/domain/attachments.js";

const file = (type, size) => ({ type, size });

describe("validateAttachment", () => {
  it("aceita imagem dentro do limite de entrada", () => {
    expect(validateAttachment(file("image/jpeg", 1024))).toEqual({ valid: true });
  });

  it("rejeita arquivo maior que o limite de entrada", () => {
    expect(validateAttachment(file("image/png", MAX_ATTACHMENT_INPUT_BYTES + 1))).toEqual({
      valid: false,
      reason: "too-large",
    });
  });

  it("rejeita PDF (só imagem é suportada)", () => {
    expect(validateAttachment(file("application/pdf", 1024))).toEqual({
      valid: false,
      reason: "bad-type",
    });
  });

  it("rejeita outro tipo não suportado", () => {
    expect(validateAttachment(file("video/mp4", 1024))).toEqual({
      valid: false,
      reason: "bad-type",
    });
  });

  it("rejeita ausência de arquivo", () => {
    expect(validateAttachment(null)).toEqual({ valid: false, reason: "no-file" });
  });
});

describe("isDataUrlWithinBudget", () => {
  it("aceita data URL dentro do orçamento", () => {
    expect(isDataUrlWithinBudget("data:image/jpeg;base64,AAAA")).toBe(true);
  });

  it("rejeita data URL maior que o orçamento", () => {
    const big = "a".repeat(MAX_ATTACHMENT_DATA_URL_LENGTH + 1);
    expect(isDataUrlWithinBudget(big)).toBe(false);
  });

  it("rejeita valor não-string", () => {
    expect(isDataUrlWithinBudget(null)).toBe(false);
    expect(isDataUrlWithinBudget(undefined)).toBe(false);
  });
});
```

Run: `npx vitest run test/domain/attachments.test.js` — expect FAIL (old exports don't match).

Replace the full contents of `src/domain/attachments.js`:

```js
/**
 * Validação pura de anexos (foto) para compromissos da Agenda.
 * Sem DOM — portável. Anexos são guardados como base64 embutido no próprio
 * documento do evento no Firestore (sem Firebase Storage — ver spec), então o
 * que importa no fim é o tamanho do base64 resultante da compressão
 * (isDataUrlWithinBudget), não o tamanho do arquivo original.
 */
export const MAX_ATTACHMENT_INPUT_BYTES = 15 * 1024 * 1024;
export const MAX_ATTACHMENT_DATA_URL_LENGTH = 700 * 1024;

const ALLOWED_TYPE = /^image\/.+/;

export function validateAttachment(file) {
  if (!file) return { valid: false, reason: "no-file" };
  if (file.size > MAX_ATTACHMENT_INPUT_BYTES) return { valid: false, reason: "too-large" };
  if (!ALLOWED_TYPE.test(file.type)) return { valid: false, reason: "bad-type" };
  return { valid: true };
}

export function isDataUrlWithinBudget(dataUrl) {
  return typeof dataUrl === "string" && dataUrl.length <= MAX_ATTACHMENT_DATA_URL_LENGTH;
}
```

Run: `npx vitest run test/domain/attachments.test.js` — expect PASS, 8 tests.

- [ ] **Step 2: Remove the Storage SDK script tag**

In `index.html`, remove this line from the `<!-- BUILD:FIREBASE -->` block (leave the other three
script tags and `firebase-config.js` untouched):

```html
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>
```

- [ ] **Step 3: Remove `Cloud.storage`/`uploadAttachment`/`deleteAttachment` from `app.js`**

In the `Cloud` object, remove the `storage: null,` field declaration and the
`this.storage = firebase.storage();` line from `init()`. Remove the entire `uploadAttachment` and
`deleteAttachment` methods:

```js
  uploadAttachment(eventId, file) {
    if (!this.enabled || !this.uid) return Promise.reject(new Error("cloud-disabled"));
    const path = `accounts/${this.uid}/attachments/${eventId}/${file.name}`;
    return this.storage
      .ref(path)
      .put(file, { contentType: file.type })
      .then((snap) => snap.ref.getDownloadURL())
      .then((url) => ({ path, url, name: file.name, type: file.type, size: file.size }));
  },
  deleteAttachment(path) {
    if (!this.enabled || !path) return Promise.resolve();
    return this.storage
      .ref(path)
      .delete()
      .catch((e) => console.warn("deleteAttachment:", e));
  },
```

Nothing else in `app.js` should reference `Cloud.storage`, `Cloud.uploadAttachment`, or
`Cloud.deleteAttachment` after this step and after Task B lands (Task B removes the call sites) —
if you find a reference this step doesn't cover, leave it for Task B rather than guessing at it.

- [ ] **Step 4: Remove the Storage setup section from `FIREBASE-SETUP.md`**

Delete the entire "## 5b) Ativar o Storage (para anexos de consultas/exames)" section (from its
heading through the paragraph ending "...copie a config de novo em Configurações do projeto →
Geral → Seus apps)."), so the doc goes straight from step 5 (Firestore rules) to step 6 (Regerar e
republicar).

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test` — expect all tests passing (the attachments suite now has 8 tests instead of 5;
total should be 32).

```bash
git add src/domain/attachments.js test/domain/attachments.test.js index.html app.js FIREBASE-SETUP.md
git commit -m "refactor: drop Firebase Storage for attachments (requires Blaze plan)"
```

---

### Task B: Editor rework — client-side compression, no network/offline gating

**Files:**
- Modify: `app.js` (Agenda state vars, `renderApptAttachmentPreview`, `openApptEditor`,
  `initAgenda`'s file-input/remove/save listeners, `#appt-delete` listener)
- Modify: `index.html` (attach field label + `accept` attribute)

**Interfaces:**
- Consumes: `validateAttachment`, `isDataUrlWithinBudget` from `src/domain/attachments.js`
  (Task A).
- Produces: appointment events now carry `attachment: {url, name}` (no `path`/`type`/`size`),
  where `url` is a `data:image/jpeg;base64,...` string, not a Storage download URL. Task C
  consumes this shape for the Agenda badge.

- [ ] **Step 1: Update the attach field's label and accepted types in `index.html`**

Change:

```html
          <span>Anexo — foto ou PDF (opcional)</span>
```

to:

```html
          <span>Anexo — foto (opcional)</span>
```

And change:

```html
          <input type="file" id="appt-attach-input" accept="image/*,application/pdf" />
```

to:

```html
          <input type="file" id="appt-attach-input" accept="image/*" />
```

- [ ] **Step 2: Replace the Agenda state declaration and preview renderer**

Replace:

```js
let apptEditingId = null,
  apptType = "appt_medical",
  apptOriginalAttachment = null, // anexo como veio do evento ao abrir o editor (p/ apagar do Storage se substituído/removido)
  apptAttachment = null; // anexo atual desejado ao salvar (null = nenhum)

function renderApptAttachmentPreview() {
  const box = el("#appt-attach-preview");
  const thumb = el("#appt-attach-thumb");
  const name = el("#appt-attach-name");
  const open = el("#appt-attach-open");
  if (!apptAttachment) {
    box.hidden = true;
    thumb.hidden = true;
    return;
  }
  box.hidden = false;
  thumb.hidden = !apptAttachment.type.startsWith("image/");
  if (!thumb.hidden) thumb.src = apptAttachment.url;
  name.textContent = apptAttachment.name;
  open.hidden = !apptAttachment.path;
  if (apptAttachment.path) open.href = apptAttachment.url;
}
```

with:

```js
let apptEditingId = null,
  apptType = "appt_medical",
  apptAttachment = null; // anexo atual desejado ao salvar (null = nenhum); { url: "data:image/...", name }

function renderApptAttachmentPreview() {
  const box = el("#appt-attach-preview");
  const thumb = el("#appt-attach-thumb");
  const name = el("#appt-attach-name");
  const open = el("#appt-attach-open");
  if (!apptAttachment) {
    box.hidden = true;
    thumb.hidden = true;
    return;
  }
  box.hidden = false;
  thumb.hidden = false;
  thumb.src = apptAttachment.url;
  name.textContent = apptAttachment.name;
  open.hidden = false;
  open.href = apptAttachment.url;
}

function compressImageToDataUrl(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não deu para ler o arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não deu para abrir a imagem."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const ATTACHMENT_COMPRESSION_ATTEMPTS = [
  { maxWidth: 1000, quality: 0.7 },
  { maxWidth: 700, quality: 0.5 },
  { maxWidth: 480, quality: 0.4 },
];

async function compressAttachment(file) {
  for (const { maxWidth, quality } of ATTACHMENT_COMPRESSION_ATTEMPTS) {
    const dataUrl = await compressImageToDataUrl(file, maxWidth, quality);
    if (isDataUrlWithinBudget(dataUrl)) return dataUrl;
  }
  return null;
}
```

Also update the `app.js` import line (currently `import { validateAttachment } from
"./src/domain/attachments.js";`) to:

```js
import { validateAttachment, isDataUrlWithinBudget } from "./src/domain/attachments.js";
```

- [ ] **Step 3: Update `openApptEditor` to drop `apptOriginalAttachment`**

Replace:

```js
function openApptEditor(opts = {}) {
  apptEditingId = opts.id || null;
  apptType = opts.type || "appt_medical";
  apptOriginalAttachment = opts.attachment || null;
  apptAttachment = opts.attachment || null;
```

with:

```js
function openApptEditor(opts = {}) {
  apptEditingId = opts.id || null;
  apptType = opts.type || "appt_medical";
  apptAttachment = opts.attachment || null;
```

(the rest of the function is unchanged).

- [ ] **Step 4: Replace the file-input change handler with the compressing version**

Replace:

```js
  el("#appt-attach-input").addEventListener("change", () => {
    const file = el("#appt-attach-input").files[0];
    if (!file) return;
    const check = validateAttachment(file);
    if (!check.valid) {
      alert(
        check.reason === "too-large"
          ? "Arquivo muito grande (máximo 5MB)."
          : "Tipo de arquivo não suportado (use foto ou PDF)."
      );
      el("#appt-attach-input").value = "";
      return;
    }
    apptAttachment = {
      path: null, // só é definido depois do upload, ao salvar
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      name: file.name,
      type: file.type,
      size: file.size,
    };
    renderApptAttachmentPreview();
  });
```

with:

```js
  el("#appt-attach-input").addEventListener("change", async () => {
    const file = el("#appt-attach-input").files[0];
    if (!file) return;
    const check = validateAttachment(file);
    if (!check.valid) {
      alert(
        check.reason === "too-large" ? "Arquivo muito grande." : "Tipo de arquivo não suportado (use foto)."
      );
      el("#appt-attach-input").value = "";
      return;
    }
    el("#appt-attach-input").disabled = true;
    try {
      const dataUrl = await compressAttachment(file);
      if (!dataUrl) {
        alert("Imagem muito grande mesmo após compressão — tente outra foto.");
        el("#appt-attach-input").value = "";
        return;
      }
      apptAttachment = { url: dataUrl, name: file.name };
      renderApptAttachmentPreview();
    } catch (e) {
      console.warn("compressAttachment:", e);
      alert("Não deu para processar essa imagem.");
      el("#appt-attach-input").value = "";
    } finally {
      el("#appt-attach-input").disabled = false;
    }
  });
```

The `#appt-attach-remove` handler right below is unchanged — leave it exactly as-is.

- [ ] **Step 5: Replace the save handler with the simplified, synchronous version**

Replace the entire `el("#appt-save").addEventListener("click", async () => { ... });` block with:

```js
  el("#appt-save").addEventListener("click", () => {
    const raw = el("#appt-time").value;
    const ts = new Date(raw);
    if (!raw || isNaN(ts)) {
      alert("Informe uma data e hora válidas.");
      return;
    }
    const title = el("#appt-title").value.trim();
    if (!title) {
      alert("Dê um título ao compromisso.");
      return;
    }
    const note = el("#appt-note").value.trim();

    const evt = { id: apptEditingId || newId(), type: apptType, ts: ts.toISOString(), title };
    if (note) evt.note = note;
    if (apptAttachment) evt.attachment = apptAttachment;

    STORE.put(evt);
    close();
    toast("Compromisso salvo");
    afterMutation();
  });
```

- [ ] **Step 6: Simplify the `#appt-delete` handler back to no cascade call**

Replace:

```js
  el("#appt-delete").addEventListener("click", () => {
    if (apptEditingId && confirm("Excluir este compromisso?")) {
      if (apptOriginalAttachment) Cloud.deleteAttachment(apptOriginalAttachment.path);
      STORE.remove(apptEditingId);
      close();
      afterMutation();
    }
  });
```

with:

```js
  el("#appt-delete").addEventListener("click", () => {
    if (apptEditingId && confirm("Excluir este compromisso?")) {
      STORE.remove(apptEditingId);
      close();
      afterMutation();
    }
  });
```

- [ ] **Step 7: Run the full suite and manual verification**

Run: `npm test` — expect 32/32 passing, unchanged from Task A.

If a dev server is available (`powershell -ExecutionPolicy Bypass -File serve.ps1`), verify
manually: attach a phone-camera-sized photo (several MB) to a new appointment, save — it should
save instantly (no spinner/disabled state lingering) with a thumbnail preview, fully offline
(disconnect network in devtools and repeat). If not, do a careful static trace of the same
scenario instead and say so.

- [ ] **Step 8: Commit**

```bash
git add app.js index.html
git commit -m "feat: compress attachments client-side, embed as base64 in Firestore"
```

---

### Task C: Agenda badge simplification + docs update

**Files:**
- Modify: `app.js` (the `card` template inside `renderAgenda`)
- Modify: `docs/tasks/kanban.md`, `memory.md`

**Interfaces:** Consumes `e.attachment.url`/`e.attachment.name` (Task B's shape — no more `.type`
field to branch on).

- [ ] **Step 1: Drop the PDF branch in the Agenda card badge**

Replace:

```js
    const attach = e.attachment
      ? `<span class="appt-attach-badge" data-url="${escapeHtml(e.attachment.url)}">${
          e.attachment.type.startsWith("image/")
            ? `<img src="${escapeHtml(e.attachment.url)}" alt="" />`
            : "PDF"
        }</span>`
      : "";
```

with:

```js
    const attach = e.attachment
      ? `<span class="appt-attach-badge" data-url="${escapeHtml(e.attachment.url)}"><img src="${escapeHtml(e.attachment.url)}" alt="" /></span>`
      : "";
```

- [ ] **Step 2: Run the suite**

Run: `npm test` — expect 32/32 passing, unchanged.

- [ ] **Step 3: Update `docs/tasks/kanban.md` and `memory.md`**

In `docs/tasks/kanban.md`, replace the Epic 2 "In Progress" bullet about attachments:

```markdown
- [x] Consultas/exames com anexo (foto/PDF, Firebase Storage) — 1 anexo por compromisso, exigindo
  conexão para upload, exclusão em cascata best-effort ao apagar o compromisso
```

with:

```markdown
- [x] Consultas/exames com anexo (só foto, comprimida no navegador e guardada como base64 no
  Firestore) — 1 anexo por compromisso, funciona 100% offline; Firebase Storage foi descartado
  porque exige o plano Blaze desde out/2024 (ver spec)
```

In `memory.md`, replace the equivalent Epic 2 bullet:

```markdown
- [x] Anexos em consultas/exames (foto/PDF, Firebase Storage) — 1 anexo por compromisso
  (`appt_medical`/`appt_class`/`appt_other`), exige conexão para subir o arquivo (o resto do
  compromisso continua salvando offline), exclusão em cascata best-effort no Storage ao apagar o
  compromisso, limite 5MB, regras de Storage documentadas em `FIREBASE-SETUP.md` (passo 5b).
```

with:

```markdown
- [x] Anexos em consultas/exames (`appt_medical`/`appt_class`/`appt_other`) — só foto (sem PDF),
  comprimida no navegador (canvas) e guardada como base64 dentro do próprio documento do evento no
  Firestore; funciona 100% offline, sem serviço externo. Firebase Storage foi tentado primeiro mas
  descartado: desde out/2024 exige o plano Blaze (cartão cadastrado) mesmo dentro da franquia
  grátis, e o usuário optou por não ativar. Ver spec para o histórico completo da mudança de
  arquitetura.
```

- [ ] **Step 4: Commit**

```bash
git add app.js docs/tasks/kanban.md memory.md
git commit -m "feat: simplify Agenda badge to image-only; update docs for base64 attachment approach"
```
