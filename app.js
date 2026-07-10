/* =========================================================================
   Diário da Rebecca — PWA local-first
   Camada de dados isolada (STORE) para facilitar troca por nuvem no futuro.
   ========================================================================= */

/* ---- Domínio: módulos ES puros e testados (test/domain/). Fonte única. ---- */
import { dayKey, fmtDuration } from "./src/domain/time.js";
import { summaryForDay } from "./src/domain/summary.js";
import { milkReminderState } from "./src/domain/reminder.js";
import { seriesForRange, activeAvg } from "./src/domain/trends.js";
import { mergeRemote as mergeRemoteFn } from "./src/domain/sync.js";
import { validateAttachment } from "./src/domain/attachments.js";

/* ------------------------------ Ícones (SVG) ----------------------------- */
/* Conjunto de ícones "duotone" (forma sólida + camadas translúcidas na mesma
   cor), grade 24, feito à mão — no lugar de emoji nativo (renderiza diferente
   por plataforma/fonte e já causou desalinhamento). `currentColor` herda a
   cor da categoria, então cada ícone fica colorido pelo chip que o envolve. */
const ICONS = {
  sunrise: `<path d="M12 3.5a1 1 0 0 1 1 1v1.8a1 1 0 1 1-2 0V4.5a1 1 0 0 1 1-1z"/><path d="M5.8 6.2a1 1 0 0 1 1.4 0L8.4 7.4A1 1 0 1 1 7 8.8L5.8 7.6a1 1 0 0 1 0-1.4z"/><path d="M18.2 6.2a1 1 0 0 1 0 1.4L17 8.8a1 1 0 1 1-1.4-1.4l1.2-1.2a1 1 0 0 1 1.4 0z"/><circle cx="12" cy="14.4" r="4.3"/><path d="M2.8 18.6a1 1 0 0 1 1-1h16.4a1 1 0 1 1 0 2H3.8a1 1 0 0 1-1-1z"/>`,
  bottle: `<path d="M10.2 3.8h3.6a.8.8 0 0 1 .8.8v1.3c1.1.5 1.9 1.6 1.9 2.9v8.2a2.8 2.8 0 0 1-2.8 2.8h-2.4a2.8 2.8 0 0 1-2.8-2.8V8.8c0-1.3.8-2.4 1.9-2.9V4.6a.8.8 0 0 1 .8-.8z"/><path d="M9.4 12h5.2v5a1.3 1.3 0 0 1-1.3 1.3h-2.6A1.3 1.3 0 0 1 9.4 17z" fill-opacity=".45"/><path d="M9.7 9.4h4.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
  utensils: `<path d="M8.4 3a.7.7 0 0 1 .7.7v3.5a.45.45 0 1 0 .9 0V3.7a.7.7 0 1 1 1.4 0v3.5a.45.45 0 1 0 .9 0V3.7a.7.7 0 1 1 1.4 0v3.9a1.9 1.9 0 0 1-1.5 1.86V20.3a.95.95 0 1 1-1.9 0V9.46A1.9 1.9 0 0 1 8.8 7.6V3.7a.7.7 0 0 1 .7-.7z" fill-opacity=".85"/><path d="M16.4 3.2c-1.7 1-1.9 4.75-1 6.85.35.85.9 1.35.9 1.35V20.3a1 1 0 1 0 2 0V3.2z"/>`,
  cookie: `<circle cx="12" cy="12.3" r="7.6" fill-opacity=".45"/><circle cx="12" cy="12.3" r="7.6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="9.1" cy="10.3" r="1.05"/><circle cx="14.4" cy="10" r="1.05"/><circle cx="12.2" cy="14.4" r="1.05"/><circle cx="15.6" cy="14" r="1.05"/><circle cx="9.6" cy="15" r="1.05"/>`,
  bowl: `<path d="M4.7 11.1a11.6 11.6 0 0 1 14.6 0 1 1 0 0 1-.6 1.78H5.3a1 1 0 0 1-.6-1.78z" fill-opacity=".4"/><path d="M3.2 12.4h17.6a1 1 0 0 1 1 1.06A9.4 9.4 0 0 1 12.6 22h-1.2a9.4 9.4 0 0 1-9.2-8.54 1 1 0 0 1 1-1.06z"/><circle cx="9.4" cy="10.1" r=".85"/><circle cx="14.7" cy="9.9" r=".85"/>`,
  diaper: `<path d="M3.6 7h16.8a1 1 0 0 1 1 1.14c-.5 6.94-4.9 11.96-9.4 11.96S2.6 15.08 2.1 8.14A1 1 0 0 1 3.6 7z" fill-opacity=".45"/><path d="M3.32 11.85a20.5 20.5 0 0 1-.63-3.35A1 1 0 0 1 3.6 7h16.8a1 1 0 0 1 1 1.15c-.1 1.15-.32 2.28-.63 3.35A1 1 0 0 1 20 11.85H4a1 1 0 0 1-.68-.85z" fill-opacity=".85"/><rect x="10.1" y="10.6" width="3.8" height="2.3" rx="1.15"/>`,
  droplet: `<path d="M12 3.4c3.6 4.35 5.7 7.3 5.7 9.95a5.7 5.7 0 0 1-11.4 0c0-2.65 2.1-5.6 5.7-9.95z"/><path d="M8.3 13.9a3.7 3.7 0 0 0 2.75 3.55" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".5"/>`,
  poop: `<path d="M7.5 20h9a2.6 2.6 0 0 0 .6-5.1 2.5 2.5 0 0 0-1.75-3.95A2.2 2.2 0 0 0 13.7 8 2.1 2.1 0 0 0 12 5.1 2.1 2.1 0 0 0 10.3 8a2.2 2.2 0 0 0-1.85 3.35A2.5 2.5 0 0 0 6.9 14.9 2.6 2.6 0 0 0 7.5 20z"/><path d="M9.3 12.5c1 .55 3.4.55 4.4 0M8.4 16.3c1.95.85 5.2.85 7.1 0" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".5"/>`,
  moon: `<path d="M20.2 14.4A8.2 8.2 0 0 1 9.75 3.95a8.2 8.2 0 1 0 10.45 10.45z"/><path d="M16.6 5.6l.5 1.05 1.05.5-1.05.5-.5 1.05-.5-1.05-1.05-.5 1.05-.5z"/>`,
  napend: `<circle cx="12" cy="13" r="6.6" fill-opacity=".4"/><circle cx="12" cy="13" r="6.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 9.4V13l2.3 1.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M4.9 5l1.9-1.6M19.1 5l-1.9-1.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,
  moonstars: `<path d="M20.2 14.4A8.2 8.2 0 0 1 9.75 3.95a7 7 0 0 0-1 .1A8.2 8.2 0 1 0 20.2 14.4z"/><path d="M17 3.6l.65 1.4 1.4.65-1.4.65-.65 1.4-.65-1.4-1.4-.65 1.4-.65z"/><circle cx="20.3" cy="8.4" r=".7"/>`,
  thermometer: `<path d="M12 3.6a2 2 0 0 0-2 2v8.5a3.5 3.5 0 1 0 4 0V5.6a2 2 0 0 0-2-2z" fill-opacity=".4"/><path d="M12 3.6a2 2 0 0 0-2 2v8.5a3.5 3.5 0 1 0 4 0V5.6a2 2 0 0 0-2-2z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="17.3" r="1.9"/><path d="M12 8.5v6.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  pulse: `<path d="M12.9 5.4a5 5 0 0 1 7.4 6.7l-7 7.3a1.9 1.9 0 0 1-2.6 0l-7-7.3a5 5 0 0 1 7.4-6.7l.9.95z" fill-opacity=".35"/><path d="M3 12.4h3.4l1.7-3.9 2.4 6.6 1.7-3.9h4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  book: `<path d="M12 6.6c-1.6-1.1-4-1.5-6.3-1.5a.7.7 0 0 0-.7.7v11.3c0 .4.3.7.7.7 2.3 0 4.7.4 6.3 1.5z" fill-opacity=".45"/><path d="M12 6.6c1.6-1.1 4-1.5 6.3-1.5.4 0 .7.3.7.7v11.3a.7.7 0 0 1-.7.7c-2.3 0-4.7.4-6.3 1.5z" fill-opacity=".8"/><path d="M12 6.6v12.4" stroke="currentColor" stroke-width="1.3" opacity=".5"/>`,
  bookmark: `<path d="M6.6 4.3h10.8a.6.6 0 0 1 .6.6v14.9l-6-4.3-6 4.3V4.9a.6.6 0 0 1 .6-.6z"/>`,
  calendar: `<rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6" fill-opacity=".35"/><rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.6 9.6h16.8" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8.2 3.4v3.6M15.8 3.4v3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8.3" cy="13.6" r="1.1"/><circle cx="12" cy="13.6" r="1.1"/><circle cx="15.7" cy="13.6" r="1.1"/><circle cx="8.3" cy="17.2" r="1.1"/><circle cx="12" cy="17.2" r="1.1"/>`,
  calcheck: `<rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6" fill-opacity=".35"/><rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.6 9.6h16.8" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8.2 3.4v3.6M15.8 3.4v3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.3 14.5l2.2 2.2 4.6-4.7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  chart: `<path d="M4 20V4M4 20h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="6.3" y="13.5" width="2.8" height="5" rx="1" fill-opacity=".55"/><rect x="10.6" y="9.5" width="2.8" height="9" rx="1" fill-opacity=".78"/><rect x="14.9" y="6" width="2.8" height="12.5" rx="1"/>`,
  plus: `<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" fill="none"/>`,
  clock: `<circle cx="12" cy="12" r="8.2" fill-opacity=".35"/><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7.6V12l3.1 1.85" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  chevL: `<path d="M14.5 6l-6 6 6 6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  chevR: `<path d="M9.5 6l6 6-6 6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  dots: `<circle cx="5.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/>`,
  cloud: `<path d="M7.4 18.4h9.6a3.6 3.6 0 0 0 .3-7.2 5.2 5.2 0 0 0-10.1-1.6 3.9 3.9 0 0 0 .2 8.8z" fill-opacity=".45"/><path d="M7.4 18.4h9.6a3.6 3.6 0 0 0 .3-7.2 5.2 5.2 0 0 0-10.1-1.6 3.9 3.9 0 0 0 .2 8.8z" fill="none" stroke="currentColor" stroke-width="1.4"/>`,
  bell: `<path d="M6 16.2h12l-1.4-2.1V10.3a4.8 4.8 0 0 0-9.6 0v3.8z" fill-opacity=".4"/><path d="M6 16.2h12l-1.4-2.1V10.3a4.8 4.8 0 0 0-9.6 0v3.8z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 19.2a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  device: `<rect x="6.8" y="3.4" width="10.4" height="17.2" rx="2.4" fill-opacity=".35"/><rect x="6.8" y="3.4" width="10.4" height="17.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.7 17.5h2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  download: `<path d="M12 3.6v10.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M7.8 10.4l4.2 4.2 4.2-4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="4.6" y="18.4" width="14.8" height="2.2" rx="1.1"/>`,
  upload: `<path d="M12 20.4V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M7.8 13.6L12 9.4l4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="4.6" y="3.4" width="14.8" height="2.2" rx="1.1"/>`,
  trash: `<path d="M5 7h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M7.2 7.6l.85 11.4A1.6 1.6 0 0 0 9.65 20.4h4.7a1.6 1.6 0 0 0 1.6-1.4l.85-11.4z" fill-opacity=".45"/>`,
  dot: `<circle cx="12" cy="12" r="2.5"/>`,
};
function svgIcon(name, cls = "") {
  const p = ICONS[name] || ICONS.dot;
  return `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((e) => {
    e.innerHTML = svgIcon(e.dataset.icon);
  });
}

/* ----------------------------- Definição de eventos ---------------------- */
const EVENT_TYPES = {
  wake_morning: { label: "Acordou", ic: "sunrise", cat: "wake" },
  milk: { label: "Comeu — Leite", ic: "bottle", cat: "food", needsAmount: true },
  snack: { label: "Comeu — Lanche", ic: "cookie", cat: "food" },
  lunch: { label: "Comeu — Almoço", ic: "utensils", cat: "food" },
  dinner: { label: "Comeu — Jantar", ic: "bowl", cat: "food" },
  diaper_poop: { label: "Fralda com cocô", ic: "poop", cat: "diaper" },
  diaper_wet: { label: "Troca sem cocô", ic: "droplet", cat: "diaper" },
  nap_start: { label: "Dormiu (soneca)", ic: "moon", cat: "nap" },
  nap_end: { label: "Acordou (soneca)", ic: "napend", cat: "nap" },
  night_start: { label: "Dormiu (noite)", ic: "moonstars", cat: "night" },
  sick: { label: "Doente", ic: "thermometer", cat: "sick" },
  appt_medical: { label: "Consulta médica", ic: "pulse", cat: "appt" },
  appt_class: { label: "Aula", ic: "book", cat: "appt" },
  appt_other: { label: "Compromisso", ic: "bookmark", cat: "appt" },
};

/* Refeições sólidas unificadas no botão "Comida". */
const FOOD_TYPES = ["snack", "lunch", "dinner"];
const isFoodSolid = (type) => FOOD_TYPES.includes(type);

/* Tipos de compromisso (aba Agenda). */
const APPT_TYPES = ["appt_medical", "appt_class", "appt_other"];
const isAppt = (type) => APPT_TYPES.includes(type);

/* No editor, "fralda" é um único tipo com um toggle cocô/sem cocô, que mapeia
   para os tipos reais diaper_poop / diaper_wet ao salvar. */
const KIND_META = {
  wake_morning: { ic: "sunrise", label: "Acordou" },
  milk: { ic: "bottle", label: "Leite" },
  snack: { ic: "cookie", label: "Lanche" },
  lunch: { ic: "utensils", label: "Almoço" },
  dinner: { ic: "bowl", label: "Jantar" },
  diaper: { ic: "diaper", label: "Fralda" },
  nap_start: { ic: "moon", label: "Dormiu (soneca)" },
  nap_end: { ic: "napend", label: "Acordou (soneca)" },
  night_start: { ic: "moonstars", label: "Dormiu (noite)" },
  sick: { ic: "thermometer", label: "Doente" },
};
const EDITOR_KINDS = [
  "wake_morning",
  "milk",
  "snack",
  "lunch",
  "dinner",
  "diaper",
  "nap_start",
  "nap_end",
  "night_start",
  "sick",
];
const kindOf = (type) => (type === "diaper_poop" || type === "diaper_wet" ? "diaper" : type);
const resolveType = (kind, poop) =>
  kind === "diaper" ? (poop ? "diaper_poop" : "diaper_wet") : kind;

// Ordem/exibição dos botões. Se o total for ímpar, o último tile fica sozinho
// na linha e ocupa a largura inteira automaticamente (ver CSS `.btn-grid`).
// O item `food` é sintético: abre o seletor de refeição (lanche/almoço/jantar).
const BUTTON_LAYOUT = [
  { type: "wake_morning" },
  { type: "milk" },
  { type: "food", food: true, label: "Comida", ic: "utensils", cat: "food" },
  { type: "diaper_wet" },
  { type: "diaper_poop" },
  { type: "nap_start" },
  { type: "nap_end" },
  { type: "night_start" },
  { type: "sick" },
];

/* =========================================================================
   STORE — persistência local (localStorage) + preparado para sync.
   ========================================================================= */
let onEventWrite = null;

const STORE = (() => {
  const KEY = "baby-diary-events-v1";
  const _read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  };
  const _write = (list) => localStorage.setItem(KEY, JSON.stringify(list));
  const _emit = (evt) => {
    if (evt && onEventWrite) {
      try {
        onEventWrite(evt);
      } catch {
        /* offline */
      }
    }
  };

  return {
    _raw() {
      return _read();
    },
    all() {
      return _read()
        .filter((e) => !e.deleted)
        .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    },
    add(type, extra = {}) {
      const evt = {
        id: newId(),
        type,
        ts: new Date().toISOString(),
        updatedAt: Date.now(),
        ...extra,
      };
      const list = _read();
      list.push(evt);
      _write(list);
      _emit(evt);
      return evt;
    },
    put(evt) {
      evt = { ...evt, updatedAt: Date.now() };
      const list = _read();
      const i = list.findIndex((e) => e.id === evt.id);
      if (i >= 0) list[i] = evt;
      else list.push(evt);
      _write(list);
      _emit(evt);
      return evt;
    },
    update(id, patch) {
      const list = _read();
      const i = list.findIndex((e) => e.id === id);
      if (i >= 0) {
        list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
        _write(list);
        _emit(list[i]);
      }
    },
    remove(id) {
      const list = _read();
      const i = list.findIndex((e) => e.id === id);
      if (i >= 0) {
        list[i] = { ...list[i], deleted: true, updatedAt: Date.now() };
        _write(list);
        _emit(list[i]);
      }
    },
    replaceAll(list) {
      const stamped = list.map((e) => ({ ...e, updatedAt: e.updatedAt || Date.now() }));
      _write(stamped);
      stamped.forEach(_emit);
    },
    mergeRemote(remote) {
      const res = mergeRemoteFn(_read(), remote);
      if (res.changed) _write(res.list);
      return res.changed;
    },
    babyEvents() {
      return this.all().filter((e) => !isAppt(e.type));
    },
    appointments() {
      return this.all().filter((e) => isAppt(e.type));
    },
    forDay(dateKey) {
      return this.babyEvents().filter((e) => dayKey(new Date(e.ts)) === dateKey);
    },
  };
})();

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

/* Configurações do app (lembretes etc.) */
const SETTINGS = {
  KEY: "baby-diary-settings",
  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || {};
    } catch {
      return {};
    }
  },
  set(patch) {
    localStorage.setItem(this.KEY, JSON.stringify({ ...this.get(), ...patch }));
  },
};

/* ===================== Lembrete de leite (3h) ===================== */
/* Regras puras em src/domain/reminder.js (isNightSleeping, milkReminderState). */
const remindersOn = () => SETTINGS.get().remindersEnabled !== false;

function refreshReminder() {
  const banner = el("#reminder-banner");
  if (!remindersOn()) {
    banner.hidden = true;
    return;
  }
  const st = milkReminderState(STORE.babyEvents());
  if (st.active) {
    banner.hidden = false;
    banner.querySelector(".rb-text").textContent =
      `Faz ${fmtDuration(st.elapsed)} desde o último leite`;
    maybeNotify(st);
  } else {
    banner.hidden = true;
  }
}

async function maybeNotify(st) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (SETTINGS.get().lastNotifiedMilkTs === st.lastTs) return;
  SETTINGS.set({ lastNotifiedMilkTs: st.lastTs });
  const title = "Hora do leite?";
  const opts = {
    body: `Faz ${fmtDuration(st.elapsed)} desde a última mamada.`,
    tag: "milk-reminder",
    icon: "icon.svg",
    badge: "icon.svg",
    data: { url: "./index.html" },
  };
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* fallback */
  }
  try {
    new Notification(title, opts);
  } catch {
    /* banner cobre */
  }
}

/* ------------------------------ Utilidades ------------------------------- */
/* dayKey e fmtDuration importados de src/domain/time.js. */
const fmtTime = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const escapeHtml = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* buildIntervals e summaryForDay importados de src/domain/summary.js
   (agora recebem os eventos como argumento em vez de ler o STORE). */

/* =========================================================================
   UI
   ========================================================================= */
const el = (sel) => document.querySelector(sel);
let currentDay = null;
let currentRange = 7;

function afterMutation() {
  refreshToday();
  refreshReminder();
  renderCalendar();
  if (currentDay && !el("#day-modal").hidden) openDay(currentDay.key, currentDay.date, true);
  if (el("#view-trends").classList.contains("active")) renderTrends(currentRange);
  if (el("#view-agenda").classList.contains("active")) renderAgenda();
}

/* -------- Botões de evento -------- */
function renderButtons() {
  const grid = el("#btn-grid");
  grid.innerHTML = "";
  for (const item of BUTTON_LAYOUT) {
    const def = item.food ? item : EVENT_TYPES[item.type];
    const btn = document.createElement("button");
    btn.className = "evt-btn";
    btn.innerHTML = `<span class="evt-chip chip-${def.cat}">${svgIcon(def.ic)}</span><span class="evt-lbl">${def.label}</span>`;
    btn.addEventListener("click", () => (item.food ? openFoodModal() : onLog(item.type)));
    grid.appendChild(btn);
  }
}
function onLog(type) {
  const def = EVENT_TYPES[type];
  if (def.needsAmount) {
    openMilkModal((ml) => {
      STORE.add(type, { amountMl: ml });
      toast(`Leite · ${ml} ml`);
      afterMutation();
    });
    return;
  }
  STORE.add(type);
  toast(`${def.label} registrado`);
  afterMutation();
}

/* -------- Resumo de hoje -------- */
function refreshToday() {
  const s = summaryForDay(STORE.babyEvents(), dayKey(new Date()));
  el("#today-summary").innerHTML = `
    <div class="stat"><span class="stat-ico chip-food">${svgIcon("bottle")}</span><div class="stat-val">${s.milkMl}<small> ml</small></div><div class="stat-lbl">Leite · ${s.milkCount}x</div></div>
    <div class="stat"><span class="stat-ico chip-nap">${svgIcon("moon")}</span><div class="stat-val">${fmtDuration(s.napMs)}</div><div class="stat-lbl">Sonecas · ${s.napCount}x</div></div>
    <div class="stat"><span class="stat-ico chip-night">${svgIcon("moonstars")}</span><div class="stat-val">${fmtDuration(s.nightMs)}</div><div class="stat-lbl">Sono noite</div></div>
  `;
  el("#header-sub").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* =========================== Modal de leite ============================== */
let milkOnSave = null;
function openMilkModal(cb) {
  milkOnSave = cb;
  setMilk(120);
  el("#milk-modal").hidden = false;
}
function setMilk(v) {
  v = Math.max(0, Number(v) || 0);
  el("#milk-input").value = v;
  el("#milk-amount").textContent = v;
}
function initMilkModal() {
  const modal = el("#milk-modal");
  el("#milk-input").addEventListener(
    "input",
    (e) => (el("#milk-amount").textContent = Math.max(0, Number(e.target.value) || 0))
  );
  modal
    .querySelectorAll(".milk-stepper button")
    .forEach((b) =>
      b.addEventListener("click", () =>
        setMilk(Number(el("#milk-input").value) + Number(b.dataset.step))
      )
    );
  modal
    .querySelectorAll(".milk-presets button")
    .forEach((b) => b.addEventListener("click", () => setMilk(b.dataset.ml)));
  el("#milk-cancel").addEventListener("click", () => (modal.hidden = true));
  el("#milk-save").addEventListener("click", () => {
    const ml = Math.max(0, Number(el("#milk-input").value) || 0);
    modal.hidden = true;
    if (milkOnSave) milkOnSave(ml);
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
}

/* =========================== Modal de comida ============================= */
let foodType = "lunch";
function openFoodModal() {
  foodType = "lunch";
  el("#food-note").value = "";
  updateFoodSeg();
  el("#food-modal").hidden = false;
}
function updateFoodSeg() {
  document
    .querySelectorAll("#food-seg button")
    .forEach((b) => b.classList.toggle("active", b.dataset.type === foodType));
}
function initFoodModal() {
  const modal = el("#food-modal");
  el("#food-seg")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        foodType = b.dataset.type;
        updateFoodSeg();
      })
    );
  el("#food-cancel").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
  el("#food-save").addEventListener("click", () => {
    const note = el("#food-note").value.trim();
    STORE.add(foodType, note ? { note } : {});
    modal.hidden = true;
    toast(`${KIND_META[foodType].label} registrado`);
    afterMutation();
  });
}

/* ==================== Modal de edição/criação de evento ================== */
let editingId = null,
  edKind = "milk",
  edPoop = true;

function openEventEditor(opts = {}) {
  editingId = opts.id || null;
  const type = opts.type || "milk";
  edPoop = type === "diaper_wet" ? false : true;
  el("#event-time").value = toLocalInput(opts.ts || new Date());
  el("#event-milk").value = opts.amountMl != null ? opts.amountMl : 120;
  el("#event-note").value = opts.note != null ? opts.note : "";
  el("#event-modal-title").textContent = editingId ? "Editar registro" : "Novo registro";
  el("#event-delete").hidden = !editingId;
  selectKind(kindOf(type));
  el("#event-modal").hidden = false;
  el("#event-modal .modal").scrollTop = 0;
}

function selectKind(kind) {
  edKind = kind;
  document
    .querySelectorAll("#kind-grid .kind-chip")
    .forEach((c) => c.classList.toggle("active", c.dataset.kind === kind));
  el("#event-milk-field").hidden = kind !== "milk";
  el("#event-note-field").hidden = !isFoodSolid(kind);
  el("#event-diaper-field").hidden = kind !== "diaper";
  updateDiaperSeg();
}
function updateDiaperSeg() {
  document
    .querySelectorAll("#diaper-seg button")
    .forEach((b) => b.classList.toggle("active", (b.dataset.poop === "1") === edPoop));
}

function initEventEditor() {
  const grid = el("#kind-grid");
  grid.innerHTML = EDITOR_KINDS.map((k) => {
    const m = KIND_META[k];
    return `<button type="button" class="kind-chip" data-kind="${k}"><span class="kc-ico">${svgIcon(m.ic)}</span><span class="kc-lbl">${m.label}</span></button>`;
  }).join("");
  grid
    .querySelectorAll(".kind-chip")
    .forEach((c) => c.addEventListener("click", () => selectKind(c.dataset.kind)));

  el("#event-milk-presets")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        el("#event-milk").value = b.dataset.ml;
      })
    );
  el("#diaper-seg")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        edPoop = b.dataset.poop === "1";
        updateDiaperSeg();
      })
    );

  const modal = el("#event-modal");
  const close = () => (modal.hidden = true);
  el("#event-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  el("#event-save").addEventListener("click", () => {
    const raw = el("#event-time").value;
    const ts = new Date(raw);
    if (!raw || isNaN(ts)) {
      alert("Informe uma data e hora válidas.");
      return;
    }
    const type = resolveType(edKind, edPoop);
    const evt = { id: editingId || newId(), type, ts: ts.toISOString() };
    if (edKind === "milk") evt.amountMl = Math.max(0, Number(el("#event-milk").value) || 0);
    if (isFoodSolid(edKind)) {
      const n = el("#event-note").value.trim();
      if (n) evt.note = n;
    }
    STORE.put(evt);
    close();
    toast("Registro salvo");
    afterMutation();
  });

  el("#event-delete").addEventListener("click", () => {
    if (editingId && confirm("Excluir este registro?")) {
      STORE.remove(editingId);
      close();
      afterMutation();
    }
  });

  el("#quick-add").addEventListener("click", () =>
    openEventEditor({ ts: new Date(), type: "milk" })
  );
}

/* ============================== Calendário =============================== */
let calYear, calMonth;
function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  el("#cal-prev").addEventListener("click", () => shiftMonth(-1));
  el("#cal-next").addEventListener("click", () => shiftMonth(1));
}
function shiftMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  renderCalendar();
}
const CAT_COLOR = {
  wake: "var(--c-wake)",
  food: "var(--c-food)",
  diaper: "var(--c-diaper)",
  nap: "var(--c-nap)",
  night: "var(--c-night)",
  sick: "var(--c-sick)",
};
function renderCalendar() {
  el("#cal-title").textContent = new Date(calYear, calMonth, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const grid = el("#cal-grid");
  grid.innerHTML = "";
  const startWeekday = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  for (let i = 0; i < startWeekday; i++) {
    const c = document.createElement("div");
    c.className = "cal-cell empty";
    grid.appendChild(c);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const key = dayKey(date);
    const evts = STORE.forDay(key);
    const cell = document.createElement("div");
    cell.className = "cal-cell" + (key === todayKey ? " today" : "");
    const cats = [...new Set(evts.map((e) => EVENT_TYPES[e.type]?.cat).filter(Boolean))];
    const dots = cats
      .slice(0, 6)
      .map((c) => `<span class="cal-dot" style="background:${CAT_COLOR[c]}"></span>`)
      .join("");
    cell.innerHTML = `<span class="cal-day">${d}</span>${evts.length ? `<span class="cal-count">${evts.length}</span>` : ""}<span class="cal-dots">${dots}</span>`;
    cell.addEventListener("click", () => openDay(key, date));
    grid.appendChild(cell);
  }
}

/* ============================ Log de um dia ============================== */
function openDay(key, date, keepScroll = false) {
  currentDay = { key, date };
  const tl = el("#day-timeline");
  const prevScroll = keepScroll ? el("#day-modal .modal-day").scrollTop : 0;

  const s = summaryForDay(STORE.babyEvents(), key);
  el("#day-title").textContent = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  el("#day-summary").innerHTML = `
    <div class="sum-item"><b>${s.milkMl} ml</b><span>Leite · ${s.milkCount} mamadas</span></div>
    <div class="sum-item"><b>${fmtDuration(s.napMs)}</b><span>Sonecas · ${s.napCount}x</span></div>
    <div class="sum-item"><b>${fmtDuration(s.nightMs)}</b><span>Sono noturno</span></div>
    <div class="sum-item"><b>${s.diapers}</b><span>Trocas · ${s.poops} c/ cocô</span></div>
  `;

  if (!s.events.length) {
    tl.innerHTML = `<div class="day-empty">Nenhum registro neste dia.</div>`;
  } else {
    tl.innerHTML = s.events
      .map((e) => {
        const def = EVENT_TYPES[e.type] || { label: e.type, ic: "dot", cat: "" };
        let extra = "";
        if (e.type === "milk" && e.amountMl != null) extra = `<small>${e.amountMl} ml</small>`;
        else if (isFoodSolid(e.type) && e.note) extra = `<small>${escapeHtml(e.note)}</small>`;
        return `
        <button class="tl-item" data-id="${e.id}">
          <span class="tl-time">${fmtTime(new Date(e.ts))}</span>
          <span class="tl-ico chip-${def.cat}">${svgIcon(def.ic)}</span>
          <span class="tl-label">${def.label}${extra}</span>
          <span class="tl-edit">${svgIcon("chevR")}</span>
        </button>`;
      })
      .join("");
    tl.querySelectorAll(".tl-item").forEach((row) =>
      row.addEventListener("click", () => {
        const e = STORE.all().find((x) => x.id === row.dataset.id);
        if (e)
          openEventEditor({
            id: e.id,
            type: e.type,
            ts: new Date(e.ts),
            amountMl: e.amountMl,
            note: e.note,
          });
      })
    );
  }

  el("#day-modal").hidden = false;
  if (keepScroll) el("#day-modal .modal-day").scrollTop = prevScroll;
}
function initDayModal() {
  const modal = el("#day-modal");
  el("#day-close").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
  el("#day-add").addEventListener("click", () => {
    const base = new Date(currentDay.date);
    const now = new Date();
    base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    openEventEditor({ ts: base, type: "milk" });
  });
}

/* ============================== Agenda ================================== */
let apptEditingId = null,
  apptType = "appt_medical",
  apptOriginalAttachment = null, // anexo como veio do evento ao abrir o editor (p/ apagar do Storage se substituído/removido)
  apptAttachment = null; // anexo atual desejado ao salvar (null = nenhum)

function renderApptAttachmentPreview() {
  const box = el("#appt-attach-preview");
  const thumb = el("#appt-attach-thumb");
  const name = el("#appt-attach-name");
  const open = el("#appt-attach-open");
  if (!apptAttachment) {
    box.hidden = true;
    thumb.hidden = true;
    return;
  }
  box.hidden = false;
  thumb.hidden = !apptAttachment.type.startsWith("image/");
  if (!thumb.hidden) thumb.src = apptAttachment.url;
  name.textContent = apptAttachment.name;
  open.hidden = !apptAttachment.path;
  if (apptAttachment.path) open.href = apptAttachment.url;
}

function renderAgenda() {
  const list = el("#agenda-list");
  const all = STORE.appointments();
  if (!all.length) {
    list.innerHTML = `<div class="day-empty">Nenhum compromisso ainda.<br>Toque em “Novo compromisso” para adicionar consultas, aulas e outros.</div>`;
    return;
  }
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const st = startToday.getTime();
  const upcoming = all.filter((e) => new Date(e.ts).getTime() >= st);
  const past = all.filter((e) => new Date(e.ts).getTime() < st).reverse();

  const card = (e, isPast) => {
    const def = EVENT_TYPES[e.type] || { ic: "bookmark", label: "Compromisso" };
    const d = new Date(e.ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const when =
      d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) +
      " · " +
      fmtTime(d);
    const meta = e.note ? `${when} · ${escapeHtml(e.note)}` : when;
    const attach = e.attachment
      ? `<span class="appt-attach-badge" data-url="${escapeHtml(e.attachment.url)}">${
          e.attachment.type.startsWith("image/")
            ? `<img src="${escapeHtml(e.attachment.url)}" alt="" />`
            : "PDF"
        }</span>`
      : "";
    return `
      <button class="appt-card${isPast ? " past" : ""}" data-id="${e.id}">
        <span class="appt-date"><span class="ad-day">${dd}</span><span class="ad-mon">${mon}</span></span>
        <span class="appt-body"><b>${escapeHtml(e.title || def.label)}</b><span class="appt-meta">${meta}</span></span>
        <span class="appt-ico chip-appt">${svgIcon(def.ic)}</span>
        ${attach}
      </button>`;
  };

  let html = "";
  if (upcoming.length)
    html +=
      `<div class="agenda-group-title">Próximos</div>` +
      upcoming.map((e) => card(e, false)).join("");
  if (past.length)
    html +=
      `<div class="agenda-group-title">Anteriores</div>` + past.map((e) => card(e, true)).join("");
  list.innerHTML = html;

  list.querySelectorAll(".appt-card").forEach((row) =>
    row.addEventListener("click", () => {
      const e = STORE.all().find((x) => x.id === row.dataset.id);
      if (e)
        openApptEditor({
          id: e.id,
          type: e.type,
          ts: new Date(e.ts),
          title: e.title,
          note: e.note,
          attachment: e.attachment,
        });
    })
  );

  list.querySelectorAll(".appt-attach-badge").forEach((badge) =>
    badge.addEventListener("click", (ev) => {
      ev.stopPropagation();
      window.open(badge.dataset.url, "_blank", "noopener");
    })
  );
}

function openApptEditor(opts = {}) {
  apptEditingId = opts.id || null;
  apptType = opts.type || "appt_medical";
  apptOriginalAttachment = opts.attachment || null;
  apptAttachment = opts.attachment || null;
  el("#appt-title").value = opts.title || "";
  el("#appt-note").value = opts.note || "";
  el("#appt-time").value = toLocalInput(opts.ts || nextHour());
  el("#appt-modal-title").textContent = apptEditingId ? "Editar compromisso" : "Novo compromisso";
  el("#appt-delete").hidden = !apptEditingId;
  el("#appt-attach-input").value = "";
  renderApptAttachmentPreview();
  updateApptSeg();
  el("#appt-modal").hidden = false;
  el("#appt-modal .modal").scrollTop = 0;
}
function nextHour() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}
function updateApptSeg() {
  document
    .querySelectorAll("#appt-seg button")
    .forEach((b) => b.classList.toggle("active", b.dataset.type === apptType));
}
function initAgenda() {
  el("#agenda-add").addEventListener("click", () => openApptEditor());

  const modal = el("#appt-modal");
  const close = () => (modal.hidden = true);
  el("#appt-seg")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        apptType = b.dataset.type;
        updateApptSeg();
      })
    );
  el("#appt-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  el("#appt-attach-input").addEventListener("change", () => {
    const file = el("#appt-attach-input").files[0];
    if (!file) return;
    const check = validateAttachment(file);
    if (!check.valid) {
      alert(
        check.reason === "too-large"
          ? "Arquivo muito grande (máximo 5MB)."
          : "Tipo de arquivo não suportado (use foto ou PDF)."
      );
      el("#appt-attach-input").value = "";
      return;
    }
    apptAttachment = {
      path: null, // só é definido depois do upload, ao salvar
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      name: file.name,
      type: file.type,
      size: file.size,
    };
    renderApptAttachmentPreview();
  });

  el("#appt-attach-remove").addEventListener("click", () => {
    apptAttachment = null;
    el("#appt-attach-input").value = "";
    renderApptAttachmentPreview();
  });

  el("#appt-save").addEventListener("click", async () => {
    const raw = el("#appt-time").value;
    const ts = new Date(raw);
    if (!raw || isNaN(ts)) {
      alert("Informe uma data e hora válidas.");
      return;
    }
    const title = el("#appt-title").value.trim();
    if (!title) {
      alert("Dê um título ao compromisso.");
      return;
    }
    const note = el("#appt-note").value.trim();
    const file = el("#appt-attach-input").files[0];

    let uploadSkipped = false;
    if (file) {
      const check = validateAttachment(file);
      if (!check.valid) {
        alert(
          check.reason === "too-large"
            ? "Arquivo muito grande (máximo 5MB)."
            : "Tipo de arquivo não suportado (use foto ou PDF)."
        );
        return;
      }
      if (!Cloud.online || !Cloud.enabled || !Cloud.uid) {
        uploadSkipped = true;
      }
    }

    const evt = { id: apptEditingId || newId(), type: apptType, ts: ts.toISOString(), title };
    if (note) evt.note = note;

    el("#appt-save").disabled = true;
    try {
      if (file && !uploadSkipped) {
        evt.attachment = await Cloud.uploadAttachment(evt.id, file);
        if (apptOriginalAttachment && apptOriginalAttachment.path !== evt.attachment.path) {
          Cloud.deleteAttachment(apptOriginalAttachment.path);
        }
      } else if (file && uploadSkipped) {
        // upload não pôde ser feito (offline): preserva o anexo já existente, se houver,
        // e nunca persiste o objeto de preview local (apptAttachment com path: null).
        if (apptOriginalAttachment) evt.attachment = apptOriginalAttachment;
      } else if (apptAttachment) {
        evt.attachment = apptAttachment;
      } else if (apptOriginalAttachment) {
        Cloud.deleteAttachment(apptOriginalAttachment.path);
      }
      STORE.put(evt);
      close();
      toast(
        uploadSkipped ? "Compromisso salvo — anexo não enviado (sem conexão)" : "Compromisso salvo"
      );
      afterMutation();
    } catch (e) {
      console.warn("appt attachment:", e);
      alert("Não deu para salvar o anexo: " + (e && e.message ? e.message : e));
    } finally {
      el("#appt-save").disabled = false;
    }
  });

  el("#appt-delete").addEventListener("click", () => {
    if (apptEditingId && confirm("Excluir este compromisso?")) {
      if (apptOriginalAttachment) Cloud.deleteAttachment(apptOriginalAttachment.path);
      STORE.remove(apptEditingId);
      close();
      afterMutation();
    }
  });
}

/* ============================== Tendências =============================== */
/* seriesForRange e activeAvg importados de src/domain/trends.js. */

function barChartSVG(series, valueFn, color, avg) {
  const vals = series.map(valueFn);
  const n = series.length;
  const maxV = Math.max(...vals, 0);
  const niceMax = maxV > 0 ? maxV : 1;
  const W = 300,
    H = 140,
    padX = 6,
    padTop = 16,
    padBottom = 20;
  const innerW = W - padX * 2;
  const chartH = H - padTop - padBottom;
  const colW = innerW / n;
  const showVals = n <= 10;
  const showEvery = n <= 14 ? 1 : Math.ceil(n / 8);

  let bars = "",
    labels = "";
  series.forEach((d, i) => {
    const v = vals[i];
    const bh = (v / niceMax) * chartH;
    const cx = padX + i * colW + colW / 2;
    const bw = Math.min(colW * 0.62, 26);
    const by = padTop + (chartH - bh);
    if (v > 0)
      bars += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${color}"/>`;
    if (showVals && v > 0)
      bars += `<text class="bar-val" x="${cx.toFixed(1)}" y="${(by - 3).toFixed(1)}">${fmtBarVal(v)}</text>`;
    if (i % showEvery === 0)
      labels += `<text class="bar-lbl" x="${cx.toFixed(1)}" y="${H - 6}">${d.date.getDate()}</text>`;
  });

  const avgY = padTop + (chartH - (avg / niceMax) * chartH);
  const avgLine =
    avg > 0
      ? `<line x1="${padX}" y1="${avgY.toFixed(1)}" x2="${W - padX}" y2="${avgY.toFixed(1)}" class="avg-line"/>`
      : "";

  return `<svg viewBox="0 0 ${W} ${H}" class="bar-chart" preserveAspectRatio="xMidYMid meet">${avgLine}${bars}${labels}</svg>`;
}
function fmtBarVal(v) {
  return v >= 10 ? String(Math.round(v)) : Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function renderTrends(days) {
  currentRange = days;
  const series = seriesForRange(STORE.babyEvents(), days);
  const hasData = series.some(
    (d) => d.milkMl || d.milkCount || d.napMs || d.napCount || d.nightMs || d.diapers || d.poops
  );

  const cards = [
    {
      title: "Leite por dia",
      color: "var(--c-food)",
      val: (d) => d.milkMl,
      fmtAvg: (v) => `média ${Math.round(v)} ml/dia`,
    },
    {
      title: "Mamadas por dia",
      color: "var(--c-food)",
      val: (d) => d.milkCount,
      fmtAvg: (v) => `média ${v.toFixed(1)}×/dia`,
    },
    {
      title: "Sonecas — tempo",
      color: "var(--c-nap)",
      val: (d) => d.napMs / 3600000,
      fmtAvg: (v) => `média ${fmtDuration(v * 3600000)}/dia`,
    },
    {
      title: "Sonecas — quantidade",
      color: "var(--c-nap)",
      val: (d) => d.napCount,
      fmtAvg: (v) => `média ${v.toFixed(1)}×/dia`,
    },
    {
      title: "Sono noturno — tempo",
      color: "var(--c-night)",
      val: (d) => d.nightMs / 3600000,
      fmtAvg: (v) => `média ${fmtDuration(v * 3600000)}/dia`,
    },
    {
      title: "Trocas de fralda por dia",
      color: "var(--c-diaper)",
      val: (d) => d.diapers,
      fmtAvg: (v) => `média ${v.toFixed(1)}×/dia`,
    },
    {
      title: "Cocô por dia",
      color: "var(--c-diaper)",
      val: (d) => d.poops,
      fmtAvg: (v) => `média ${v.toFixed(1)}×/dia`,
    },
  ];

  const wrap = el("#charts");
  if (!hasData) {
    wrap.innerHTML = `<div class="day-empty">Sem dados neste período.<br>Registre eventos para ver as tendências.</div>`;
    return;
  }
  wrap.innerHTML = cards
    .map((c) => {
      const avg = activeAvg(series, c.val);
      const activeDays = series.map(c.val).filter((v) => v > 0).length;
      const avgText =
        avg > 0 ? `${c.fmtAvg(avg)} · ${activeDays} ${activeDays === 1 ? "dia" : "dias"}` : "—";
      return `
    <div class="chart-card">
      <div class="chart-head"><h3>${c.title}</h3><span class="chart-avg">${avgText}</span></div>
      ${barChartSVG(series, c.val, c.color, avg)}
    </div>`;
    })
    .join("");
}
function initTrends() {
  el("#range-toggle")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        el("#range-toggle")
          .querySelectorAll("button")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        renderTrends(Number(b.dataset.days));
      })
    );
}

