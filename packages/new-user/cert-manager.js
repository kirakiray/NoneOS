import { verify } from "./util/verify.js";
import { initDB } from "./util/init-db.js";

export default class CertManager {
  #user;
  #dbName;
  #db;

  constructor(name, user) {
    this.#user = user;
    this.#dbName = "noneos-" + name;
  }

  // 初始化数据库
  async initDB() {
    this.#db = await initDB(this.#dbName);
  }

  // 使用自己的用户签名给目标用户签发证书
  async issue({ userId, role, ...data }) {
    // 对数据进行签名
    const signedData = await this.#user.sign({
      ...data,
      role,
      issuedBy: this.#user.userId,
      issuedTo: userId,
    });

    // 保存证书到数据库
    return this.save(signedData);
  }

  // 查询数据库中所有符合条件的证书数据
  async query({ role, issuedBy, issuedTo }) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(["certificates"], "readonly");
      const objectStore = transaction.objectStore("certificates");

      // 根据提供的条件选择合适的索引和查询方式
      let request;

      if (
        role !== undefined &&
        issuedBy !== undefined &&
        issuedTo !== undefined
      ) {
        // 三个条件都存在，使用复合索引
        const index = objectStore.index("role_issuedBy_issuedTo");
        request = index.getAll(IDBKeyRange.only([role, issuedBy, issuedTo]));
      } else if (role !== undefined && issuedBy !== undefined) {
        // 只有 role 和 issuedBy 存在
        const index = objectStore.index("role_issuedBy");
        request = index.getAll(IDBKeyRange.only([role, issuedBy]));
      } else if (role !== undefined && issuedTo !== undefined) {
        // 只有 role 和 issuedTo 存在
        const index = objectStore.index("role_issuedTo");
        request = index.getAll(IDBKeyRange.only([role, issuedTo]));
      } else if (issuedBy !== undefined && issuedTo !== undefined) {
        // 只有 issuedBy 和 issuedTo 存在
        const index = objectStore.index("issuedBy_issuedTo");
        request = index.getAll(IDBKeyRange.only([issuedBy, issuedTo]));
      } else if (role !== undefined) {
        // 只有 role 存在
        const index = objectStore.index("role");
        request = index.getAll(IDBKeyRange.only(role));
      } else if (issuedBy !== undefined) {
        // 只有 issuedBy 存在
        const index = objectStore.index("issuedBy");
        request = index.getAll(IDBKeyRange.only(issuedBy));
      } else if (issuedTo !== undefined) {
        // 只有 issuedTo 存在
        const index = objectStore.index("issuedTo");
        request = index.getAll(IDBKeyRange.only(issuedTo));
      } else {
        // 没有条件，获取所有证书
        request = objectStore.getAll();
      }

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Query failed"));
      };
    });
  }

  // 获取我的对应条件的证书
  async get({ role, issuedTo }) {
    // 查询数据库中是否存在该证书
    const certs = await this.query({
      role,
      issuedBy: this.#user.userId,
      issuedTo,
    });

    return certs;
  }

  // 查询数据库中是否存在该证书
  async has({ role, issuedTo }) {
    const certs = await this.get({ role, issuedTo });

    return certs.length > 0;
  }

  // 保存证书到数据库
  async save(data) {
    // 如果不含有下面字段，则是非法的数据
    const keys = [
      "role",
      "issuedBy",
      "issuedTo",
      "publicKey",
      "signTime",
      "signature",
    ];

    if (!keys.every((key) => key in data)) {
      throw new Error(
        `数据不完整，缺少必要字段: ${keys
          .filter((key) => !(key in data))
          .join(", ")}`
      );
    }

    const result = await verify(data);

    if (!result) {
      throw new Error("证书验证失败");
    }

    // 添加时间戳作为ID以确保唯一性
    const id = `${data.role}-${data.issuedBy}-${data.issuedTo}}`;
    const certData = {
      id,
      ...data,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(["certificates"], "readwrite");
      const objectStore = transaction.objectStore("certificates");

      const request = objectStore.put(certData);

      request.onsuccess = () => {
        // 从返回的数据中删除ID，确保ID不可修改
        delete certData.id;

        Object.defineProperty(certData, "id", {
          writable: false,
          value: id,
        });

        resolve(certData);
      };

      request.onerror = () => {
        reject(new Error("Save failed"));
      };
    });
  }

  // 删除数据库中存在的该证书
  async delete(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(["certificates"], "readwrite");
      const objectStore = transaction.objectStore("certificates");

      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve(id);
      };

      request.onerror = () => {
        reject(new Error("Delete query failed"));
      };
    });
  }
}
