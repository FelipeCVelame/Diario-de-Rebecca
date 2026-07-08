/* =========================================================================
   Diário do Bebê — PWA local-first
   Camada de dados isolada (STORE) para facilitar troca por nuvem no futuro.
   ========================================================================= */

/* ----------------------------- Definição de eventos ---------------------- */
const EVENT_TYPES = {
  wake_morning: { label: "Acordou",              icon: "☀️", cat: "wake",   color: "var(--c-wake)"   },
  milk:         { label: "Comeu — Leite",        icon: "🍼", cat: "food",   color: "var(--c-food)", needsAmount: true },
  snack:        { label: "Comeu — Lanche",       icon: "🍎", cat: "food",   color: "var(--c-food)"   },
  lunch:        { label: "Comeu — Almoço",       icon: "🍽️", cat: "food",   color: "var(--c-food)"   },
  diaper_poop:  { label: "Fralda com cocô",      icon: "💩", cat: "diaper", color: "var(--c-diaper)" },
  diaper_wet:   { label: "Troca sem cocô",       icon: "💧", cat: "diaper", color: "var(--c-diaper)" },
  nap_start:    { label: "Dormiu (soneca)",      icon: "😴", cat: "nap",    color: "var(--c-nap)"    },
  nap_end:      { label: "Acordou (soneca)",     icon: "🥱", cat: "nap",    color: "var(--c-nap)"    },
  night_start:  { label: "Dormiu (noite)",       icon: "🌙", cat: "night",  color: "var(--c-night)"  },
  sick:         { label: "Doente",               icon: "🤒", cat: "sick",   color: "var(--c-sick)"   },
};

/* No editor, "fralda" é um único tipo com um toggle cocô/sem cocô, que mapeia
   para os tipos reais diaper_poop / diaper_wet ao salvar. */
const KIND_META = {
  wake_morning: { icon: "☀️", label: "Acordou" },
  milk:         { icon: "🍼", label: "Leite" },
  snack:        { icon: "🍎", label: "Lanche" },
  lunch:        { icon: "🍽️", label: "Almoço" },
  diaper:       { icon: "🧷", label: "Fralda" },
  nap_start:    { icon: "😴", label: "Dormiu (soneca)" },
  nap_end:      { icon: "🥱", label: "Acordou (soneca)" },
  night_start:  { icon: "🌙", label: "Dormiu (noite)" },
  sick:         { icon: "🤒", label: "Doente" },
};
const EDITOR_KINDS = ["wake_morning", "milk", "snack", "lunch", "diaper", "nap_start", "nap_end", "night_start", "sick"];
const kindOf = (type) => (type === "diaper_poop" || type === "diaper_wet") ? "diaper" : type;
const resolveType = (kind, poop) => kind === "diaper" ? (poop ? "diaper_poop" : "diaper_wet") : kind;

// Ordem/exibição dos botões. `wide` ocupa a linha inteira.
const BUTTON_LAYOUT = [
  { type: "wake_morning", wide: true },
  { type: "milk" },
  { type: "snack" },
  { type: "lunch" },
  { type: "diaper_wet" },
  { type: "diaper_poop" },
  { type: "nap_start" },
  { type: "nap_end" },
  { type: "night_start", wide: true },
  { type: "sick", wide: true },
];

/* =========================================================================
   STORE — persistência local (localStorage) + preparado para sync.
   Cada evento carrega `updatedAt` (ms) para resolver conflitos (last-write-wins)
   e exclusões são LÓGICAS (`deleted:true`) para que apaguem também na nuvem.
   `onEventWrite` é o gancho que a camada Cloud usa para enviar cada alteração.
   ========================================================================= */
let onEventWrite = null;

