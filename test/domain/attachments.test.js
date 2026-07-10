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