/* ============================== Menu / Backup =========================== */
function updateMenuLabels() {
  el("#menu-reminders .mi-tx").textContent =
    `Lembretes de leite: ${remindersOn() ? "Ativados" : "Desativados"}`;
  let txt = "Permitir notificações";
  if (!("Notification" in window)) txt = "Notificações indisponíveis";
  else if (Notification.permission === "granted") txt = "Notificações permitidas";
  else if (Notification.permission === "denied") txt = "Notificações bloqueadas";
  el("#menu-notify .mi-tx").textContent = txt;
}
function initMenu() {
  const modal = el("#menu-modal");
  el("#menu-btn").addEventListener("click", () => {
    updateMenuLabels();
    modal.hidden = false;
  });
  el("#menu-close").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  el("#menu-reminders").addEventListener("click", () => {
    SETTINGS.set({ remindersEnabled: !remindersOn() });
    updateMenuLabels();
    refreshReminder();
    toast(remindersOn() ? "Lembretes ativados" : "Lembretes desativados");
  });
  el("#menu-notify").addEventListener("click", () => {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }
    if (Notification.permission === "granted") {
      toast("Notificações já estão permitidas");
      return;
    }
    if (Notification.permission === "denied") {
      alert(
        "As notificações estão bloqueadas. Reative nas configurações do navegador para este site."
      );
      return;
    }
    Notification.requestPermission().then(() => {
      updateMenuLabels();
      refreshReminder();
    });
  });

  el("#menu-export").addEventListener("click", () => {
    const data = JSON.stringify(STORE.all(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diario-bebe-${dayKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup exportado");
  });
  el("#menu-import").addEventListener("click", () => el("#import-file").click());
  el("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const list = JSON.parse(reader.result);
        if (!Array.isArray(list)) throw new Error("formato inválido");
        if (confirm(`Importar ${list.length} registros? Isso substitui os dados atuais.`)) {
          STORE.replaceAll(list);
          modal.hidden = true;
          afterMutation();
          toast("Backup importado");
        }
      } catch (err) {
        alert("Arquivo inválido: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

/* ============================ Navegação ================================= */
function initNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      el("#view-register").classList.toggle("active", view === "register");
      el("#view-calendar").classList.toggle("active", view === "calendar");
      el("#view-agenda").classList.toggle("active", view === "agenda");
      el("#view-trends").classList.toggle("active", view === "trends");
      if (view === "calendar") renderCalendar();
      if (view === "register") refreshToday();
      if (view === "agenda") renderAgenda();
      if (view === "trends") renderTrends(currentRange);
    })
  );
}

/* ============================== Toast =================================== */
let toastTimer = null;
function toast(msg) {
  const t = el("#toast");
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => (t.hidden = true), 220);
  }, 1800);
}

