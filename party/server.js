export default class Server {
  constructor(room) {
    this.room = room;
  }

  // HTTP handler — used as a health-check endpoint by the Playwright test runner.
  onRequest() {
    return new Response("ok");
  }

  onMessage(message, sender) {
    if (typeof message !== "string" || message.length > 512) return;

    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type !== "location") return;

    this.room.broadcast(message, [sender.id]);
  }
}