const STORE = (() => {
  const KEY = "baby-diary-events-v1";
  const _read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const _write = (list) => localStorage.setItem(KEY, JSON.stringify(list));
  const _emit = (evt) => { if (evt && onEventWrite) { try { onEventWrite(evt); } catch { /* offline */ } } };

  return {
    _raw() { return _read(); },                                   // inclui tombstones
    all() { return _read().filter(e => !e.deleted).sort((a, b) => new Date(a.ts) - new Date(b.ts)); },
    add(type, extra = {}) {
      const evt = { id: newId(), type, ts: new Date().toISOString(), updatedAt: Date.now(), ...extra };
      const list = _read(); list.push(evt); _write(list); _emit(evt); return evt;
    },
    put(evt) {                                                    // insere ou substitui por id
      evt = { ...evt, updatedAt: Date.now() };
      const list = _read();
      const i = list.findIndex(e => e.id === evt.id);
      if (i >= 0) list[i] = evt; else list.push(evt);
      _write(list); _emit(evt); return evt;
    },
    update(id, patch) {
      const list = _read();
      const i = list.findIndex(e => e.id === id);
      if (i >= 0) { list[i] = { ...list[i], ...patch, updatedAt: Date.now() }; _write(list); _emit(list[i]); }
    },
    remove(id) {                                                  // exclusão lógica (tombstone)
      const list = _read();
      const i = list.findIndex(e => e.id === id);
      if (i >= 0) { list[i] = { ...list[i], deleted: true, updatedAt: Date.now() }; _write(list); _emit(list[i]); }
    },
    replaceAll(list) {                                            // importação de backup
      const stamped = list.map(e => ({ ...e, updatedAt: e.updatedAt || Date.now() }));
      _write(stamped);
      stamped.forEach(_emit);
    },
    // Aplica um evento vindo da nuvem SEM reenviar (evita laço). Retorna true se mudou.
    mergeRemote(remote) {
      if (!remote || !remote.id) return false;
      const list = _read();
      const i = list.findIndex(e => e.id === remote.id);
      if (i < 0) { list.push(remote); _write(list); return true; }
      if ((remote.updatedAt || 0) > (list[i].updatedAt || 0)) { list[i] = remote; _write(list); return true; }
      return false;
    },
    forDay(dateKey) { return this.all().filter(e => dayKey(new Date(e.ts)) === dateKey); },
  };
})();

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

/* Configurações do app (lembretes etc.) */
const SETTINGS = {
  KEY: "baby-diary-settings",
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch { return {}; } },
  set(patch) { localStorage.setItem(this.KEY, JSON.stringify({ ...this.get(), ...patch })); },
};

/* ===================== Lembrete de leite (3h) ===================== */
const MILK_REMINDER_MS = 3 * 60 * 60 * 1000;   // 3 horas
const remindersOn = () => SETTINGS.get().remindersEnabled !== false; // ligado por padrão

// Bebê está em SONO NOTURNO agora? (night_start em aberto, sem wake_morning depois)
// Soneca (nap_*) não conta. Ignora um night_start "esquecido" (> 16h) para não travar.
function isNightSleeping() {
  const all = STORE.all();
  let lastNight = -Infinity, lastWake = -Infinity;
  for (const e of all) {
    const t = new Date(e.ts).getTime();
    if (e.type === "night_start") lastNight = Math.max(lastNight, t);
    else if (e.type === "wake_morning") lastWake = Math.max(lastWake, t);
  }
  if (lastNight <= lastWake) return false;
  return (Date.now() - lastNight) < 16 * 60 * 60 * 1000;
}

function milkReminderState() {
  const milks = STORE.all().filter(e => e.type === "milk");
  const last = milks.length ? milks[milks.length - 1] : null;
  if (!last) return { active: false, last: null };
  const elapsed = Date.now() - new Date(last.ts).getTime();
  const due = elapsed >= MILK_REMINDER_MS;
  return { active: due && !isNightSleeping(), due, elapsed, lastTs: last.ts };
}

function refreshReminder() {
  const banner = el("#reminder-banner");
  if (!remindersOn()) { banner.hidden = true; return; }
  const st = milkReminderState();
  if (st.active) {
    banner.hidden = false;
    banner.querySelector(".rb-text").textContent = `Faz ${fmtDuration(st.elapsed)} desde o último leite`;
    maybeNotify(st);
  } else {
    banner.hidden = true;
  }
}

