export class ConnectionSaver {
  constructor({ dir, maxEntries, flushInterval }) {
    this.dir = dir;
    this.maxEntries = maxEntries;
    this.flushInterval = flushInterval;

    this.caches = [];
  }

  handleClient(client) {
    client.on("authenticated", () => {
      this.caches.push({
        id: crypto.randomUUID(),
        type: "authenticated",
        userId: client.userId,
        timestamp: Date.now(),
      });
    });

    client.on("disconnected", () => {
      this.caches.push({
        id: crypto.randomUUID(),
        type: "disconnected",
        userId: client.userId,
        timestamp: Date.now(),
      });
    });
  }
}
