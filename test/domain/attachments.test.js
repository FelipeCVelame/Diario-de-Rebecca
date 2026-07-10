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
