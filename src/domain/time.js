/**
 * Utilidades de tempo (puro). Portado de app.js sem alterar semântica.
 */

/** Chave local YYYY-MM-DD (respeita o fuso do aparelho). */
export function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Duração humana: "0min" | "45min" | "2h" | "2h05". */
export function fmtDuration(ms) {
  if (ms <= 0) return "0min";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
