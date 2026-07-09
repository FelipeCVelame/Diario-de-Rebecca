import { describe, it, expect } from "vitest";
import { milkReminderState, isNightSleeping } from "../../src/domain/reminder.js";

const now = new Date(2026, 6, 8, 12, 0).getTime();
const agoIso = (min) => new Date(now - min * 60000).toISOString();
const milkAgo = (min) => ({ id: `m${min}`, type: "milk", ts: agoIso(min), amountMl: 150 });
const evAgo = (type, min) => ({ id: `${type}${min}`, type, ts: agoIso(min) });

describe("milkReminderState", () => {
  it("cenário 1: leite há 3h30, sem sono noturno → ATIVO", () => {
    const r = milkReminderState([milkAgo(210)], now);
    expect(r.due).toBe(true);
    expect(r.active).toBe(true);
  });

  it("cenário 2: leite há 2h → não vencido", () => {
    const r = milkReminderState([milkAgo(120)], now);
    expect(r.due).toBe(false);
    expect(r.active).toBe(false);
  });

  it("cenário 3: leite há 3h30 + soneca em aberto → ATIVO (soneca não suprime)", () => {
    const r = milkReminderState([milkAgo(210), evAgo("nap_start", 20)], now);
    expect(r.active).toBe(true);
  });

  it("cenário 4: leite há 3h30 + sono noturno em aberto → SUPRIMIDO", () => {
    const r = milkReminderState([milkAgo(210), evAgo("night_start", 40)], now);
    expect(r.due).toBe(true);
    expect(r.active).toBe(false);
  });

  it("cenário 5: sono noturno seguido de acordar → volta a ATIVAR", () => {
    const r = milkReminderState(
      [milkAgo(210), evAgo("night_start", 300), evAgo("wake_morning", 5)],
      now,
    );
    expect(r.active).toBe(true);
  });

  it("sem nenhum leite → inativo", () => {
    const r = milkReminderState([evAgo("nap_start", 10)], now);
    expect(r.active).toBe(false);
    expect(r.due).toBe(false);
    expect(r.lastTs).toBeNull();
  });

  it('night_start "esquecido" (>16h) não suprime para sempre', () => {
    const r = milkReminderState([milkAgo(210), evAgo("night_start", 20 * 60)], now);
    expect(r.active).toBe(true);
  });
});

describe("isNightSleeping", () => {
  it("night_start em aberto (sem wake depois) = dormindo", () => {
    expect(isNightSleeping([evAgo("night_start", 60)], now)).toBe(true);
  });
  it("wake depois do night_start = acordado", () => {
    expect(isNightSleeping([evAgo("night_start", 300), evAgo("wake_morning", 5)], now)).toBe(false);
  });
});
