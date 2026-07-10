# Anexos em Consultas/Exames — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user attach one photo or PDF (≤5MB) to any Agenda appointment (`appt_medical`/`appt_class`/`appt_other`), stored in Firebase Storage, with a thumbnail/badge shown on the Agenda card and cascade delete when the appointment is removed.

**Architecture:** Add a new Firebase Storage bucket alongside the existing Firestore sync, following the same `accounts/{uid}/...` path convention. Add a pure validation module in `src/domain/` (testable, DOM-free). Everything else — upload/delete calls, editor UI, Agenda rendering — is added to the existing monolithic `app.js`, following its established section layout (Cloud object, Agenda section).

**Tech Stack:** Vanilla JS (ES modules), Firebase Storage compat SDK (`firebase-storage-compat.js`, same version `10.12.0` already used for app/auth/firestore), Vitest for domain tests.

## Global Constraints

- Max file size: **5 MB** per attachment.
- Allowed types: `image/*` and `application/pdf` only.
- **1 attachment per appointment** (not multiple).
- Applies to **all three** appointment types (`appt_medical`, `appt_class`, `appt_other`), not just medical.
- Storage path: `accounts/{uid}/attachments/{eventId}/{fileName}`.
- Uploading requires being **online** (`Cloud.online && Cloud.enabled && Cloud.uid`); the rest of the appointment (title/time/note) still saves offline as today. This restriction applies only to the file upload step, never to saving the appointment itself.
- Deleting an appointment's Storage file is **best-effort, non-blocking** (fire-and-forget with a `console.warn` on failure) — never blocks or reverts the local event deletion/save.
- No offline upload queue, no multiple attachments, no attachments on non-Agenda event types — explicitly out of scope (see spec).

---

### Task 1: Domain — attachment validation

**Files:**
- Create: `src/domain/attachments.js`
- Test: `test/domain/attachments.test.js`

**Interfaces:**
- Produces: `MAX_ATTACHMENT_BYTES` (number, `5 * 1024 * 1024`), `validateAttachment(file)` → `{ valid: boolean, reason?: "too-large" | "bad-type" | "no-file" }`. `file` is a browser `File`-like object with `.size` (number) and `.type` (string).

- [ ] **Step 1: Write the failing tests**

Create `test/domain/attachments.test.js`:

```js
import { describe, it, expect } from "vitest";
import { validateAttachment, MAX_ATTACHMENT_BYTES } from "../../src/domain/attachments.js";

const file = (type, size) => ({ type, size });

describe("validateAttachment", () => {
  it("aceita imagem dentro do limite", () => {
    expect(validateAttachment(file("image/jpeg", 1024))).toEqual({ valid: true });
  });

  it("aceita PDF dentro do limite", () => {
    expect(validateAttachment(file("application/pdf", 1024))).toEqual({ valid: true });
  });

  it("rejeita arquivo maior que o limite", () => {
    expect(validateAttachment(file("image/png", MAX_ATTACHMENT_BYTES + 1))).toEqual({
      valid: false,
      reason: "too-large",
    });
  });

  it("rejeita tipo não suportado", () => {
    expect(validateAttachment(file("video/mp4", 1024))).toEqual({
      valid: false,
      reason: "bad-type",
    });
  });

  it("rejeita ausência de arquivo", () => {
    expect(validateAttachment(null)).toEqual({ valid: false, reason: "no-file" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/domain/attachments.test.js`
Expected: FAIL — `Cannot find module '../../src/domain/attachments.js'`

- [ ] **Step 3: Write minimal implementation**

Create `src/domain/attachments.js`:

```js
/**
 * Validação pura de anexos (foto/PDF) para compromissos da Agenda.
 * Sem DOM — portável, espelha as regras aplicadas nas Storage Rules do Firebase.
 */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPE = /^image\/.+|^application\/pdf$/;

export function validateAttachment(file) {
  if (!file) return { valid: false, reason: "no-file" };
  if (file.size > MAX_ATTACHMENT_BYTES) return { valid: false, reason: "too-large" };
  if (!ALLOWED_TYPE.test(file.type)) return { valid: false, reason: "bad-type" };
  return { valid: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/domain/attachments.test.js`
