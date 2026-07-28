/* ForLink Service Worker — Web Push + minimal shell.
 * Não faz caching agressivo de HTML (evita conteúdo velho em preview/prod).
 */
/* eslint-disable no-restricted-globals */

const VAPID_PUBLIC_KEY = "BHwXwomqxRNyzKTsWLZDwupNYKadkCNvT4kTLQm8KlKT64QoDx-RKf37eqXqDX3O_P2vZxDqqjufZZbzEod_nXk";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push handler — mostra notificação nativa
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ForLink", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ForLink";
  const options = {
    body: data.body || "",
    icon: data.icon || "/pwa/icon-192.png",
    badge: data.badge || "/pwa/icon-192.png",
    image: data.image,
    tag: data.tag || "forlink-notification",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/dashboard", ...data.data },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Ao clicar, foca uma aba existente ou abre nova
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const origin = self.location.origin;
      const target = new URL(url, origin).href;
      for (const client of allClients) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      for (const client of allClients) {
        if ("focus" in client && "navigate" in client) {
          await client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })()
  );
});

// Se a inscrição expirar/for renovada pelo navegador, reenvia ao servidor
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const applicationServerKey = self.__VAPID_PUBLIC_KEY__;
        if (!applicationServerKey) return;
        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        await fetch("/api/public/push/rotate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
            newSubscription: newSub,
          }),
        });
      } catch (e) {
        // silencioso
      }
    })()
  );
});
