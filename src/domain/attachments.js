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
