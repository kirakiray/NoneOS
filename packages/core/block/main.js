import { EverCache } from "../../libs/ever-cache/main.js";
import { get } from "../../fs/handle/index.js";
import { users, blocks } from "../main.js";
import {
  CHUNK_REMOTE_SIZE,
  calculateHash,
  splitIntoBlobs,
} from "../../fs/util.js";

export const waitingBlocks = {}; //blocks 存放promise的对象
export const waitingBlocksResolver = {};

const storage = new EverCache("noneos-blocks-data");

{
  // 定时清除超长的块数据
  blocks.watchTick(() => {
    if (blocks.length > 100) {
      blocks.splice(70);
    }
  }, 100);

  // 定时清除块数据
  let timer = null;
  const scheduledClear = async () => {
    const maxTime = 1000 * 60 * 10;

    // 需要移除的数据
    const needRemove = [];

    try {
      for await (let [key, value] of storage.entries()) {
        const diffTime = Date.now() - value.time;

        if (diffTime > maxTime) {
          needRemove.push(key);
        }
      }

      // 主要缓存的文件夹
      const blocksCacheDir = await get("local/caches/blocks", {
        create: "dir",
      });

      if (needRemove.length) {
        await Promise.all(
          needRemove.map(async (key) => {
            await storage.removeItem(key);
            const targetFile = await blocksCacheDir.get(key);
            targetFile && (await targetFile.remove());
          })
        );
      }

      // console.log("clear cache: ", needRemove.length);
    } catch (err) {
      console.error(err);
    }

    clearTimeout(timer);
    timer = setTimeout(() => scheduledClear(), 1000 * 60); // 一分钟检查一次数据并清除

    return needRemove;
  };

  scheduledClear(); // 定时
}

// 将数据保存到本地，等待对方来获取块数据
export const saveData = async ({ data, path, reason, userId }) => {
  const blobs = await splitIntoBlobs(data, CHUNK_REMOTE_SIZE);

  return await saveBlock(blobs, {
    reason,
    reasonData: { path, userId },
  });
};

/**
 * 根据块信息，获取块的数据
 * @param {Object} options - 参数对象
 * @param {Array<string>} options.hashs - 块的哈希数组，用于标识特定块
 * @param {string} options.userId - 从哪个用户获取块数据
 * @param {string} options.path - 访问数据来源于文件的路径
 * @returns {string|ArrayBuffer} 返回包含块集合的数据
 */
export const getData = async ({ hashs, userId, reason, path }) => {
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

  const reasonData = { path };
  if (targetUser) {
    reasonData.userId = targetUser.userId;
  }
  const blocks = await getBlock(hashs, { reason, reasonData });

  // 需要请求的哈希文件块
  const needToRequesHashs = [];

  blocks.forEach((item) => {
    if (!item.data) {
      needToRequesHashs.push(item.hash);
    }
  });

  if (needToRequesHashs.length) {
    // 挂起本地任务
    targetUser.send({
      type: "get-block",
      path,
      hashs: needToRequesHashs,
    });
  }

  // 获取所有的块数据
  const blobs = await Promise.all(
    blocks.map(async (opt) => {
      const { hash, data } = opt;

      if (data) {
        return data;
      }

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
  return new Blob(blobs);
};

// 将块数据保存到本地
export const saveBlock = async (chunks, { reason, reasonData }) => {
  // const reasonData = {
  //   path: "", // 缓存文件的来源
  // };

  // 主要缓存的文件夹
  const blocksCacheDir = await get("local/caches/blocks", {
    create: "dir",
  });

  const hashs = await Promise.all(
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

  blocks.unshift({
    type: "save",
    hashs,
    time: Date.now(),
    reason,
    reasonData,
  });

  return hashs;
};

// 从缓存中获取数据
export const getBlock = async (hashs, { reason, reasonData }) => {
  // 主要缓存的文件夹
  const blocksCacheDir = await get("local/caches/blocks", {
    create: "dir",
  });

  const exists = []; // 已存在的块数据

  const reData = await Promise.all(
    hashs.map(async (hash) => {
      const handle = await blocksCacheDir.get(hash);

      if (handle) {
        exists.push(hash);
        return { hash, data: await handle.file() };
      }

      return { hash };
    })
  );

  blocks.unshift({
    type: "get",
    hashs,
    time: Date.now(),
    reasonData: { exists, ...reasonData },
    reason,
  });

  return reData;
};

// 清除块数据
export const clearBlock = async (hashs, { reason, reasonData }) => {
  // 主要缓存的文件夹
  const blocksCacheDir = await get(`local/caches/blocks`);

  await Promise.all(
    hashs.map(async (hash) => {
      const cacheHandle = await blocksCacheDir.get(hash);

      if (cacheHandle) {
        await cacheHandle.remove();
        await storage.removeItem(hash);
      }
    })
  );

  blocks.unshift({
    type: "clear",
    hashs,
    time: Date.now(),
    reason,
    reasonData,
  });
};