// Dispara notificação do sistema uma única vez por ciclo (por último leite).
// Usa o service worker (notificação "de verdade", persiste em segundo plano);
// cai para Notification simples se não houver SW ativo.
async function maybeNotify(st) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (SETTINGS.get().lastNotifiedMilkTs === st.lastTs) return;
  SETTINGS.set({ lastNotifiedMilkTs: st.lastTs });   // marca antes p/ evitar duplicidade
  const title = "Hora do leite? 🍼";
  const opts = {
    body: `Faz ${fmtDuration(st.elapsed)} desde a última mamada.`,
    tag: "milk-reminder", icon: "icon.svg", badge: "icon.svg",
    data: { url: "./index.html" },
  };
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return;
    }
  } catch { /* cai no fallback abaixo */ }
  try { new Notification(title, opts); } catch { /* banner cobre o caso */ }
}

/* ------------------------------ Utilidades ------------------------------- */
function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const fmtTime = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
function fmtDuration(ms) {
  if (ms <= 0) return "0min";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
// datetime-local <-> Date (horário local)
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* -------------------- Pareamento de intervalos de sono ------------------- */
/* Percorre a lista cronológica e casa início→fim, mesmo cruzando a meia-noite.
   Cada intervalo é atribuído ao DIA em que o sono COMEÇOU.                   */
function buildIntervals(events, startType, endType) {
  const intervals = [];
  let open = null;
  for (const e of events) {
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

function summaryForDay(dateKey) {
  const all = STORE.all();
  const evts = all.filter(e => dayKey(new Date(e.ts)) === dateKey);

  const milkMl = evts.filter(e => e.type === "milk").reduce((s, e) => s + (Number(e.amountMl) || 0), 0);

  const naps = buildIntervals(all, "nap_start", "nap_end").filter(i => i.dayKey === dateKey);
  const napMs = naps.reduce((s, i) => s + i.ms, 0);

  const nights = buildIntervals(all, "night_start", "wake_morning").filter(i => i.dayKey === dateKey);
  const nightMs = nights.reduce((s, i) => s + i.ms, 0);

  const count = (t) => evts.filter(e => e.type === t).length;

  return {
    milkMl, milkCount: count("milk"),
    napMs, napCount: naps.length,
    nightMs, nightCount: nights.length,
    diapers: count("diaper_wet") + count("diaper_poop"),
    poops: count("diaper_poop"),
    meals: count("milk") + count("snack") + count("lunch"),
    sick: count("sick") > 0,
    total: evts.length,
    events: evts,
  };
}

/* =========================================================================
   UI
   ========================================================================= */
const el = (sel) => document.querySelector(sel);
let currentDay = null;    // {key, date} do log de dia aberto
let currentRange = 7;     // dias exibidos em Tendências

/* Re-renderiza tudo que possa ter mudado após uma alteração de dados. */
function afterMutation() {
  refreshToday();
  refreshReminder();
  renderCalendar();
  if (currentDay && !el("#day-modal").hidden) openDay(currentDay.key, currentDay.date, true);
  if (el("#view-trends").classList.contains("active")) renderTrends(currentRange);
}

/* -------- Botões de evento -------- */
function renderButtons() {
  const grid = el("#btn-grid");
  grid.innerHTML = "";
  for (const item of BUTTON_LAYOUT) {
    const def = EVENT_TYPES[item.type];
    const btn = document.createElement("button");
    btn.className = `evt-btn cat-${def.cat}` + (item.wide ? " wide" : "");
    btn.innerHTML = `<span class="evt-ico">${def.icon}</span><span>${def.label}</span>`;
    btn.addEventListener("click", () => onLog(item.type));
    grid.appendChild(btn);
  }
}
function onLog(type) {
  const def = EVENT_TYPES[type];
  if (def.needsAmount) {
    openMilkModal((ml) => { STORE.add(type, { amountMl: ml }); toast(`${def.icon} ${def.label} · ${ml}ml`); afterMutation(); });
    return;
  }
  STORE.add(type);
  toast(`${def.icon} ${def.label} registrado`);
  afterMutation();
}

/* -------- Resumo de hoje -------- */
function refreshToday() {
  const s = summaryForDay(dayKey(new Date()));
  el("#today-summary").innerHTML = `
    <div class="stat"><div class="stat-ico">🍼</div><div class="stat-val">${s.milkMl}<small style="font-size:.6em"> ml</small></div><div class="stat-lbl">Leite · ${s.milkCount}x</div></div>
    <div class="stat"><div class="stat-ico">😴</div><div class="stat-val">${fmtDuration(s.napMs)}</div><div class="stat-lbl">Sonecas · ${s.napCount}x</div></div>
    <div class="stat"><div class="stat-ico">🌙</div><div class="stat-val">${fmtDuration(s.nightMs)}</div><div class="stat-lbl">Sono noite</div></div>
  `;
  el("#header-sub").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/* =========================== Modal de leite ============================== */
let milkOnSave = null;
function openMilkModal(cb) { milkOnSave = cb; setMilk(120); el("#milk-modal").hidden = false; }
function setMilk(v) { v = Math.max(0, Number(v) || 0); el("#milk-input").value = v; el("#milk-amount").textContent = v; }
function initMilkModal() {
  const modal = el("#milk-modal");
  el("#milk-input").addEventListener("input", (e) => el("#milk-amount").textContent = Math.max(0, Number(e.target.value) || 0));
  modal.querySelectorAll(".milk-stepper button").forEach(b => b.addEventListener("click", () => setMilk(Number(el("#milk-input").value) + Number(b.dataset.step))));
  modal.querySelectorAll(".milk-presets button").forEach(b => b.addEventListener("click", () => setMilk(b.dataset.ml)));
  el("#milk-cancel").addEventListener("click", () => modal.hidden = true);
  el("#milk-save").addEventListener("click", () => { const ml = Math.max(0, Number(el("#milk-input").value) || 0); modal.hidden = true; if (milkOnSave) milkOnSave(ml); });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
}

/* ==================== Modal de edição/criação de evento ================== */
let editingId = null, edKind = "milk", edPoop = true;

function openEventEditor(opts = {}) {
  editingId = opts.id || null;
  const type = opts.type || "milk";
  edPoop = (type === "diaper_wet") ? false : true;   // padrão "com cocô"
  el("#event-time").value = toLocalInput(opts.ts || new Date());
  el("#event-milk").value = opts.amountMl != null ? opts.amountMl : 120;
  el("#event-modal-title").textContent = editingId ? "Editar registro" : "Novo registro";
  el("#event-delete").hidden = !editingId;
  selectKind(kindOf(type));
  el("#event-modal").hidden = false;
  el("#event-modal .modal").scrollTop = 0;
}

function selectKind(kind) {
  edKind = kind;
  document.querySelectorAll("#kind-grid .kind-chip").forEach(c => c.classList.toggle("active", c.dataset.kind === kind));
  el("#event-milk-field").hidden = kind !== "milk";
  el("#event-diaper-field").hidden = kind !== "diaper";
  updateDiaperSeg();
}
function updateDiaperSeg() {
  document.querySelectorAll("#diaper-seg button").forEach(b => b.classList.toggle("active", (b.dataset.poop === "1") === edPoop));
}

function initEventEditor() {
  const grid = el("#kind-grid");
  grid.innerHTML = EDITOR_KINDS.map(k => {
    const m = KIND_META[k];
    return `<button type="button" class="kind-chip" data-kind="${k}"><span class="kc-ico">${m.icon}</span><span class="kc-lbl">${m.label}</span></button>`;
  }).join("");
  grid.querySelectorAll(".kind-chip").forEach(c => c.addEventListener("click", () => selectKind(c.dataset.kind)));

  el("#event-milk-presets").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { el("#event-milk").value = b.dataset.ml; }));
  el("#diaper-seg").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { edPoop = b.dataset.poop === "1"; updateDiaperSeg(); }));

  const modal = el("#event-modal");
  const close = () => modal.hidden = true;
  el("#event-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  el("#event-save").addEventListener("click", () => {
    const raw = el("#event-time").value;
    const ts = new Date(raw);
    if (!raw || isNaN(ts)) { alert("Informe uma data e hora válidas."); return; }
    const type = resolveType(edKind, edPoop);
    const evt = { id: editingId || newId(), type, ts: ts.toISOString() };
    if (edKind === "milk") evt.amountMl = Math.max(0, Number(el("#event-milk").value) || 0);
    STORE.put(evt);
    close();
    toast("Registro salvo ✅");
    afterMutation();
  });

  el("#event-delete").addEventListener("click", () => {
    if (editingId && confirm("Excluir este registro?")) {
      STORE.remove(editingId);
      close();
      afterMutation();
    }
  });

  // Adicionar registro anterior a partir da tela principal
  el("#quick-add").addEventListener("click", () => openEventEditor({ ts: new Date(), type: "milk" }));
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
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}
const CAT_COLOR = {
  wake: "var(--c-wake)", food: "var(--c-food)", diaper: "var(--c-diaper)",
  nap: "var(--c-nap)", night: "var(--c-night)", sick: "var(--c-sick)",
};
function renderCalendar() {
  el("#cal-title").textContent = new Date(calYear, calMonth, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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
    const cats = [...new Set(evts.map(e => EVENT_TYPES[e.type]?.cat).filter(Boolean))];
    const dots = cats.slice(0, 6).map(c => `<span class="cal-dot" style="background:${CAT_COLOR[c]}"></span>`).join("");
    cell.innerHTML = `<span class="cal-day">${d}</span>${evts.length ? `<span class="cal-count">${evts.length}</span>` : ""}<span class="cal-dots">${dots}</span>`;
    cell.addEventListener("click", () => openDay(key, date));
    grid.appendChild(cell);
  }
}

