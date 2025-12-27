import level from "level";
export class ConnectionSaver {
  constructor({ dbName }) {
    // Initialize LevelDB
    this.db = level(dbName);

    // this.caches = [];
  }

  handleClient(client) {
    client.on("authenticated", () => {
      this.caches.push({
        id: client.id,
        type: "authenticated",
        userId: client.userId,
        timestamp: Date.now(),
      });
    });

    client.on("disconnected", () => {
      this.caches.push({
        id: client.id,
        type: "disconnected",
        userId: client.userId,
        timestamp: Date.now(),
      });
    });

    this.flush();
  }
}
