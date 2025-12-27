import { Level } from "level";

const getId = (cid) => 9999999999999 - Date.now() + ":" + cid;

export class ConnectionSaver {
  constructor({ clientDB }) {
    // Initialize LevelDB
    this.db = new Level(clientDB);
  }

  handleClient(client) {
    client.on("authenticated", () => {
      // 记录认证事件
      this.db.put(
        getId(client.cid),
        JSON.stringify({
          type: "authenticated",
          userId: client.userId,
          userName: client.userInfo.name,
          timestamp: Date.now(),
        })
      );
    });

    client.on("disconnected", () => {
      // 记录断开连接事件
      this.db.put(
        getId(client.cid),
        JSON.stringify({
          type: "disconnected",
          userId: client.userId,
          userName: client.userInfo.name,
          timestamp: Date.now(),
        })
      );
    });
  }
}