/* ===================== Sincronização na nuvem (Firebase) ================= */
const Cloud = {
  enabled: false,
  db: null,
  auth: null,
  storage: null,
  uid: null,
  unsub: null,
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  pending: new Set(),
  failing: new Map(),

  init() {
    const cfg = window.FIREBASE_CONFIG;
    if (typeof firebase === "undefined" || !cfg || !cfg.apiKey) return;
    try {
      firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.storage = firebase.storage();
      this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      this.enabled = true;
      onEventWrite = (evt) => this.pushEvent(evt);
      this.auth.onAuthStateChanged((user) => {
        this.uid = user ? user.uid : null;
        if (user) this.start();
        else this.stop();
        updateSyncUI();
        afterMutation();
      });
    } catch (e) {
      console.warn("Firebase init falhou:", e);
    }
  },

  col() {
    return this.db.collection("accounts").doc(this.uid).collection("events");
  },
  signIn(email, pass) {
    return this.auth.signInWithEmailAndPassword(email, pass);
  },
  signUp(email, pass) {
    return this.auth.createUserWithEmailAndPassword(email, pass);
  },
  signOut() {
    return this.auth.signOut();
  },

  uploadAttachment(eventId, file) {
    if (!this.enabled || !this.uid) return Promise.reject(new Error("cloud-disabled"));
    const path = `accounts/${this.uid}/attachments/${eventId}/${file.name}`;
    return this.storage
      .ref(path)
      .put(file, { contentType: file.type })
      .then((snap) => snap.ref.getDownloadURL())
      .then((url) => ({ path, url, name: file.name, type: file.type, size: file.size }));
  },
  deleteAttachment(path) {
    if (!this.enabled || !path) return Promise.resolve();
    return this.storage
      .ref(path)
      .delete()
      .catch((e) => console.warn("deleteAttachment:", e));
  },

  pushEvent(evt) {
    if (!this.enabled || !this.uid || !evt || !evt.id) return;
    const clean = {};
    Object.keys(evt).forEach((k) => {
      if (evt[k] !== undefined) clean[k] = evt[k];
    });
    this.failing.delete(evt.id);
    this.pending.add(evt.id);
    updateSyncUI();
    this.col()
      .doc(evt.id)
      .set(clean)
      .then(() => {
        this.pending.delete(evt.id);
        updateSyncUI();
      })
      .catch((e) => {
        this.pending.delete(evt.id);
        this.failing.set(evt.id, evt);
        console.warn("sync pushEvent:", e);
        updateSyncUI();
      });
  },

  retryFailed() {
    const evts = [...this.failing.values()];
    this.failing.clear();
    evts.forEach((evt) => this.pushEvent(evt));
  },

  start() {
    this.stop();
    let initial = false;
    this.unsub = this.col().onSnapshot(
      (snap) => {
        let changed = false;
        snap.docChanges().forEach((ch) => {
          if (STORE.mergeRemote(ch.doc.data())) changed = true;
        });
        if (!initial) {
          initial = true;
          const remote = new Map(snap.docs.map((d) => [d.id, d.data()]));
          STORE._raw().forEach((ev) => {
            const r = remote.get(ev.id);
            if (!r || (ev.updatedAt || 0) > (r.updatedAt || 0)) this.pushEvent(ev);
          });
        }
        if (changed) afterMutation();
      },
      (err) => console.warn("sync onSnapshot:", err)
    );
  },
  stop() {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
  },
};

