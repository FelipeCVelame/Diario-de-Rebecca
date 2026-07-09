/**
 * Lembrete de leite (puro). Portado de app.js.
 * Avisa após 3h desde o último leite; SUPRIMIDO durante sono noturno em aberto.
 * Soneca NÃO suprime. Ignora um `night_start` "esquecido" (> 16h).
 *
 * `babyEvents` = STORE.babyEvents(); `now` = epoch ms (injetável p/ teste).
 */
export const MILK_REMINDER_MS = 3 * 60 * 60 * 1000; // 3 horas
const NIGHT_MAX_OPEN_MS = 16 * 60 * 60 * 1000;

export function isNightSleeping(babyEvents, now = Date.now()) {
  let lastNight = -Infinity;
  let lastWake = -Infinity;
  for (const e of babyEvents) {
    const t = new Date(e.ts).getTime();
    if (e.type === "night_start") lastNight = Math.max(lastNight, t);
    else if (e.type === "wake_morning") lastWake = Math.max(lastWake, t);
  }
  if (lastNight <= lastWake) return false;
  return now - lastNight < NIGHT_MAX_OPEN_MS;
}

export function milkReminderState(babyEvents, now = Date.now(), thresholdMs = MILK_REMINDER_MS) {
  const milks = babyEvents
    .filter((e) => e.type === "milk")
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const last = milks.length ? milks[milks.length - 1] : null;
  if (!last) return { active: false, due: false, elapsed: 0, lastTs: null };
  const elapsed = now - new Date(last.ts).getTime();
  const due = elapsed >= thresholdMs;
  return { active: due && !isNightSleeping(babyEvents, now), due, elapsed, lastTs: last.ts };
}
