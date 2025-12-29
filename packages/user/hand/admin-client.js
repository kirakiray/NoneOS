import { HandServerClient } from "./client.js";

export class AdminHandServerClient extends HandServerClient {
  constructor({ url, user, password }) {
    super({ url, user });
    this.password = password;
    this.initDB();
  }

  initDB() {
    this._db = new Promise((resolve, reject) => {
      // 打开（或创建）数据库
      const request = indexedDB.open("AdminRecordsDB", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 创建一个 object store
        if (!db.objectStoreNames.contains("records")) {
          db.createObjectStore("records", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };

      // 处理阻止版本更改的错误（比如数据库被其他标签页锁定）
      request.onblocked = (event) => {
        console.warn("IndexedDB operation is blocked:", event);
      };
    });
  }

  // 检查WebSocket连接状态
  _isWebSocketConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  // 通用的WebSocket请求方法
  _sendWebSocketRequest(message, expectedResponseType) {
    if (!this._isWebSocketConnected()) {
      throw new Error("WebSocket连接未建立，无法发送请求");
    }

    // 发送消息
    this.socket.send(JSON.stringify(message));

    // 返回一个Promise来处理响应
    return new Promise((resolve, reject) => {
      const listener = (event) => {
        const { type, ...data } = event.detail;
        if (type === expectedResponseType) {
          this.removeEventListener("message", listener);
          resolve(data);
        }
      };
      this.addEventListener("message", listener);

      // 设置超时机制防止Promise永远挂起
      setTimeout(() => {
        this.removeEventListener("message", listener);
        reject(new Error(`WebSocket请求超时: ${expectedResponseType}`));
      }, 30000); // 30秒超时
    });
  }

  // 获取在线列表用户数据（支持分页）
  async getClients(options = {}) {
    const result = await this._sendWebSocketRequest({
      type: "get_connections",
      password: this.password,
      ...options, // 可包含 page 和 pageSize 参数
    }, "connections_info");
    
    return result;
  }

  // 断开指定客户端连接
  async disconnectClient(clientId) {
    if (!clientId) {
      throw new Error("缺少客户端ID参数");
    }

    if (!this._isWebSocketConnected()) {
      throw new Error("WebSocket连接未建立，无法发送断开请求");
    }

    this.socket.send(
      JSON.stringify({
        type: "disconnect_client",
        clientId: clientId,
        password: this.password,
      })
    );
  }

  async syncRecords() {
    try {
      // 获取总数
      const totalLength = await this.getRecordLength();

      // 获取本地db后那一条
      const lastItem = await this.getLastRecord();

      await this._syncRecords({
        gte: lastItem?.id,
        limit: 100,
      });
    } catch (error) {
      console.error("同步记录时出错:", error);
      throw error;
    }
  }

  async _syncRecords(options = {}) {
    const { records } = await this._sendWebSocketRequest({
      type: "sync_records",
      password: this.password,
      ...options,
    }, "sync_records");
    
    await this.saveRecordsToLocal(records);
    return records;
  }

  async getRecordLength() {
    const { length } = await this._sendWebSocketRequest({
      type: "get_record_length",
      password: this.password,
    }, "get_record_length");
    
    return length;
  }

  async saveRecordsToLocal(records) {
    if (!records || records.length === 0) {
      return;
    }

    const db = await this._db;
    if (!db) throw new Error("IndexedDB not initialized.");

    const transaction = db.transaction(["records"], "readwrite");
    const store = transaction.objectStore("records");

    // 批量添加记录而不是逐个添加
    for (const record of records) {
      store.put(record);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error("保存记录到本地时出错:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getLastRecord() {
    try {
      const db = await this._db;
      if (!db) throw new Error("IndexedDB not initialized.");

      const transaction = db.transaction(["records"], "readonly");
      const store = transaction.objectStore("records");

      // 打开反向游标（从最大键开始）
      const request = store.openCursor(null, "prev"); // 'prev' 表示倒序

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // 第一个反向游标就是最后一条记录
            resolve(cursor.value);
          } else {
            resolve(null); // 空表
          }
        };

        request.onerror = (event) => {
          console.error("获取最后一条记录时出错:", event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error("获取最后一条记录时发生异常:", error);
      throw error;
    }
  }
}
