import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

// Relay from postMessage — triggers when app is backgrounded/minimized
self.addEventListener("message", (event) => {
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
