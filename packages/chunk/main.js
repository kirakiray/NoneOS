import { initDB } from "../util/init-db.js";
import { agentData } from "../fs/re-remote/base.js";
import { getHash } from "../fs/util.js";

const dbPool = {};

const getDB = async (userDirName) => {
  let db = dbPool[userDirName];

  if (!db) {
    db = initDB("noneos-" + userDirName);
    dbPool[userDirName] = db;
  }

  return db;
};

export const getChunk = async ({ hash, remoteUser, ...options }) => {
  const db = await getDB(remoteUser.self.dirName);

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
        // 如果没有找到，继续从其他数据源获取
        // options 中存放有真正的数据来源
        const chunk = await agentData(remoteUser, {
          name: "get-file-chunk",
          hash,
          path: options.path,
          index: options.index,
          chunkSize: options.chunkSize,
        });

        // TODO: 超时的话，要重新判断对方是否可连接，可连接时再发送获取chunk的请求

        // 计算hash是否正确
        const chunkHash = await getHash(chunk);

        if (chunkHash !== hash) {
          reject(
            new Error(
              `Hash not match. Path: ${options.path}, Index: ${options.index}, Expected: ${hash}, Actual: ${chunkHash}`
            )
          );
        }

        // 保存 chunk 到数据库
        await saveChunk({
          hash,
          chunk,
          userDirName: remoteUser.self.dirName,
        });

        resolve({ hash, chunk });
      }
    };

    request.onerror = () => {
      reject(new Error(`Failed to get chunk with hash: ${hash}`));
    };
  });
};

// 保存块到表中
export const saveChunk = async ({ hash, chunk, userDirName }) => {
  const db = await getDB(userDirName);

  debugger;

  // 保存 chunk 到数据库
  const transaction = db.transaction(["chunks"], "readwrite");
  const objectStore = transaction.objectStore("chunks");
  const request = objectStore.put({ hash, chunk });

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save chunk with hash: ${chunk.hash}`));
    };
  });
};
