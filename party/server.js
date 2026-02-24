export default class Server {
  constructor(room) {
    this.room = room;
  }

  onMessage(message, sender) {
    this.room.broadcast(message, [sender.id]);
  }
}
