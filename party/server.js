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
    if (typeof message !== "string" || message.length > 512) return;

    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type !== "location") return;

    await this.room.storage.put("lastLocation", message);
    this.room.broadcast(message, [sender.id]);
  }
}
