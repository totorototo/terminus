import { isAuthorizedWriter } from "../src/lib/roomAuth.js";
import { sendNotification } from "./webpush.js";

const PUSH_RATE_LIMIT_MS = 30_000;

// How long a stored last-known location stays "fresh". Past this, it is not
// replayed to newly-connecting followers (and is cleared), so a stale position
// from a finished run does not leak to whoever opens the room later.
const LAST_LOCATION_TTL_MS = 60 * 60 * 1000; // 1 hour

// Maximum push subscriptions stored per room. Caps storage/abuse; well above
// the realistic number of followers for a single runner.
const MAX_PUSH_SUBS = 50;

// Allowlist of trusted Web Push service hosts. Subscriptions whose endpoint
// does not match one of these (over HTTPS) are rejected — this prevents the
// server from being coerced into sending requests to attacker-chosen URLs
// (SSRF) via a forged `push_subscribe` message.
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com", // Chrome / Android (FCM)
  "android.googleapis.com", // Chrome (legacy GCM/FCM)
  "updates.push.services.mozilla.com", // Firefox
  /\.push\.apple\.com$/, // Safari / iOS
  /\.notify\.windows\.com$/, // Edge / Windows (WNS)
];

function isAllowedPushEndpoint(endpoint) {
  if (typeof endpoint !== "string") return false;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_PUSH_HOSTS.some((host) =>
    host instanceof RegExp ? host.test(url.hostname) : host === url.hostname,
  );
}

export default class Server {
  constructor(room) {
    this.room = room;
  }

  // HTTP handler — used as a health-check endpoint by the Playwright test runner.
  onRequest() {
    return new Response("ok");
  }

  async onConnect(conn) {
    const last = await this.room.storage.get("lastLocation");
    if (!last) return;
    // Drop a position that is older than the freshness window so stale data
    // from a previous run is never replayed.
    const savedAt = (await this.room.storage.get("lastLocationAt")) ?? 0;
    if (Date.now() - savedAt > LAST_LOCATION_TTL_MS) {
      await this.room.storage.delete("lastLocation");
      await this.room.storage.delete("lastLocationAt");
      return;
    }
    conn.send(last);
  }

  async onMessage(message, sender) {
    if (typeof message !== "string" || message.length > 2048) return;

    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type === "push_subscribe") {
      await this.handlePushSubscribe(parsed.subscription);
      return;
    }

    // Stricter size limit for location messages.
    // Base payload is ~120 bytes; paceSettings adds ~55 bytes. 1 024 gives
    // room for longer raceIds and future fields without risking silent drops.
    if (message.length > 1024) return;
    if (parsed.type !== "location") return;

    // Validate coordinate ranges before broadcasting
    if (!Array.isArray(parsed.coords) || parsed.coords.length < 2) return;
    const [lat, lon] = parsed.coords;
    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      return;

    // Authorization: only the holder of this room's secret write key may
    // broadcast. The room id is SHA-256(writeKey), so followers (who only know
    // the room id) cannot forge positions. Reject unauthenticated writers.
    if (!(await isAuthorizedWriter(parsed.writeKey, this.room.id))) return;

    // Strip the secret before persisting/relaying so it never reaches followers.
    delete parsed.writeKey;
    const sanitized = JSON.stringify(parsed);

    await this.room.storage.put("lastLocation", sanitized);
    await this.room.storage.put("lastLocationAt", Date.now());
    this.room.broadcast(sanitized, [sender.id]);

    await this.sendPushNotifications(parsed);
  }

  async handlePushSubscribe(subscription) {
    const endpoint = subscription?.endpoint;
    // Reject endpoints that are not valid, HTTPS, known push-service URLs.
    if (!isAllowedPushEndpoint(endpoint)) return;

    const subs = (await this.room.storage.get("pushSubs")) ?? {};
    // Cap the number of stored subscriptions per room. Re-subscribing with an
    // already-known endpoint is always allowed (just refreshes the keys).
    if (!(endpoint in subs) && Object.keys(subs).length >= MAX_PUSH_SUBS)
      return;
    subs[endpoint] = subscription;
    await this.room.storage.put("pushSubs", subs);
  }

  async sendPushNotifications(locationMsg) {
    const publicKey = this.room.env.VAPID_PUBLIC_KEY;
    const privateKey = this.room.env.VAPID_PRIVATE_KEY;
    const subject =
      this.room.env.VAPID_SUBJECT ?? "mailto:noreply@terminus.app";
    if (!publicKey || !privateKey) return;

    // Rate limit: max one push per 30 s per room
    const lastPushAt = (await this.room.storage.get("lastPushAt")) ?? 0;
    if (Date.now() - lastPushAt < PUSH_RATE_LIMIT_MS) return;
    await this.room.storage.put("lastPushAt", Date.now());

    const subs = (await this.room.storage.get("pushSubs")) ?? {};
    const [lat, lon, ele] = Array.isArray(locationMsg.coords)
      ? locationMsg.coords
      : [];
    const body =
      typeof lat === "number" && typeof lon === "number"
        ? `Runner at ${lat.toFixed(4)}, ${lon.toFixed(4)}${typeof ele === "number" ? ` · ${Math.round(ele)}m` : ""}`
        : "Runner's position updated";
    const payload = JSON.stringify({ title: "Runner update", body });

    const toRemove = [];
    await Promise.allSettled(
      Object.entries(subs).map(async ([endpoint, sub]) => {
        try {
          await sendNotification(sub, payload, {
            publicKey,
            privateKey,
            subject,
          });
        } catch (err) {
          // 410 Gone or 404 = subscription no longer valid, clean it up
          if (err.statusCode === 410 || err.statusCode === 404) {
            toRemove.push(endpoint);
          }
        }
      }),
    );

    if (toRemove.length > 0) {
      const fresh = (await this.room.storage.get("pushSubs")) ?? {};
      toRemove.forEach((ep) => delete fresh[ep]);
      await this.room.storage.put("pushSubs", fresh);
    }
  }
}
