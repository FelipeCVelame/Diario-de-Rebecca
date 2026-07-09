import { describe, it, expect } from "vitest";
import { seriesForRange, activeAvg } from "../../src/domain/trends.js";

const iso = (d, h, m) => new Date(2026, 6, d, h, m).toISOString();
const milk = (d, h, ml) => ({ id: `m${d}-${h}`, type: "milk", ts: iso(d, h, 0), amountMl: ml });

describe("activeAvg", () => {
  it("divide só pelos dias com registro do indicador", () => {
    const series = [{ v: 0 }, { v: 300 }, { v: 0 }, { v: 100 }];
    expect(activeAvg(series, (d) => d.v)).toBe(200); // (300+100)/2, ignora os zeros
  });

  it("sem nenhum dia ativo → 0", () => {
    expect(activeAvg([{ v: 0 }, { v: 0 }], (d) => d.v)).toBe(0);
  });
});

describe("seriesForRange", () => {
  it("gera N dias e soma leite por dia; dias vazios ficam zerados", () => {
    const today = new Date(2026, 6, 8, 12, 0); // 08/07
    // dia 07: 150+120=270 ; dia 08: 200
    const events = [milk(7, 7, 150), milk(7, 11, 120), milk(8, 9, 200)];
    const series = seriesForRange(events, 3, today); // 06, 07, 08
    expect(series).toHaveLength(3);
    expect(series.map((d) => d.milkMl)).toEqual([0, 270, 200]);
    // média de leite considerando só dias ativos = (270+200)/2 = 235
    expect(activeAvg(series, (d) => d.milkMl)).toBe(235);
  });
});
