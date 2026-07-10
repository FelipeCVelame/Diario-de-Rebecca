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