/* ============================ Log de um dia ============================== */
function openDay(key, date, keepScroll = false) {
  currentDay = { key, date };
  const tl = el("#day-timeline");
  const prevScroll = keepScroll ? el(".modal-day").scrollTop : 0;

  const s = summaryForDay(key);
  el("#day-title").textContent = date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  el("#day-summary").innerHTML = `
    <div class="sum-item"><b>${s.milkMl} ml</b><span>Leite · ${s.milkCount} mamadas</span></div>
    <div class="sum-item"><b>${fmtDuration(s.napMs)}</b><span>Sonecas · ${s.napCount}x</span></div>
    <div class="sum-item"><b>${fmtDuration(s.nightMs)}</b><span>Sono noturno</span></div>
    <div class="sum-item"><b>${s.diapers}</b><span>Trocas · ${s.poops} c/ cocô</span></div>
  `;

  if (!s.events.length) {
    tl.innerHTML = `<div class="day-empty">Nenhum registro neste dia.</div>`;
  } else {
    tl.innerHTML = s.events.map(e => {
      const def = EVENT_TYPES[e.type] || { label: e.type, icon: "•", color: "var(--muted)" };
      const extra = e.type === "milk" && e.amountMl != null ? `<small>${e.amountMl} ml</small>` : "";
      return `
        <button class="tl-item" data-id="${e.id}">
          <span class="tl-time">${fmtTime(new Date(e.ts))}</span>
          <span class="tl-ico" style="background:${def.color}22;">${def.icon}</span>
          <span class="tl-label">${def.label}${extra}</span>
          <span class="tl-edit">✎</span>
        </button>`;
    }).join("");
    tl.querySelectorAll(".tl-item").forEach(row => row.addEventListener("click", () => {
      const e = STORE.all().find(x => x.id === row.dataset.id);
      if (e) openEventEditor({ id: e.id, type: e.type, ts: new Date(e.ts), amountMl: e.amountMl });
    }));
  }

  el("#day-modal").hidden = false;
  if (keepScroll) el(".modal-day").scrollTop = prevScroll;
}
function initDayModal() {
  const modal = el("#day-modal");
  el("#day-close").addEventListener("click", () => modal.hidden = true);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  el("#day-add").addEventListener("click", () => {
    // novo evento neste dia, na hora atual
    const base = new Date(currentDay.date);
    const now = new Date();
    base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    openEventEditor({ ts: base, type: "milk" });
  });
}

