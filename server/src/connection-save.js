import { Level } from "level";

export class ConnectionSaver {
  constructor({ clientDB }) {
    // Initialize LevelDB
    this.db = new Level(clientDB);
  }

  handleClient(client) {
    client.on("authenticated", () => {
      // 记录认证事件
      this.db.put(
        client.id,
        JSON.stringify({
          type: "authenticated",
          userId: client.userId,
          timestamp: Date.now(),
        })
      );
    });

    client.on("disconnected", () => {
      // 记录断开连接事件
      this.db.put(
        client.id,
        JSON.stringify({
          type: "disconnected",
          userId: client.userId,
          timestamp: Date.now(),
        })
      );
    });
  }
}
