export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
};

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const subscribeToPush = async () => {
  if (!("PushManager" in window)) return null;
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) return null;
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
};

const relayToServiceWorker = (payload) => {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "PARTYKIT_MESSAGE",
      payload,
    });
  }
};

export const notifyLocationUpdate = (msg) => {
  if (Notification.permission !== "granted") return;

  const body = msg.coords
    ? `${msg.coords[0].toFixed(5)}, ${msg.coords[1].toFixed(5)}`
    : "New position received";

  relayToServiceWorker({
    title: "Runner update",
    body,
    data: msg,
  });
};
