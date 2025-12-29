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
        console.error("IndexedDB error:", event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }

  // 获取在线列表用户数据（支持分页）
  async getClients(options = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // 等待服务器响应
      this.socket.send(
        JSON.stringify({
          type: "get_connections",
          password: this.password,
          ...options, // 可包含 page 和 pageSize 参数
        })
      );

      return new Promise((resolve, reject) => {
        const listener = (event) => {
          const { type, clients, pagination } = event.detail;
          if (type === "connections_info") {
            this.removeEventListener("message", listener);
            resolve({ clients, pagination });
          }
        };
        this.addEventListener("message", listener);
      });
    } else {
      throw new Error("WebSocket连接未建立，无法发送刷新请求");
    }
  }

  // 获取所有在线列表用户数据（自动处理分页）
  async getAllClients() {
    const allClients = [];
    let page = 1;
    const pageSize = 50; // 每页获取50条记录

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { clients, pagination } = await this.getClients({ page, pageSize });
      allClients.push(...clients);

      // 如果当前页是最后一页，则退出循环
      if (page >= pagination.totalPages) {
        break;
      }

      page++;
    }

    return allClients;
  }

  // 断开指定客户端连接
  async disconnectClient(clientId) {
    if (!clientId) {
      throw new Error("缺少客户端ID参数");
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "disconnect_client",
          clientId: clientId,
          password: this.password,
        })
      );
    } else {
      throw new Error("WebSocket连接未建立，无法发送断开请求");
    }
  }

  async saveRecordsToLocal(records) {
    const db = await this._db;
    if (!db) throw new Error("IndexedDB not initialized.");
    const transaction = db.transaction(["records"], "readwrite");
    const store = transaction.objectStore("records");
    for (const record of records) {
      store.put(record);
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
    });
  }

  async getLastRecord() {
    const db = await this._db;
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
        reject(event.target.error);
      };
    });
  }

  async getRecordLength() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "get_record_length",
          password: this.password,
        })
      );

      return new Promise((resolve, reject) => {
        const listener = async (event) => {
          const { type, length } = event.detail;
          if (type === "get_record_length") {
            try {
              this.removeEventListener("message", listener);
              resolve(length);
            } catch (error) {
              reject(error);
            }
          }
        };

        this.addEventListener("message", listener);
      });
    } else {
      throw new Error("WebSocket连接未建立，无法发送请求");
    }
  }

  async syncRecords() {
    // 获取总数
    const totalLength = await this.getRecordLength();

    // 获取本地db后那一条
    const lastItem = await this.getLastRecord();

    await this._syncRecords({
      gte: lastItem?.id,
      limit: 100,
    });
  }

  async _syncRecords(options = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "sync_records",
          password: this.password,
          ...options,
        })
      );

      return new Promise((resolve, reject) => {
        const listener = async (event) => {
          const { type, records } = event.detail;
          if (type === "sync_records") {
            try {
              await this.saveRecordsToLocal(records);
              this.removeEventListener("message", listener);
              resolve(records);
            } catch (error) {
              reject(error);
            }
          }
        };

        this.addEventListener("message", listener);
      });
    } else {
      throw new Error("WebSocket连接未建立，无法发送请求");
    }
  }
}