function updateSyncUI() {
  const configured = Cloud.enabled;
  const user = Cloud.auth && Cloud.auth.currentUser;
  el("#sync-unconfigured").hidden = configured;
  el("#sync-signed-out").hidden = !configured || !!user;
  el("#sync-signed-in").hidden = !configured || !user;
  if (user) el("#sync-account").textContent = `Sincronizando como ${user.email}`;
  const tx = el("#menu-sync .mi-tx");
  if (tx)
    tx.textContent = `Sincronização: ${!configured ? "não configurada" : user ? "ativa" : "entrar"}`;

  const pill = el("#sync-status");
  pill.classList.remove("is-offline", "is-syncing", "is-error", "is-synced");
  if (!configured || !user) {
    pill.hidden = true;
    return;
  }
  pill.hidden = false;
  if (Cloud.failing.size > 0) {
    pill.classList.add("is-error");
    pill.textContent = "Erro ao sincronizar — toque para tentar de novo";
  } else if (!Cloud.online) {
    pill.classList.add("is-offline");
    pill.textContent = "Offline — sincroniza ao reconectar";
  } else if (Cloud.pending.size > 0) {
    pill.classList.add("is-syncing");
    pill.textContent = "Sincronizando…";
  } else {
    pill.classList.add("is-synced");
    pill.textContent = "Sincronizado";
  }
}

