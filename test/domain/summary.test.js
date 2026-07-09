import { describe, it, expect } from "vitest";
import { dayKey } from "../../src/domain/time.js";
import { summaryForDay, buildIntervals } from "../../src/domain/summary.js";

const ev = (type, ts, extra = {}) => ({ id: `${type}-${ts}`, type, ts, ...extra });

describe("dayKey", () => {
  it("formata YYYY-MM-DD local", () => {
    expect(dayKey(new Date(2026, 6, 6, 23, 0))).toBe("2026-07-06");
    expect(dayKey(new Date(2026, 0, 3, 0, 5))).toBe("2026-01-03");
  });
});

describe("summaryForDay — dia com dados (07/07) + noite anterior (06/07)", () => {
  const iso = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi).toISOString();
  const events = [
    // sono noturno: 06/07 20:00 -> 07/07 06:30 (= 10h30, atribuído ao dia 06)
    ev("night_start", iso(2026, 6, 6, 20, 0)),
    ev("wake_morning", iso(2026, 6, 7, 6, 30)),
    // leite 07/07: 150 + 120 + 180 = 450 (3 mamadas)
    ev("milk", iso(2026, 6, 7, 7, 0), { amountMl: 150 }),
    ev("milk", iso(2026, 6, 7, 11, 0), { amountMl: 120 }),
    ev("milk", iso(2026, 6, 7, 19, 0), { amountMl: 180 }),
    ev("lunch", iso(2026, 6, 7, 12, 0)),
    // sonecas 07/07: 09:00-10:30 (90) + 14:00-15:15 (75) = 165 min
    ev("nap_start", iso(2026, 6, 7, 9, 0)),
    ev("nap_end", iso(2026, 6, 7, 10, 30)),
    ev("nap_start", iso(2026, 6, 7, 14, 0)),
    ev("nap_end", iso(2026, 6, 7, 15, 15)),
    ev("diaper_poop", iso(2026, 6, 7, 12, 30)),
    ev("diaper_wet", iso(2026, 6, 7, 16, 30)),
  ];

  const d7 = summaryForDay(events, "2026-07-07");
  const d6 = summaryForDay(events, "2026-07-06");

  it("leite total e contagem", () => {
    expect(d7.milkMl).toBe(450);
    expect(d7.milkCount).toBe(3);
  });

  it("sonecas: tempo e quantidade", () => {
    expect(d7.napMs).toBe(165 * 60 * 1000);
    expect(d7.napCount).toBe(2);
  });

  it("sono noturno é atribuído ao dia em que começou (06/07), não ao 07/07", () => {
    expect(d7.nightMs).toBe(0);
    expect(d6.nightMs).toBe(630 * 60 * 1000); // 10h30
    expect(d6.nightCount).toBe(1);
  });

  it("fraldas, cocô e refeições", () => {
    expect(d7.diapers).toBe(2);
    expect(d7.poops).toBe(1);
    expect(d7.meals).toBe(1); // 1 almoço (leite não conta como "meal" sólida)
  });
});

describe("buildIntervals", () => {
  it("ordena defensivamente eventos fora de ordem", () => {
    const iso = (h, m) => new Date(2026, 6, 7, h, m).toISOString();
    const out = buildIntervals(
      [
        { type: "nap_end", ts: iso(10, 0) },
        { type: "nap_start", ts: iso(9, 0) },
      ],
      "nap_start",
      "nap_end"
    );
    expect(out).toHaveLength(1);
    expect(out[0].ms).toBe(60 * 60 * 1000);
  });
});