Expected: PASS — 5 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/domain/attachments.js test/domain/attachments.test.js
git commit -m "feat: add attachment validation domain module"
```

---

### Task 2: Firebase Storage wiring (SDK, Cloud methods, setup docs)

**Files:**
- Modify: `index.html:370` (add script tag inside the existing `<!-- BUILD:FIREBASE -->` block)
- Modify: `app.js:1059-1162` (the `Cloud` object)
- Modify: `FIREBASE-SETUP.md` (new step documenting Storage rules)

**Interfaces:**
- Consumes: nothing new (uses existing `Cloud.enabled`, `Cloud.uid`, `firebase` global from the SDK scripts).
- Produces: `Cloud.storage` (Firebase Storage instance or `null`), `Cloud.uploadAttachment(eventId, file)` → `Promise<{path, url, name, type, size}>`, `Cloud.deleteAttachment(path)` → `Promise<void>` (never rejects — swallows errors after logging).

- [ ] **Step 1: Add the Storage SDK script tag**

In `index.html`, inside the `<!-- BUILD:FIREBASE -->` block (currently lines 367-372), add the storage SDK line after the firestore one and before `firebase-config.js`:

```html
    <!-- BUILD:FIREBASE -->
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>
    <script src="firebase-config.js"></script>
    <!-- /BUILD:FIREBASE -->
