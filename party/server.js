import { routePartykitRequest, Server } from "partyserver";

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

// The runner's GPX, gzipped by the browser. TOR330 (4.1 MB) gzips to ~790 KB;
// 4 MB leaves room for longer races while capping what one room may store.
const MAX_ROUTE_BYTES = 4 * 1024 * 1024;

// why: Durable Object storage caps each value at 128 KiB, so the route is
// stored as numbered chunks below that, plus one metadata entry.
const ROUTE_CHUNK_BYTES = 120 * 1024;

// A room (route, last position, push subscriptions) is deleted this long
// after its last upload or position. Long enough for a multi-day race.
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, x-write-key, x-route-hash, x-route-name",
  "Access-Control-Expose-Headers": "x-route-name",
};

const respond = (body, status = 200, headers = {}) =>
  new Response(body, { status, headers: { ...CORS_HEADERS, ...headers } });

const chunkKey = (i) => `route:${i}`;

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

// The Durable Object binding is named "Main" so routePartykitRequest serves
// it at /parties/main/:room, the path clients already use.
export class Main extends Server {
  // why: the room keeps no state in memory (everything is in storage), so it
  // can hibernate between messages with followers' sockets left open.
  static options = { hibernate: true };

  // HTTP: the room's shared route (/route, /route/meta). Any other path is
  // the health check the Playwright runner polls.
  async onRequest(request) {
    const { pathname } = new URL(request.url);
    const isMeta = pathname.endsWith("/route/meta");
    if (!isMeta && !pathname.endsWith("/route")) return respond("ok");

    if (request.method === "OPTIONS") return respond(null, 204);
    if (isMeta) {
      if (request.method !== "GET") return respond(null, 405);
      const meta = await this.ctx.storage.get("routeMeta");
      if (!meta) return respond(null, 404);
      const { hash, name, size } = meta;
      return respond(JSON.stringify({ hash, name, size }), 200, {
        "content-type": "application/json",
      });
    }
    if (request.method === "GET") return this.readRoute();
    if (request.method === "POST" || request.method === "DELETE") {
      // Same capability as broadcasting: only the runner holds the write key.
      const writeKey = request.headers.get("x-write-key");
      if (!(await isAuthorizedWriter(writeKey, this.name))) {
        return respond(null, 403);
      }
      return request.method === "POST"
        ? this.writeRoute(request)
        : this.deleteRoute();
    }
    return respond(null, 405);
  }

  async readRoute() {
    const meta = await this.ctx.storage.get("routeMeta");
    if (!meta) return respond(null, 404);
    const keys = Array.from({ length: meta.chunks }, (_, i) => chunkKey(i));
    const chunks = await this.ctx.storage.get(keys);
    const body = new Uint8Array(meta.size);
    let offset = 0;
    for (const key of keys) {
      const chunk = chunks.get(key);
      if (!chunk) return respond(null, 404); // a write was interrupted
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return respond(body, 200, {
      "content-type": "application/octet-stream",
      "x-route-name": encodeURIComponent(meta.name),
    });
  }

  async writeRoute(request) {
    const declared = Number(request.headers.get("content-length"));
    if (declared > MAX_ROUTE_BYTES) return respond(null, 413);
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength === 0) return respond(null, 400);
    if (body.byteLength > MAX_ROUTE_BYTES) return respond(null, 413);

    const hash = (request.headers.get("x-route-hash") ?? "").slice(0, 64);
    let name = "";
    try {
      name = decodeURIComponent(request.headers.get("x-route-name") ?? "");
    } catch {
      // A malformed name is not worth refusing the route over.
    }
    name = name.slice(0, 200);

    const chunks = Math.ceil(body.byteLength / ROUTE_CHUNK_BYTES);
    const entries = {};
    for (let i = 0; i < chunks; i++) {
      entries[chunkKey(i)] = body.slice(
        i * ROUTE_CHUNK_BYTES,
        (i + 1) * ROUTE_CHUNK_BYTES,
      );
    }
    entries.routeMeta = { hash, name, size: body.byteLength, chunks };

    const previous = await this.ctx.storage.get("routeMeta");
    await this.ctx.storage.put(entries);
    // A shorter route leaves the previous route's extra chunks behind.
    for (let i = chunks; i < (previous?.chunks ?? 0); i++) {
      await this.ctx.storage.delete(chunkKey(i));
    }
    await this.touch();
    return respond(null, 204);
  }

  async deleteRoute() {
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    return respond(null, 204);
  }

  // Push the room's expiry back: it lives ROOM_TTL_MS past its last activity.
  async touch() {
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  async onAlarm() {
    await this.ctx.storage.deleteAll();
  }

  async onConnect(conn) {
    const last = await this.ctx.storage.get("lastLocation");
    if (!last) return;
    // Drop a position that is older than the freshness window so stale data
    // from a previous run is never replayed.
    const savedAt = (await this.ctx.storage.get("lastLocationAt")) ?? 0;
    if (Date.now() - savedAt > LAST_LOCATION_TTL_MS) {
      await this.ctx.storage.delete("lastLocation");
      await this.ctx.storage.delete("lastLocationAt");
      return;
    }
    conn.send(last);
  }

  async onMessage(sender, message) {
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
    // room for future fields without risking silent drops.
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
    if (!(await isAuthorizedWriter(parsed.writeKey, this.name))) return;

    // Strip the secret before persisting/relaying so it never reaches followers.
    delete parsed.writeKey;
    const sanitized = JSON.stringify(parsed);

    await this.ctx.storage.put("lastLocation", sanitized);
    await this.ctx.storage.put("lastLocationAt", Date.now());
    await this.touch();
    this.broadcast(sanitized, [sender.id]);

    await this.sendPushNotifications(parsed);
  }

  async handlePushSubscribe(subscription) {
    const endpoint = subscription?.endpoint;
    // Reject endpoints that are not valid, HTTPS, known push-service URLs.
    if (!isAllowedPushEndpoint(endpoint)) return;

    const subs = (await this.ctx.storage.get("pushSubs")) ?? {};
    // Cap the number of stored subscriptions per room. Re-subscribing with an
    // already-known endpoint is always allowed (just refreshes the keys).
    if (!(endpoint in subs) && Object.keys(subs).length >= MAX_PUSH_SUBS)
      return;
    subs[endpoint] = subscription;
    await this.ctx.storage.put("pushSubs", subs);
  }

  async sendPushNotifications(locationMsg) {
    const publicKey = this.env.VAPID_PUBLIC_KEY;
    const privateKey = this.env.VAPID_PRIVATE_KEY;
    const subject = this.env.VAPID_SUBJECT ?? "mailto:noreply@terminus.app";
    if (!publicKey || !privateKey) return;

    // Rate limit: max one push per 30 s per room
    const lastPushAt = (await this.ctx.storage.get("lastPushAt")) ?? 0;
    if (Date.now() - lastPushAt < PUSH_RATE_LIMIT_MS) return;
    await this.ctx.storage.put("lastPushAt", Date.now());

    const subs = (await this.ctx.storage.get("pushSubs")) ?? {};
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
      const fresh = (await this.ctx.storage.get("pushSubs")) ?? {};
      toRemove.forEach((ep) => delete fresh[ep]);
      await this.ctx.storage.put("pushSubs", fresh);
    }
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response("Not Found", { status: 404 })
    );
  },
};