/* ============================== Tendências =============================== */
function seriesForRange(days) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const s = summaryForDay(dayKey(d));
    out.push({ date: d, milkMl: s.milkMl, milkCount: s.milkCount, napMs: s.napMs, napCount: s.napCount, nightMs: s.nightMs });
  }
  return out;
}

function barChartSVG(series, valueFn, color, avg) {
  const vals = series.map(valueFn);
  const n = series.length;
  const maxV = Math.max(...vals, 0);
  const niceMax = maxV > 0 ? maxV : 1;
  const W = 300, H = 140, padX = 6, padTop = 16, padBottom = 20;
  const innerW = W - padX * 2;
  const chartH = H - padTop - padBottom;
  const colW = innerW / n;
  const showVals = n <= 10;
  const showEvery = n <= 14 ? 1 : Math.ceil(n / 8);

  let bars = "", labels = "";
  series.forEach((d, i) => {
    const v = vals[i];
    const bh = (v / niceMax) * chartH;
    const cx = padX + i * colW + colW / 2;
    const bw = Math.min(colW * 0.62, 26);
    const by = padTop + (chartH - bh);
    if (v > 0) bars += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${color}"/>`;
    if (showVals && v > 0) bars += `<text class="bar-val" x="${cx.toFixed(1)}" y="${(by - 3).toFixed(1)}">${fmtBarVal(v)}</text>`;
    if (i % showEvery === 0) labels += `<text class="bar-lbl" x="${cx.toFixed(1)}" y="${H - 6}">${d.date.getDate()}</text>`;
  });

  // Linha de média (recebida pronta — calculada só sobre os dias com registro).
  const avgY = padTop + (chartH - (avg / niceMax) * chartH);
  const avgLine = avg > 0
    ? `<line x1="${padX}" y1="${avgY.toFixed(1)}" x2="${W - padX}" y2="${avgY.toFixed(1)}" class="avg-line"/>`
    : "";

  return `<svg viewBox="0 0 ${W} ${H}" class="bar-chart" preserveAspectRatio="xMidYMid meet">${avgLine}${bars}${labels}</svg>`;
}
function fmtBarVal(v) { return v >= 10 ? String(Math.round(v)) : (Number.isInteger(v) ? String(v) : v.toFixed(1)); }