```

- [ ] **Step 2: Initialize `Cloud.storage` and add `uploadAttachment`/`deleteAttachment`**

In `app.js`, the `Cloud` object (starts at line 1059). First add the `storage` field next to the other state fields (`db`, `auth`, ...):

```js
const Cloud = {
  enabled: false,
  db: null,
  auth: null,
  storage: null,
  uid: null,
```

Then in `init()`, right after `this.db = firebase.firestore();` (line 1075), add:

```js
      this.db = firebase.firestore();
      this.storage = firebase.storage();
```

Then add the two new methods anywhere among the other `Cloud` methods (e.g. right after `signOut()`, before `pushEvent`):

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

- [ ] **Step 3: Document the Storage security rules**

Append a new step to `FIREBASE-SETUP.md`, right after step "5) Regras de segurança (importante)" (currently ends at line 54) and before "6) Regerar e republicar":

```markdown
## 5b) Ativar o Storage (para anexos de consultas/exames)
1. No menu lateral: **Build → Storage → Começar** (aceite as opções padrão de local/região,
   igual ao Firestore).
2. Na aba **Regras**, cole exatamente isto e **Publicar**:

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

Isso garante o mesmo isolamento por conta do Firestore: só quem está logado acessa os próprios
anexos, com limite de 5MB e só imagens/PDF.

3. Confira se `firebase-config.js` tem o campo `storageBucket` preenchido (o Firebase Console já
   inclui esse campo ao gerar a config do app web — se o projeto foi criado antes disso, copie a
   config de novo em Configurações do projeto → Geral → Seus apps).
```

- [ ] **Step 4: Verify the app still boots cleanly**

There is no automated test for this (it depends on the global `firebase` object, unavailable
under Vitest). Verify manually:

Run: `powershell -ExecutionPolicy Bypass -File serve.ps1` (or however the project is currently
being previewed), open the app in a browser, open devtools console, and confirm:
- No new console errors on load.
- `Cloud.storage` is not `null` if `firebase-config.js` is filled in (or `Cloud.enabled` is
  `false` and `Cloud.storage` is `null` if it isn't — either is fine, matching existing
  Firestore behavior).

Optional (if the user wants the same cross-account check already done for Firestore): after
Task 3 produces a real uploaded file, sign in as a second/different account and try to fetch the
first account's `accounts/{other-uid}/attachments/...` path directly — expect it denied by the
Storage rules above. Not required to close this Story; the rule is symmetrical to the already
validated Firestore rule.

- [ ] **Step 5: Commit**

```bash
git add index.html app.js FIREBASE-SETUP.md
git commit -m "feat: wire Firebase Storage for appointment attachments"
```

---

### Task 3: Appointment editor — attach, preview, remove, save

**Files:**
- Modify: `index.html:255-269` (appt-modal fields, between the note field and modal-actions)
- Modify: `app.js:1` (import), `app.js:678-806` (Agenda section — state vars, `openApptEditor`, `initAgenda`)
- Modify: `styles.css` (new rules for the attach preview block)

**Interfaces:**
- Consumes: `validateAttachment` from `src/domain/attachments.js` (Task 1), `Cloud.uploadAttachment`/`Cloud.deleteAttachment`/`Cloud.online`/`Cloud.enabled`/`Cloud.uid` (Task 2).
- Produces: appointment events may now carry an `attachment: {path, url, name, type, size}` field, set via the editor's Save button.

- [ ] **Step 1: Add the attachment field markup to the appt-modal**

In `index.html`, insert this block right after the note `<label class="field">` (ends at line 268) and before `<div class="modal-actions">` (line 270):

```html
        <div class="field">
          <span>Anexo — foto ou PDF (opcional)</span>
          <div class="appt-attach-preview" id="appt-attach-preview" hidden>
            <img class="appt-attach-thumb" id="appt-attach-thumb" alt="" hidden />
            <span class="appt-attach-name" id="appt-attach-name"></span>
            <a class="appt-attach-open" id="appt-attach-open" target="_blank" rel="noopener"
              >Abrir</a
            >
            <button type="button" class="appt-attach-remove" id="appt-attach-remove">
              Remover
            </button>
          </div>
          <input type="file" id="appt-attach-input" accept="image/*,application/pdf" />
        </div>
```

- [ ] **Step 2: Add the CSS for the attach preview block**

In `styles.css`, add these rules right after the `.appt-ico .ico` rule (currently ends around
line 692, right before the `/* ---------- Modais ---------- */` comment):

```css
.appt-attach-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 13px;
  border: 1px solid var(--glass-brd);
  background: var(--field-bg);
  margin-bottom: 15px;
}
.appt-attach-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}
.appt-attach-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
}
.appt-attach-open {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  flex-shrink: 0;
}
.appt-attach-remove {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--c-sick);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 4px;
}
```

- [ ] **Step 3: Import the validation function in `app.js`**

At the top of `app.js`, next to the other `src/domain/*` imports (line 11), add:

```js
import { validateAttachment } from "./src/domain/attachments.js";
```

- [ ] **Step 4: Track attachment state and render the preview**

In `app.js`, replace the existing Agenda state declaration (line 679-680):

```js
let apptEditingId = null,
  apptType = "appt_medical";
```

with:

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

- [ ] **Step 5: Wire attachment state into `openApptEditor` and the Agenda card click handler**

In `app.js`, update `openApptEditor` (currently lines 738-749) to reset/load attachment state:

```js
function openApptEditor(opts = {}) {
  apptEditingId = opts.id || null;
  apptType = opts.type || "appt_medical";
  apptOriginalAttachment = opts.attachment || null;
  apptAttachment = opts.attachment || null;
  el("#appt-title").value = opts.title || "";
  el("#appt-note").value = opts.note || "";
  el("#appt-time").value = toLocalInput(opts.ts || nextHour());
  el("#appt-modal-title").textContent = apptEditingId ? "Editar compromisso" : "Novo compromisso";
  el("#appt-delete").hidden = !apptEditingId;
  el("#appt-attach-input").value = "";
  renderApptAttachmentPreview();
  updateApptSeg();
  el("#appt-modal").hidden = false;
  el("#appt-modal .modal").scrollTop = 0;
}
```

In `renderAgenda`'s existing click handler (around line 723-735), pass the event's attachment
through:

```js
  list.querySelectorAll(".appt-card").forEach((row) =>
    row.addEventListener("click", () => {
      const e = STORE.all().find((x) => x.id === row.dataset.id);
      if (e)
        openApptEditor({
          id: e.id,
          type: e.type,
          ts: new Date(e.ts),
          title: e.title,
          note: e.note,
          attachment: e.attachment,
        });
    })
  );
```

- [ ] **Step 6: Wire the file input, remove button, and updated save handler in `initAgenda`**

In `app.js`, inside `initAgenda()` (currently lines 760-806), add two new listeners right after
the `el("#appt-close")`/`modal` click listeners (after line 776) and replace the existing
`#appt-save` handler:

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

  el("#appt-attach-remove").addEventListener("click", () => {
    apptAttachment = null;
    el("#appt-attach-input").value = "";
    renderApptAttachmentPreview();
  });

  el("#appt-save").addEventListener("click", async () => {
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
    const file = el("#appt-attach-input").files[0];

    if (file) {
      const check = validateAttachment(file);
      if (!check.valid) {
        alert(
          check.reason === "too-large"
            ? "Arquivo muito grande (máximo 5MB)."
            : "Tipo de arquivo não suportado (use foto ou PDF)."
        );
        return;
      }
      if (!Cloud.online || !Cloud.enabled || !Cloud.uid) {
        toast("Anexar exige conexão com a internet");
        return;
      }
    }

    const evt = { id: apptEditingId || newId(), type: apptType, ts: ts.toISOString(), title };
    if (note) evt.note = note;

    el("#appt-save").disabled = true;
    try {
      if (file) {
        evt.attachment = await Cloud.uploadAttachment(evt.id, file);
        if (apptOriginalAttachment && apptOriginalAttachment.path !== evt.attachment.path) {
          Cloud.deleteAttachment(apptOriginalAttachment.path);
        }
      } else if (apptAttachment) {
        evt.attachment = apptAttachment;
      } else if (apptOriginalAttachment) {
        Cloud.deleteAttachment(apptOriginalAttachment.path);
      }
      STORE.put(evt);
      close();
      toast("Compromisso salvo");
      afterMutation();
    } catch (e) {
      console.warn("appt attachment:", e);
      alert("Não deu para salvar o anexo: " + (e && e.message ? e.message : e));
    } finally {
      el("#appt-save").disabled = false;
    }
  });
```

This fully replaces the old `#appt-save` listener (the one currently at lines 778-797) — remove
the old one, don't keep both.

- [ ] **Step 7: Manual verification**

Run: `powershell -ExecutionPolicy Bypass -File serve.ps1`, open the app, go to **Agenda → Novo
compromisso**:
- Fill title/time, pick a small image file, Save. Expected: toast "Compromisso salvo", editor
  closes. Reopen the same appointment: the image thumbnail shows in the attach preview.
- Reopen it, click "Remover", Save. Reopen again: no attachment preview shown.
- Try picking a >5MB file or a `.txt` file: expected an `alert` before any upload starts.
- Turn off network (devtools → Network → Offline), try attaching a valid file, Save: expected
  toast "Anexar exige conexão com a internet", and if title/time were valid the appointment
  should NOT save yet (return before `STORE.put`) — confirm the alert flow matches this by
  reading the code path (offline check returns early, before `STORE.put`).

- [ ] **Step 8: Commit**

```bash
git add index.html app.js styles.css
git commit -m "feat: attach photo/PDF to Agenda appointments"
```

---

### Task 4: Agenda card — attachment thumbnail/badge

**Files:**
- Modify: `app.js:682-736` (`renderAgenda`, specifically the `card` template and the click-wiring loop at the end)
- Modify: `styles.css` (new `.appt-attach-badge` rules)

**Interfaces:**
- Consumes: `e.attachment` (set by Task 3's save flow).
- Produces: nothing consumed by later tasks — this is the last piece of UI for the Story.

- [ ] **Step 1: Add the badge CSS**

In `styles.css`, add right after the `.appt-attach-remove` rule added in Task 3:

```css
.appt-attach-badge {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--field-bg);
  border: 1px solid var(--glass-brd);
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--muted-2);
}
.appt-attach-badge img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 2: Render the badge in the Agenda card template**

In `app.js`, inside `renderAgenda`'s `card` function (currently lines 695-711), add the badge
markup. Replace:

```js
  const card = (e, isPast) => {
    const def = EVENT_TYPES[e.type] || { ic: "bookmark", label: "Compromisso" };
    const d = new Date(e.ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const when =
      d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
      " · " +
      fmtTime(d);
    const meta = e.note ? `${when} · ${escapeHtml(e.note)}` : when;
    return `
      <button class="appt-card${isPast ? " past" : ""}" data-id="${e.id}">
        <span class="appt-date"><span class="ad-day">${dd}</span><span class="ad-mon">${mon}</span></span>
        <span class="appt-body"><b>${escapeHtml(e.title || def.label)}</b><span class="appt-meta">${meta}</span></span>
        <span class="appt-ico chip-appt">${svgIcon(def.ic)}</span>
      </button>`;
  };
```

with:

```js
  const card = (e, isPast) => {
    const def = EVENT_TYPES[e.type] || { ic: "bookmark", label: "Compromisso" };
    const d = new Date(e.ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const when =
      d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
      " · " +
      fmtTime(d);
    const meta = e.note ? `${when} · ${escapeHtml(e.note)}` : when;
    const attach = e.attachment
      ? `<span class="appt-attach-badge" data-url="${e.attachment.url}">${
          e.attachment.type.startsWith("image/")
            ? `<img src="${e.attachment.url}" alt="" />`
            : "PDF"
        }</span>`
      : "";
    return `
      <button class="appt-card${isPast ? " past" : ""}" data-id="${e.id}">
        <span class="appt-date"><span class="ad-day">${dd}</span><span class="ad-mon">${mon}</span></span>
        <span class="appt-body"><b>${escapeHtml(e.title || def.label)}</b><span class="appt-meta">${meta}</span></span>
        <span class="appt-ico chip-appt">${svgIcon(def.ic)}</span>
        ${attach}
      </button>`;
  };
```

(A `<span>` is used instead of a nested `<a>` because `.appt-card` is a `<button>`, and nesting
another interactive/anchor element inside a `<button>` is invalid HTML — click handling is done
in JS instead, see next step.)

- [ ] **Step 3: Wire the badge click to open the attachment, without triggering the card's edit click**

In `app.js`, right after the existing `.appt-card` click-wiring loop (currently lines 723-735,
ending right before the closing `}` of `renderAgenda`), add:

```js
  list.querySelectorAll(".appt-attach-badge").forEach((badge) =>
    badge.addEventListener("click", (ev) => {
      ev.stopPropagation();
      window.open(badge.dataset.url, "_blank", "noopener");
    })
  );
```

- [ ] **Step 4: Manual verification**

Run the app, attach an image to one appointment and a PDF to another (per Task 3's flow). On the
Agenda list:
- The image-attached card shows a small thumbnail badge; clicking it opens the image in a new
  tab and does NOT open the edit modal.
- The PDF-attached card shows a "PDF" text badge; clicking it opens the PDF in a new tab.
- A card with no attachment shows no badge and clicking anywhere on it still opens the editor as
  before.

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css
git commit -m "feat: show attachment thumbnail/badge on Agenda cards"
```

---

### Task 5: Cascade delete on appointment removal

**Files:**
- Modify: `app.js:799-805` (the `#appt-delete` click handler in `initAgenda`)

**Interfaces:**
- Consumes: `apptOriginalAttachment` (Task 3), `Cloud.deleteAttachment` (Task 2).

- [ ] **Step 1: Add the best-effort Storage delete before/alongside the local removal**

In `app.js`, replace the existing `#appt-delete` handler:

```js
  el("#appt-delete").addEventListener("click", () => {
    if (apptEditingId && confirm("Excluir este compromisso?")) {
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
      if (apptOriginalAttachment) Cloud.deleteAttachment(apptOriginalAttachment.path);
      STORE.remove(apptEditingId);
      close();
      afterMutation();
    }
  });
```

- [ ] **Step 2: Manual verification**

Create an appointment with an image attachment, save, then reopen and delete it (confirm the
dialog). Expected:
- The appointment disappears from the Agenda list immediately (local delete isn't blocked).
- In the Firebase Console → Storage, the corresponding file under
  `accounts/{uid}/attachments/{eventId}/` is gone (may take a second).
- If offline when deleting: the appointment still disappears locally; the Storage file is
  cleaned up later only if `deleteAttachment` is retried — out of scope for this Story (no retry
  queue), consistent with the spec's "best-effort" delete.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: delete Storage attachment when appointment is removed"
```

---

### Task 6: Update project docs (kanban, memory)

**Files:**
- Modify: `docs/tasks/kanban.md`
- Modify: `memory.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Move Epic 2 from Backlog to In Progress in the kanban**

In `docs/tasks/kanban.md`, move the `### Epic 2 — Módulo Saúde` section from **Backlog** to **In
Progress** (alongside Epic 0/1), replacing:

```markdown
### Epic 2 — Módulo Saúde
_(ainda não iniciado)_
```

with:

```markdown
### Epic 2 — Módulo Saúde
- [x] Consultas/exames com anexo (foto/PDF, Firebase Storage) — 1 anexo por compromisso, exigindo
  conexão para upload, exclusão em cascata best-effort ao apagar o compromisso
- [ ] Crescimento (peso/altura + percentil OMS)
- [ ] Vacinas (calendário PNI + lembretes)
- [ ] Medicamentos com lembrete recorrente
```

Also remove the old Backlog entry so Epic 2 isn't listed twice, and update the `## Backlog`
section (delete the two lines that are now redundant).

- [ ] **Step 2: Update `memory.md`'s Epic 2 summary**

In `memory.md`, replace:

```markdown
## Epic 2 — Módulo Saúde — não iniciado
Frentes: crescimento (peso/altura + percentil OMS), vacinas (calendário PNI + lembretes), anexos em consultas (Firebase Storage), medicamentos com lembrete recorrente. **Ainda não decidido qual entra primeiro** — perguntar ao usuário antes de começar.
```

with:

```markdown
## Epic 2 — Módulo Saúde — iniciado
- [x] Anexos em consultas/exames (foto/PDF, Firebase Storage) — 1 anexo por compromisso
  (`appt_medical`/`appt_class`/`appt_other`), exige conexão para subir o arquivo (o resto do
  compromisso continua salvando offline), exclusão em cascata best-effort no Storage ao apagar o
  compromisso, limite 5MB, regras de Storage documentadas em `FIREBASE-SETUP.md` (passo 5b).
- [ ] Crescimento (peso/altura + percentil OMS)
- [ ] Vacinas (calendário PNI + lembretes)
- [ ] Medicamentos com lembrete recorrente
```

- [ ] **Step 3: Update the "Last Updated" line at the bottom of the kanban**

In `docs/tasks/kanban.md`, update:

```markdown
**Last Updated:** 2026-07-09
```

to:

```markdown
**Last Updated:** 2026-07-10
```

- [ ] **Step 4: Commit**

```bash
git add docs/tasks/kanban.md memory.md
git commit -m "docs: mark appointment attachments Story done in Epic 2"
```

---

## Not covered by this plan (reminder, per spec's Out of Scope)

Offline upload queue/retry, multiple attachments per appointment, attachments on non-Agenda event
types, and automatic retry of a failed cascade delete are intentionally not implemented — see the
spec's "Fora de escopo" section if any of these become needed later.
