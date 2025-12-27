import fs from "fs/promises";
import path from "path";

export class ConnectionSaver {
  constructor({ dir, maxEntries, flushInterval }) {
    this.dir = dir;
    this.maxEntries = maxEntries;
    this.flushInterval = flushInterval;

    this.caches = [];
  }

  // 保存数据到文件
  async saveToFile() {
    if (this.caches.length === 0) return;

    try {
      // 确保目录存在
      await fs.mkdir(this.dir, { recursive: true });

      // 生成文件名（使用时间戳）
      const fileName = `connections-${Date.now()}.json`;
      const filePath = path.join(this.dir, fileName);

      const caches = this.caches;

      // 清空缓存
      this.caches = [];

      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(caches, null, 2));
    } catch (error) {
      console.error("Error saving connection data:", error);
    }
  }

  flush() {
    if (!this._flushTimer) {
      this._flushTimer = setTimeout(() => {
        this.saveToFile();
        this._flushTimer = null;
      }, this.flushInterval);
    }

    if (this.caches.length >= this.maxEntries) {
      this.saveToFile();
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
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

    this.flush();
  }
}
