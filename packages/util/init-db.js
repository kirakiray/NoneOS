export async function initDB(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 3);

    request.onerror = (event) => {
      reject(new Error(`Database error: ${event.target.error}`));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建缓存块用的存储空间 (table)
      if (!db.objectStoreNames.contains("chunks")) {
        const objectStore = db.createObjectStore("chunks", {
          keyPath: "hash",
        });

        // 创建索引
        objectStore.createIndex("hash", "hash", { unique: true });
      }

      // 创建证书用的存储空间 (table)
      if (!db.objectStoreNames.contains("certificates")) {
        const objectStore = db.createObjectStore("certificates", {
          keyPath: "id",
        });

        // 创建复合索引
        objectStore.createIndex(
          "role_issuedBy_issuedTo",
          ["role", "issuedBy", "issuedTo"],
          { unique: false }
        );
        objectStore.createIndex("issuedBy_issuedTo", ["issuedBy", "issuedTo"], {
          unique: false,
        });
        objectStore.createIndex("role_issuedBy", ["role", "issuedBy"], {
          unique: false,
        });
        objectStore.createIndex("role_issuedTo", ["role", "issuedTo"], {
          unique: false,
        });

        // 创建其他可能有用的索引
        objectStore.createIndex("role", "role", { unique: false });
        objectStore.createIndex("issuedBy", "issuedBy", { unique: false });
        objectStore.createIndex("issuedTo", "issuedTo", { unique: false });
      }

      // 创建卡片用的存储空间 (table)
      if (!db.objectStoreNames.contains("cards")) {
        const objectStore = db.createObjectStore("cards", {
          keyPath: "userId",
        });

        // signature 索引
        objectStore.createIndex("signature", "signature", { unique: true });
      }
    };
  });
}
