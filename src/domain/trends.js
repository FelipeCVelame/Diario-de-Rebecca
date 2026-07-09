/**
 * Séries e médias das tendências (puro). Portado de app.js.
 * Média considera SÓ os dias com registro daquele indicador (valor > 0).
 */
import { dayKey } from "./time.js";
import { summaryForDay } from "./summary.js";

export function seriesForRange(babyEvents, days, today = new Date()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const s = summaryForDay(babyEvents, dayKey(d));
    out.push({
      date: d,
      milkMl: s.milkMl,
      milkCount: s.milkCount,
      napMs: s.napMs,
      napCount: s.napCount,
      nightMs: s.nightMs,
      diapers: s.diapers,
      poops: s.poops,
    });
  }
  return out;
}

/** Média só sobre os dias em que o indicador teve valor > 0. */
export function activeAvg(series, valFn) {
  const active = series.map(valFn).filter((v) => v > 0);
  return active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
}
