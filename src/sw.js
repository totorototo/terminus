import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

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
