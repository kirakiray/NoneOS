import { Level } from "level";

const getId = (cid) => Date.now() + ":" + cid;
const COUNT_KEY = "@@count";

export class ConnectionSaver {
  constructor(dbName) {
    // Initialize LevelDB
    this.connectionDB = new Saver(`handdb-connection-${dbName}`);
  }

  updateState(state, client) {
    // 记录认证事件
    this.connectionDB.putWithCount(getId(client.cid), {
      state,
      userId: client.userId,
      userName: client?.userInfo?.name,
      timestamp: Date.now(),
    });
  }

  async handleClient(client) {
    client.on("authenticated", async () => {
      // 记录认证事件
      this.updateState("authenticated", client);
    });

    client.on("disconnected", async () => {
      // 记录断开连接事件
      this.updateState("disconnected", client);
    });
  }
}

class Saver {
  constructor(name) {
    this._db = new Level(name);
    this.initCount();
  }

  // 初始化总数量
  async initCount() {
    try {
      this._count = parseInt(await this._db.get(COUNT_KEY), 10);
    } catch (err) {
      if (err.type === "NotFoundError") {
        await this._db.put(COUNT_KEY, "0");
        this._count = 0;
      }
    }
  }

  // 添加数据并增加计数
  async putWithCount(key, value) {
    const batch = this._db.batch();
    batch.put(key, JSON.stringify(value));
    this._count++;
    batch.put(COUNT_KEY, this._count.toString());
    await batch.write();
  }

  // 删除数据并减少计数
  async delWithCount(key) {
    const exists = await this._db
      .get(key)
      .then(() => true)
      .catch(() => false);
    if (!exists) return;

    const batch = this._db.batch();
    batch.del(key);
    this._count--;
    batch.put(COUNT_KEY, this._count.toString());
    await batch.write();
  }

  // 获取总数
  async getTotalLength() {
    return this._count;
  }

  // 获取特定条件的数据
  async batchGet(options = {}) {
    const { limit = 10, reverse = true, gt, gte, lt, lte } = options;
    const results = [];

    const opts = { limit, reverse };

    if (gt) opts.gt = gt;
    if (gte) opts.gte = gte;
    if (lt) opts.lt = lt;
    if (lte) opts.lte = lte;

    for await (const [key, value] of this._db.iterator(opts)) {
      try {
        if (key === COUNT_KEY) continue;

        results.push({
          key,
          value: JSON.parse(value),
        });
      } catch (err) {
        // 忽略解析失败的记录
        console.error("Error parsing JSON for key:", key, value, err);
      }
    }

    return results;
  }
}
