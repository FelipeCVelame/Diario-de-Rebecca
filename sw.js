/* Service worker — offline (app shell) + notificações.
   Pronto para Web Push (evento 'push') na fase de notificação em segundo plano. */
const CACHE = "baby-diary-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first: busca a versão nova online e atualiza o cache; offline usa o cache.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Web Push (fase 2): o servidor envia; aqui só exibimos.
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = {}; }
  const title = data.title || "Hora do leite? 🍼";
  const opts = {
    body: data.body || "Já passou de 3h desde a última mamada.",
    tag: data.tag || "milk-reminder",
    icon: "icon.svg", badge: "icon.svg",
    data: { url: data.url || "./index.html" },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

// Clicar na notificação foca/abre o app.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./index.html";
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