function initSync() {
  const modal = el("#sync-modal");
  el("#menu-sync").addEventListener("click", () => {
    updateSyncUI();
    el("#menu-modal").hidden = true;
    modal.hidden = false;
  });

  el("#sync-status").addEventListener("click", () => {
    if (Cloud.failing.size > 0) Cloud.retryFailed();
  });
  window.addEventListener("online", () => {
    const wasOffline = !Cloud.online;
    Cloud.online = true;
    if (wasOffline) toast("Conectado novamente");
    Cloud.retryFailed();
    updateSyncUI();
  });
  window.addEventListener("offline", () => {
    Cloud.online = false;
    toast("Você está offline — os registros continuam sendo salvos");
    updateSyncUI();
  });
  el("#sync-close").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  const creds = () => ({ email: el("#sync-email").value.trim(), pass: el("#sync-pass").value });
  const fail = (e) => alert("Não deu certo: " + (e && e.message ? e.message : e));

  el("#sync-signin").addEventListener("click", () => {
    const { email, pass } = creds();
    if (!email || !pass) return;
    Cloud.signIn(email, pass)
      .then(() => {
        toast("Conectado");
        el("#sync-pass").value = "";
      })
      .catch(fail);
  });
  el("#sync-signup").addEventListener("click", () => {
    const { email, pass } = creds();
    if (!email || !pass) return;
    if (pass.length < 6) {
      alert("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    Cloud.signUp(email, pass)
      .then(() => {
        toast("Conta criada");
        el("#sync-pass").value = "";
      })
      .catch(fail);
  });
  el("#sync-signout").addEventListener("click", () => {
    if (confirm("Sair da sincronização? Os dados continuam salvos neste aparelho."))
      Cloud.signOut();
  });
}

/* ============================== Bootstrap =============================== */
function init() {
  hydrateIcons();
  renderButtons();
  refreshToday();
  initMilkModal();
  initFoodModal();
  initEventEditor();
  initDayModal();
  initAgenda();
  initTrends();
  initMenu();
  initSync();
  initCalendar();
  initNav();

  el("#rb-log").addEventListener("click", () => onLog("milk"));
  refreshReminder();
  setInterval(refreshReminder, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshReminder();
  });

  Cloud.init();
  updateSyncUI();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
document.addEventListener("DOMContentLoaded", init);
