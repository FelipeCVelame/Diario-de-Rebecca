/**
 * Resumo diário e pareamento de intervalos de sono (puro).
 * Portado de app.js: funções recebem os eventos como argumento (em vez de ler
 * o STORE global), para serem testáveis e portáveis.
 *
 * `babyEvents` = eventos NÃO-deletados e NÃO-compromisso (STORE.babyEvents()).
 */
import { dayKey } from "./time.js";

/**
 * Casa início→fim cronologicamente, mesmo cruzando a meia-noite.
 * O intervalo é atribuído ao dia em que o sono COMEÇOU.
 * (Ordena defensivamente; app.js já passa a lista ordenada por ts.)
 */
export function buildIntervals(events, startType, endType) {
  const sorted = [...events].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const intervals = [];
  let open = null;
  for (const e of sorted) {
    if (e.type === startType) {
      open = e;
    } else if (e.type === endType && open) {
      intervals.push({
        start: new Date(open.ts),
        end: new Date(e.ts),
        ms: new Date(e.ts) - new Date(open.ts),
        dayKey: dayKey(new Date(open.ts)),
      });
      open = null;
    }
  }
  return intervals;
}

/** Resumo de um dia (`date` no formato YYYY-MM-DD). */
export function summaryForDay(babyEvents, date) {
  const evts = babyEvents.filter((e) => dayKey(new Date(e.ts)) === date);
  const count = (t) => evts.filter((e) => e.type === t).length;

  const milkMl = evts
    .filter((e) => e.type === "milk")
    .reduce((s, e) => s + (Number(e.amountMl) || 0), 0);

  const naps = buildIntervals(babyEvents, "nap_start", "nap_end").filter((i) => i.dayKey === date);
  const napMs = naps.reduce((s, i) => s + i.ms, 0);

  const nights = buildIntervals(babyEvents, "night_start", "wake_morning").filter(
    (i) => i.dayKey === date
  );
  const nightMs = nights.reduce((s, i) => s + i.ms, 0);

  return {
    milkMl,
    milkCount: count("milk"),
    napMs,
    napCount: naps.length,
    nightMs,
    nightCount: nights.length,
    diapers: count("diaper_wet") + count("diaper_poop"),
    poops: count("diaper_poop"),
    meals: count("snack") + count("lunch") + count("dinner"),
    sick: count("sick") > 0,
    total: evts.length,
    events: evts,
  };
}
