import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

precacheAndRoute(self.__WB_MANIFEST);

// Cache GPX files on first network access so they're available offline
registerRoute(
  ({ url }) => url.pathname.endsWith(".gpx"),
  new CacheFirst({
    cacheName: "gpx-files",
    plugins: [new ExpirationPlugin({ maxEntries: 10 })],
  }),
);

// Return an empty script when the analytics CDN is unreachable (offline)
self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).hostname === "cloud.umami.is") {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response("", {
            headers: { "Content-Type": "application/javascript" },
          }),
      ),
    );
  }
});

// Relay from postMessage — triggers when app is backgrounded/minimized
self.addEventListener("message", (event) => {
  if (event.origin !== self.location.origin) return;
  if (typeof event.data !== "object" || event.data === null) return;
  if (event.data?.type === "PARTYKIT_MESSAGE") {
    const { payload } = event.data;
    event.waitUntil(
      self.registration.showNotification(payload.title ?? "Terminus", {
        body: payload.body,
        icon: "/logo192.png",
        badge: "/logo150.png",
        data: payload.data,
        tag: "location-update", // replaces previous instead of stacking
        renotify: true,
      }),
    );
  }
});

// Web Push — triggers when app is fully closed
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Terminus", {
      body: data.body,
      icon: "/logo192.png",
      badge: "/logo150.png",
      tag: "location-update",
      renotify: true,
    }),
  );
});

// Tap on notification → focus or open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow("/");
      }),
  );
});
