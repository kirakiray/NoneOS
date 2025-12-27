import fs from "fs/promises";
import fsSync from "fs";
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
    // 统一处理保存并退出
    const saveAndExit = (code = 0) => {
      this.saveToFile(true); // Always use sync mode during exit
      process.exit(code);
    };

    // 统一异常日志并保存退出
    const handleError = (error) => {
      console.error(error);
      saveAndExit(1);
    };

    process.on("exit", () => {
      try {
        this.saveToFile(true); // Use sync mode during exit
      } catch (error) {
        console.error("Error during exit save:", error);
      }
    });
    process.on("SIGINT", () => saveAndExit(0));
    process.on("SIGTERM", () => saveAndExit(0));
    process.on("uncaughtException", (err) =>
      handleError(`Uncaught Exception: ${err}`)
    );
    process.on("unhandledRejection", (reason, promise) =>
      handleError(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
    );
  }

  // 保存数据到文件
  async saveToFile(sync = false) {
    if (this.caches.length === 0) return;

    try {
      const caches = this.caches;

      // 清空缓存
      this.caches = [];

      if (sync) {
        // 同步方式写入文件
        // 确保目录存在
        fsSync.mkdirSync(this.dir, { recursive: true });

        // 生成文件名（使用时间戳）
        const fileName = `connections-${Date.now()}.json`;
        const filePath = path.join(this.dir, fileName);

        // 同步写入文件
        fsSync.writeFileSync(filePath, JSON.stringify(caches, null, 2));
      } else {
        // 异步方式写入文件
        await fs.mkdir(this.dir, { recursive: true });

        // 生成文件名（使用时间戳）
        const fileName = `connections-${Date.now()}.json`;
        const filePath = path.join(this.dir, fileName);

        // 写入文件
        await fs.writeFile(filePath, JSON.stringify(caches, null, 2));
      }
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
