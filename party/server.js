export default class Server {
  constructor(room) {
    this.room = room;
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
