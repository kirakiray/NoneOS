import { HandServerClient } from "./client.js";

export class AdminHandServerClient extends HandServerClient {
  constructor({ url, user, password }) {
    super({ url, user });
    this.password = password;
    this.initDB();
  }

  // 获取在线列表用户数据（支持分页）
  async getClients(options = {}) {
    const result = await this._sendWebSocketRequest(
      {
        type: "get_connections",
        password: this.password,
        ...options, // 可包含 page 和 pageSize 参数
      },
      "connections_info"
    );

    return result;
  }

  // 断开指定客户端连接
  async disconnectClient(clientId) {
    if (!clientId) {
      throw new Error("缺少客户端ID参数");
    }

    this.socket.send(
      JSON.stringify({
        type: "disconnect_client",
        clientId: clientId,
        password: this.password,
      })
    );
  }

  async syncRecords(callback) {
    try {
      // 获取总数
      const totalLength = await this.getOnlineRecordLength();
      const localCount = await this.getLocalRecordLength();

      if (localCount < totalLength) {
        // 获取本地db后那一条
        const lastItem = await this.getLocalLastRecord();

        const records = await this._syncRecords({
          gte: lastItem?.id,
          limit: 500,
        });

        callback && callback(records);

        // 如果还有未同步的记录，继续递归调用
        if (records.length >= 500) {
          await this.syncRecords(callback);
        }
      }
    } catch (error) {
      console.error("同步记录时出错:", error);
      throw error;
    }
  }

  async _syncRecords(options = {}) {
    const { records } = await this._sendWebSocketRequest(
      {
        type: "sync_records",
        password: this.password,
        ...options,
      },
      "sync_records"
    );

    await this.saveRecordsToLocal(records);

    return records;
  }

  // 获取在线的记录数量
  async getOnlineRecordLength() {
    const { length } = await this._sendWebSocketRequest(
      {
        type: "get_record_length",
        password: this.password,
      },
      "get_record_length"
    );

    return length;
  }

  async saveRecordsToLocal(records) {
    if (!records || records.length === 0) {
      return;
    }

    await this._indexedDBOperation((store) => {
      for (const record of records) {
        store.put(record);
      }
    }, "readwrite");
  }

  async getLocalLastRecord() {
    return this._indexedDBOperation((store) => {
      return store.openCursor(null, "prev");
    }, "readonly");
  }

  async getLocalRecordLength() {
    return this._indexedDBOperation((store) => {
      return store.count();
    }, "readonly");
  }

  initDB() {
    this._db = new Promise((resolve, reject) => {
      const request = indexedDB.open("AdminRecordsDB", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("records")) {
          db.createObjectStore("records", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
      request.onblocked = (event) => {
        console.warn("IndexedDB operation is blocked:", event);
      };
    });
  }

  // 通用的 IndexedDB 操作辅助方法
  async _indexedDBOperation(operation, mode = "readonly") {
    const db = await this._db;
    const transaction = db.transaction(["records"], mode);
    const store = transaction.objectStore("records");

    return new Promise((resolve, reject) => {
      try {
        const result = operation(store, transaction);

        if (result) {
          // 如果操作返回的是一个请求对象，处理其事件
          result.onsuccess = (event) => {
            if (result.result?.value) {
              // 游标返回值
              resolve(result.result.value);
            } else {
              resolve(result.result);
            }
          };
          result.onerror = (event) => {
            console.error("IndexedDB operation error:", event.target.error);
            reject(event.target.error);
          };
        } else {
          transaction.oncomplete = () => resolve();
          transaction.onerror = (event) => {
            console.error("保存记录到本地时出错:", event.target.error);
            reject(event.target.error);
          };
        }
      } catch (error) {
        console.error("IndexedDB operation error:", error);
        reject(error);
      }
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
}