function renderTrends(days) {
  currentRange = days;
  const series = seriesForRange(days);
  const hasData = series.some(d => d.milkMl || d.milkCount || d.napMs || d.napCount || d.nightMs);

  // Média considerando SÓ os dias que têm registro daquele indicador (val > 0).
  const activeAvg = (valFn) => {
    const active = series.map(valFn).filter(v => v > 0);
    return active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
  };

  const cards = [
    { title: "Leite por dia",          color: "var(--c-food)",  val: d => d.milkMl,           fmtAvg: v => `média ${Math.round(v)} ml/dia` },
    { title: "Mamadas por dia",        color: "#3aa76d",        val: d => d.milkCount,        fmtAvg: v => `média ${v.toFixed(1)}×/dia` },
    { title: "Sonecas — tempo",        color: "var(--c-nap)",   val: d => d.napMs / 3600000,  fmtAvg: v => `média ${fmtDuration(v * 3600000)}/dia` },
    { title: "Sonecas — quantidade",   color: "#9a6cff",        val: d => d.napCount,         fmtAvg: v => `média ${v.toFixed(1)}×/dia` },
    { title: "Sono noturno — tempo",   color: "var(--c-night)", val: d => d.nightMs / 3600000, fmtAvg: v => `média ${fmtDuration(v * 3600000)}/dia` },
  ];

  const wrap = el("#charts");
  if (!hasData) {
    wrap.innerHTML = `<div class="day-empty">Sem dados neste período.<br>Registre eventos para ver as tendências. 📈</div>`;
    return;
  }
  wrap.innerHTML = cards.map(c => {
    const avg = activeAvg(c.val);
    const activeDays = series.map(c.val).filter(v => v > 0).length;
    const avgText = avg > 0 ? `${c.fmtAvg(avg)} · ${activeDays} ${activeDays === 1 ? "dia" : "dias"}` : "—";
    return `
    <div class="chart-card">
      <div class="chart-head"><h3>${c.title}</h3><span class="chart-avg">${avgText}</span></div>
      ${barChartSVG(series, c.val, c.color, avg)}
    </div>`;
  }).join("");
}
function initTrends() {
  el("#range-toggle").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    el("#range-toggle").querySelectorAll("button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    renderTrends(Number(b.dataset.days));
  }));
}

