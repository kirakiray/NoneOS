import { EverCache } from "../../libs/ever-cache/main.js";
import { get } from "../../fs/handle/index.js";
import { waitingBlocks, waitingBlocksResolver, users } from "../main.js";
import {
  CHUNK_REMOTE_SIZE,
  calculateHash,
  splitIntoChunks,
  mergeChunks,
} from "../../fs/util.js";

const storage = new EverCache("noneos-blocks-data");

// 将数据保存到本地，等待对方来获取块数据
export const saveData = async ({ data }) => {
  const chunks = await splitIntoChunks(data, CHUNK_REMOTE_SIZE);

  return await saveBlock(chunks);
};

// 将块数据保存到本地
export const saveBlock = async (chunks) => {
  // 主要缓存的文件夹
  const blocksCacheDir = await get("local/caches/blocks", {
    create: "dir",
  });

  return Promise.all(
    chunks.map(async (chunk) => {
      const hash = await calculateHash(chunk);

      // 保存缓存文件的信息
      storage.setItem(hash, {
        time: Date.now(),
      });

      const fileHandle = await blocksCacheDir.get(hash, {
        create: "file",
      });

      await fileHandle.write(chunk);

      // 触发记录中的块请求
      if (waitingBlocksResolver[hash]) {
        waitingBlocksResolver[hash].resolve(chunk);
      }

      return hash;
    })
  );
};

/**
 * 根据块信息，获取块的数据
 * @param {Object} options - 参数对象
 * @param {Array<string>} options.hashs - 块的哈希数组，用于标识特定块
 * @param {string} options.userId - 从哪个用户获取块数据
 * @returns {string|ArrayBuffer} 返回包含块集合的数据
 */
export const getData = async ({ hashs, userId }) => {
  let reHashs = hashs;

  // TODO: 先从本地看看缓存了多少数据
  let targetUser;
  if (userId) {
    targetUser = users.find((e) => e.userId === userId);
  } else {
    // TODO: 从众多用户中获取对应的块数据
    debugger;
  }

  if (!targetUser) {
    // TODO: 查找不到用户，需要处理
    debugger;
  }

  // 挂起本地任务
  targetUser.send({
    type: "get-block",
    hashs,
  });

  // 获取所有的块数据
  const chunks = await Promise.all(
    reHashs.map(async (hash) => {
      let targetPms = waitingBlocks[hash];

      if (!targetPms) {
        targetPms = waitingBlocks[hash] = new Promise((resolve, reject) => {
          let clear = () => {
            clear = null;
            delete waitingBlocks[hash];
            delete waitingBlocksResolver[hash];
          };

          waitingBlocksResolver[hash] = {
            resolve(data) {
              resolve(data);
              clear();
            },
            reject(data) {
              reject(data);
              clear();
            },
          };
        });
      }

      return targetPms;
    })
  );

  // 合并所有块数据
  return await mergeChunks(chunks);
};
