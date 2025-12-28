import { Level } from "level";

const getId = (cid) => Date.now() + ":" + cid;

export class ConnectionSaver {
  constructor({ clientDB }) {
    // Initialize LevelDB
    this.db = new Level(clientDB);
  }

  // 获取特定条件的数据
  async batchGet(options = {}) {
    const { limit = 10, reverse = true, gt, gte, lt, lte } = options;
    const results = [];

    try {
      for await (const [key, value] of this.db.iterator({
        limit,
        reverse,
        gt,
        gte,
        lt,
        lte,
      })) {
        results.push({
          key,
          value: JSON.parse(value),
        });
      }
      return results;
    } catch (error) {
      console.error("Error in batchGet:", error);
      throw error;
    }
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
