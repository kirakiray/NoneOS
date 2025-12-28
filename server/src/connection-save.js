import { Level } from "level";

const getId = (cid) => Date.now() + ":" + cid;
const COUNT_KEY = '@@count';

export class ConnectionSaver {
  constructor({ clientDB }) {
    // Initialize LevelDB
    this.db = new Level(clientDB);
    // 初始化计数器
    this.initCount();
  }

  // 初始化总数量
  async initCount() {
    try {
      await this.db.get(COUNT_KEY);
    } catch (err) {
      if (err.type === 'NotFoundError') {
        await this.db.put(COUNT_KEY, '0');
      }
    }
  }

  // 添加数据并增加计数
  async putWithCount(key, value) {
    const batch = this.db.batch();
    batch.put(key, value);
    const current = parseInt(await this.db.get(COUNT_KEY), 10);
    batch.put(COUNT_KEY, (current + 1).toString());
    await batch.write();
  }

  // 删除数据并减少计数
  async delWithCount(key) {
    const exists = await this.db.get(key).then(() => true).catch(() => false);
    if (!exists) return;

    const batch = this.db.batch();
    batch.del(key);
    const current = parseInt(await this.db.get(COUNT_KEY), 10);
    batch.put(COUNT_KEY, (current - 1).toString());
    await batch.write();
  }

  // 获取总数
  async getTotalLength() {
    const count = await this.db.get(COUNT_KEY);
    return parseInt(count, 10);
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

  async handleClient(client) {
    client.on("authenticated", async () => {
      // 记录认证事件
      await this.putWithCount(
        getId(client.cid),
        JSON.stringify({
          type: "authenticated",
          userId: client.userId,
          userName: client?.userInfo?.name,
          timestamp: Date.now(),
        })
      );
    });

    client.on("disconnected", async () => {
      // 记录断开连接事件
      await this.putWithCount(
        getId(client.cid),
        JSON.stringify({
          type: "disconnected",
          userId: client.userId,
          userName: client?.userInfo?.name,
          timestamp: Date.now(),
        })
      );
    });
  }
}
