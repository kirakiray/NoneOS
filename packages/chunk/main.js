import { initDB } from "../util/init-db.js";
import { agentData } from "../fs/re-remote/base.js";

const dbPool = {};

export const getChunk = async ({ hash, remoteUser, ...options }) => {
  const dbName = "noneos-" + remoteUser.self.dirName;

  let db = dbPool[dbName];
  if (!db) {
    db = initDB(dbName);
    dbPool[dbName] = db;
  }

  db = await db;

  // 优先从表中查找
  const transaction = db.transaction(["chunks"], "readonly");
  const objectStore = transaction.objectStore("chunks");
  const request = objectStore.get(hash);

  return new Promise((resolve, reject) => {
    request.onsuccess = async () => {
      if (request.result) {
        // 如果在数据库中找到了 chunk，直接返回
        resolve(request.result);
      } else {
        debugger;

        // 如果没有找到，继续从其他数据源获取
        // options 中存放有真正的数据来源
        const chunk = await agentData(remoteUser, {
          name: "get-file-chunk",
          hash,
          path: options.path,
          index: options.index,
          chunkSize: options.chunkSize,
        });

        debugger;
      }
    };

    request.onerror = () => {
      reject(new Error(`Failed to get chunk with hash: ${hash}`));
    };
  });
};

// 保存块到表中
export const saveChunk = async ({ chunk, remoteUser, ...options }) => {
  const db = await initDB("noneos-" + remoteUser.self.dirName);

  debugger;

  // 保存 chunk 到数据库
  const transaction = db.transaction(["chunks"], "readwrite");
  const objectStore = transaction.objectStore("chunks");
  const request = objectStore.put(chunk);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(chunk);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save chunk with hash: ${chunk.hash}`));
    };
  });
};
