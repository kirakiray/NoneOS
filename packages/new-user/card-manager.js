import { initDB } from "../util/init-db.js";
import { verify } from "./util/verify.js";
import { getHash } from "../fs/util.js";

export class CardManager extends EventTarget {
  #self;
  #db = null;
  constructor(user) {
    super();
    this.#self = user;
  }

  async init() {
    this.#db = await initDB("noneos-" + this.#self.dirName);
  }

  async save(cardData) {
    // 验证数据完整性
    const requiredKeys = [
      "name",
      "userId",
      "publicKey",
      "signTime",
      "signature",
    ];

    if (!requiredKeys.every((key) => key in cardData)) {
      throw new Error(
        `数据不完整，缺少必要字段: ${requiredKeys
          .filter((key) => !(key in cardData))
          .join(", ")}`
      );
    }

    // 对比用户id
    const keyUserId = await getHash(cardData.publicKey);

    if (keyUserId !== cardData.userId) {
      throw new Error("用户ID与公钥不匹配");
    }

    // 验证签名
    const result = await verify(cardData);

    if (!result) {
      throw new Error("卡片签名验证失败");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(["cards"], "readwrite");
      const objectStore = transaction.objectStore("cards");

      const request = objectStore.put(cardData);

      request.onsuccess = () => {
        resolve(cardData);
        this.dispatchEvent(
          new CustomEvent("update", {
            detail: cardData,
          })
        );
      };

      request.onerror = () => {
        reject(new Error("保存卡片失败"));
      };
    });
  }

  async get(options) {
    let userId, signature; // 如果有userId，就根据userId查询；如果有signature，就根据signature查询；userId优先；

    if (typeof options === "string") {
      userId = options;
    } else if (options.userId || options.signature) {
      ({ userId, signature } = options);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(["cards"], "readonly");
      const objectStore = transaction.objectStore("cards");

      let request;
      if (userId) {
        // 根据 userId 查询
        request = objectStore.get(userId);
      } else if (signature) {
        // 根据 signature 查询
        const index = objectStore.index("signature");
        request = index.get(signature);
      } else {
        reject(new Error("必须提供 userId 或 signature"));
        return;
      }

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error("查询卡片失败"));
      };
    });
  }

  async delete(userId) {
    if (!userId) {
      throw new Error("必须提供 userId");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(["cards"], "readwrite");
      const objectStore = transaction.objectStore("cards");

      const request = objectStore.delete(userId);

      request.onsuccess = () => {
        resolve(userId);
      };

      request.onerror = () => {
        reject(new Error("删除卡片失败"));
      };
    });
  }

  bind(eventName, callback) {
    this.addEventListener(eventName, callback);

    return () => {
      this.removeEventListener(eventName, callback);
    };
  }
}
