import fs from "fs/promises";
import path from "path";

export class ConnectionSaver {
  constructor({ dir, maxEntries, flushInterval }) {
    this.dir = dir;
    this.maxEntries = maxEntries;
    this.flushInterval = flushInterval;

    this.caches = [];

    // Handle process exit events to save remaining data
    this._setupExitHandlers();
  }

  _setupExitHandlers() {
    // Handle normal process termination
    process.on("exit", () => {
      this.saveToFile();
    });

    // Handle process termination due to signals
    process.on("SIGINT", () => {
      this.saveToFile();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      this.saveToFile();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      this.saveToFile();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      this.saveToFile();
      process.exit(1);
    });
  }

  // 保存数据到文件
  async saveToFile() {
    if (this.caches.length === 0) return;

    try {
      const caches = this.caches;

      // 清空缓存
      this.caches = [];

      // 确保目录存在
      await fs.mkdir(this.dir, { recursive: true });

      // 生成文件名（使用时间戳）
      const fileName = `connections-${Date.now()}.json`;
      const filePath = path.join(this.dir, fileName);

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
