import webpush from "web-push";

const PUSH_RATE_LIMIT_MS = 30_000;

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
    if (last) {
      conn.send(last);
    }
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

    // Stricter size limit for location messages
    if (message.length > 512) return;
    if (parsed.type !== "location") return;

    await this.room.storage.put("lastLocation", message);
    this.room.broadcast(message, [sender.id]);

    await this.sendPushNotifications(parsed);
  }

  async handlePushSubscribe(subscription) {
    if (!subscription?.endpoint) return;
    const subs = (await this.room.storage.get("pushSubs")) ?? {};
    subs[subscription.endpoint] = subscription;
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

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = (await this.room.storage.get("pushSubs")) ?? {};
    const payload = JSON.stringify({
      title: "Runner update",
      body: Array.isArray(locationMsg.coords)
        ? `${locationMsg.coords[0].toFixed(5)}, ${locationMsg.coords[1].toFixed(5)}`
        : "New position received",
    });

    const toRemove = [];
    await Promise.allSettled(
      Object.entries(subs).map(async ([endpoint, sub]) => {
        try {
          await webpush.sendNotification(sub, payload);
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