/* ============================== Menu / Backup =========================== */
function updateMenuLabels() {
  el("#menu-reminders").textContent = `🔔 Lembretes de leite: ${remindersOn() ? "Ativados" : "Desativados"}`;
  let txt = "Permitir notificações";
  if (!("Notification" in window)) txt = "Notificações indisponíveis";
  else if (Notification.permission === "granted") txt = "Notificações permitidas ✓";
  else if (Notification.permission === "denied") txt = "Notificações bloqueadas (ajuste no navegador)";
  el("#menu-notify").textContent = `📲 ${txt}`;
}
function initMenu() {
  const modal = el("#menu-modal");
  el("#menu-btn").addEventListener("click", () => { updateMenuLabels(); modal.hidden = false; });
  el("#menu-close").addEventListener("click", () => modal.hidden = true);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

  el("#menu-reminders").addEventListener("click", () => {
    SETTINGS.set({ remindersEnabled: !remindersOn() });
    updateMenuLabels();
    refreshReminder();
    toast(remindersOn() ? "Lembretes ativados 🔔" : "Lembretes desativados");
  });
  el("#menu-notify").addEventListener("click", () => {
    if (!("Notification" in window)) { alert("Este navegador não suporta notificações."); return; }
    if (Notification.permission === "granted") { toast("Notificações já estão permitidas ✓"); return; }
    if (Notification.permission === "denied") { alert("As notificações estão bloqueadas. Reative nas configurações do navegador para este site."); return; }
    Notification.requestPermission().then(() => { updateMenuLabels(); refreshReminder(); });
  });

  el("#menu-export").addEventListener("click", () => {
    const data = JSON.stringify(STORE.all(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `diario-bebe-${dayKey(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup exportado ✅");
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
          toast("Backup importado ✅");
        }
      } catch (err) { alert("Arquivo inválido: " + err.message); }
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

/* ============================ Navegação ================================= */
function initNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    el("#view-register").classList.toggle("active", view === "register");
    el("#view-calendar").classList.toggle("active", view === "calendar");
    el("#view-trends").classList.toggle("active", view === "trends");
    if (view === "calendar") renderCalendar();
    if (view === "register") refreshToday();
    if (view === "trends") renderTrends(currentRange);
  }));
}

/* ============================== Toast =================================== */
let toastTimer = null;
function toast(msg) {
  const t = el("#toast");
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => (t.hidden = true), 220); }, 1800);
}

/* ===================== Sincronização na nuvem (Firebase) ================= */
/* Aditivo e à prova de falha: sem config (firebase-config.js) o app segue
   100% local. Com config + login, sincroniza em tempo real entre aparelhos. */
const Cloud = {
  enabled: false, db: null, auth: null, uid: null, unsub: null,

  init() {
    const cfg = window.FIREBASE_CONFIG;
    if (typeof firebase === "undefined" || !cfg || !cfg.apiKey) return; // sem config → local
    try {
      firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); // offline
      this.enabled = true;
      onEventWrite = (evt) => this.pushEvent(evt);         // liga o gancho do STORE
      this.auth.onAuthStateChanged((user) => {
        this.uid = user ? user.uid : null;
        if (user) this.start(); else this.stop();
        updateSyncUI();
        afterMutation();
      });
    } catch (e) { console.warn("Firebase init falhou:", e); }
  },

  col() { return this.db.collection("accounts").doc(this.uid).collection("events"); },
  signIn(email, pass) { return this.auth.signInWithEmailAndPassword(email, pass); },
  signUp(email, pass) { return this.auth.createUserWithEmailAndPassword(email, pass); },
  signOut() { return this.auth.signOut(); },

  pushEvent(evt) {
    if (!this.enabled || !this.uid || !evt || !evt.id) return;
    const clean = {};
    Object.keys(evt).forEach(k => { if (evt[k] !== undefined) clean[k] = evt[k]; });
    this.col().doc(evt.id).set(clean).catch(() => {}); // offline: Firestore enfileira
  },

  start() {
    this.stop();
    let initial = false;
    this.unsub = this.col().onSnapshot((snap) => {
      let changed = false;
      snap.docChanges().forEach((ch) => { if (STORE.mergeRemote(ch.doc.data())) changed = true; });
      if (!initial) {                                     // reconciliação inicial dos dois lados
        initial = true;
        const remote = new Map(snap.docs.map((d) => [d.id, d.data()]));
        STORE._raw().forEach((ev) => {
          const r = remote.get(ev.id);
          if (!r || (ev.updatedAt || 0) > (r.updatedAt || 0)) this.pushEvent(ev);
        });
      }
      if (changed) afterMutation();
    }, (err) => console.warn("sync onSnapshot:", err));
  },
  stop() { if (this.unsub) { this.unsub(); this.unsub = null; } },
};

function updateSyncUI() {
  const configured = Cloud.enabled;
  const user = Cloud.auth && Cloud.auth.currentUser;
  el("#sync-unconfigured").hidden = configured;
  el("#sync-signed-out").hidden = !configured || !!user;
  el("#sync-signed-in").hidden = !configured || !user;
  if (user) el("#sync-account").textContent = `Sincronizando como ${user.email}`;
  // status curto no botão do menu
  const btn = el("#menu-sync");
  if (btn) btn.textContent = `☁️ Sincronização: ${!configured ? "não configurada" : (user ? "ativa" : "entrar")}`;
}

function initSync() {
  const modal = el("#sync-modal");
  el("#menu-sync").addEventListener("click", () => { updateSyncUI(); el("#menu-modal").hidden = true; modal.hidden = false; });
  el("#sync-close").addEventListener("click", () => modal.hidden = true);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

  const creds = () => ({ email: el("#sync-email").value.trim(), pass: el("#sync-pass").value });
  const fail = (e) => alert("Não deu certo: " + (e && e.message ? e.message : e));

  el("#sync-signin").addEventListener("click", () => {
    const { email, pass } = creds();
    if (!email || !pass) return;
    Cloud.signIn(email, pass).then(() => { toast("Conectado ☁️"); el("#sync-pass").value = ""; }).catch(fail);
  });
  el("#sync-signup").addEventListener("click", () => {
    const { email, pass } = creds();
    if (!email || !pass) return;
    if (pass.length < 6) { alert("A senha precisa ter ao menos 6 caracteres."); return; }
    Cloud.signUp(email, pass).then(() => { toast("Conta criada ☁️"); el("#sync-pass").value = ""; }).catch(fail);
  });
  el("#sync-signout").addEventListener("click", () => {
    if (confirm("Sair da sincronização? Os dados continuam salvos neste aparelho.")) Cloud.signOut();
  });
}

/* ============================== Bootstrap =============================== */
function init() {
  renderButtons();
  refreshToday();
  initMilkModal();
  initEventEditor();
  initDayModal();
  initTrends();
  initMenu();
  initSync();
  initCalendar();
  initNav();

  // Lembrete de leite: banner + notificação; recheca a cada minuto e ao reabrir.
  el("#rb-log").addEventListener("click", () => onLog("milk"));
  refreshReminder();
  setInterval(refreshReminder, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshReminder(); });

  // Sincronização na nuvem (se configurada).
  Cloud.init();
  updateSyncUI();

  // Service worker só faz sentido servido via http(s); ignorado ao abrir como arquivo.
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
document.addEventListener("DOMContentLoaded", init);
