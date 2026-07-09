import { describe, it, expect } from "vitest";
import { mergeRemote } from "../../src/domain/sync.js";

describe("mergeRemote (last-write-wins + tombstone)", () => {
  it("insere evento novo (id ausente)", () => {
    const { list, changed } = mergeRemote([], { id: "a", type: "milk", updatedAt: 100 });
    expect(changed).toBe(true);
    expect(list).toHaveLength(1);
  });

  it("remoto mais novo vence", () => {
    const local = [{ id: "a", type: "milk", amountMl: 100, updatedAt: 100 }];
    const { list, changed } = mergeRemote(local, { id: "a", type: "milk", amountMl: 200, updatedAt: 200 });
    expect(changed).toBe(true);
    expect(list[0].amountMl).toBe(200);
  });

  it("remoto mais velho é ignorado", () => {
    const local = [{ id: "a", type: "milk", amountMl: 100, updatedAt: 200 }];
    const { list, changed } = mergeRemote(local, { id: "a", type: "milk", amountMl: 999, updatedAt: 100 });
    expect(changed).toBe(false);
    expect(list[0].amountMl).toBe(100);
  });

  it("tombstone remoto mais novo propaga o apagamento", () => {
    const local = [{ id: "a", type: "milk", updatedAt: 100 }];
    const { list, changed } = mergeRemote(local, { id: "a", type: "milk", deleted: true, updatedAt: 200 });
    expect(changed).toBe(true);
    expect(list[0].deleted).toBe(true);
  });

  it("não muta a lista original", () => {
    const local = [{ id: "a", updatedAt: 100 }];
    mergeRemote(local, { id: "a", updatedAt: 200 });
    expect(local[0].updatedAt).toBe(100);
  });

  it("remoto inválido (sem id) é no-op", () => {
    const { changed } = mergeRemote([], { type: "milk" });
    expect(changed).toBe(false);
  });
});
