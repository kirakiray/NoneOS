import { get } from "/packages/fs/main.js";
import { calculateFileChunkHashes, getHash } from "../../fs/util.js";
import { on } from "../../user/event.js";
import { connect } from "../connection/main.js";

const wokerPath = import.meta.resolve("./clear-cache-worker.js");

// 初始化缓存清理 Worker
const initCacheCleanupWorker = () => {
  if (!globalThis.window) {
    // 非浏览器环境，不启动缓存清理服务
    return;
  }
  if (globalThis.SharedWorker) {
    try {
      const worker = new SharedWorker(wokerPath, {
        name: "cacheCleanupWorker",
        type: "module",
      });
      worker.port.start();
      worker.port.postMessage("start");

      worker.port.onmessage = (e) => {
        console.log("来自缓存清理Worker的消息:", e.data);
      };

      return worker;
    } catch (err) {
      console.error("初始化缓存清理SharedWorker失败:", err);
    }
  } else {
    console.warn("SharedWorker 不可用，尝试使用 WebWorker。");
    return initWebWorkerFallback();
  }
};

const initWebWorkerFallback = () => {
  try {
    const worker = new Worker(wokerPath, { type: "module" });
    worker.postMessage("start");

    worker.onmessage = (e) => {
      console.log("来自缓存清理WebWorker的消息:", e.data);
    };

    return worker;
  } catch (err) {
    console.error("初始化缓存清理WebWorker失败:", err);
    return null;
  }
};

// 启动缓存清理Worker
initCacheCleanupWorker();

on("receive-user-data", async (e) => {
  const {
    useLocalUserDirName, // 目标本地用户目录名称
    data,
    fromUserId, // 消息来源用户ID
    // fromTabId, // 消息来源TabID
    tabConnection, // 消息来源TabConnection
  } = e;

  if (data instanceof ArrayBuffer || data instanceof Blob) {
    // firefox 带过来的居然是blob类型！！

    // 二进制类型的数据，直接写入到cache中
    cacheFile(data, {
      useLocalUserDirName,
    });
    return;
  }

  const { kind } = data;

  switch (kind) {
    case "get-chunks": {
      const { hashs } = data;
      const chunks = await getChunks(hashs, {
        useLocalUserDirName,
      });

      for (let chunk of chunks) {
        // 直接将块发送回去
        tabConnection.send(chunk);
      }

      break;
    }
  }
});

// 缓存文件的块，并返回块数据的id
export const cacheFile = async (
  file,
  {
    useLocalUserDirName, // 本地的用户目录
    chunkSize = 128 * 1024, // 块的大小
  }
) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  // 获取缓存用的文件夹
  const chunksDir = await get(`local/caches/${useLocalUserDirName}/chunks`, {
    create: "dir",
  });

  const infosDir = await get(`local/caches/${useLocalUserDirName}/infos`, {
    create: "dir",
  });

  const pms = [];

  const fileHash = await calculateFileChunkHashes(file, {
    chunkSize,
    callback: async (opts) => {
      const { chunkHash, chunk } = opts;
      pms.push(
        chunksDir
          .get(chunkHash, {
            create: "file",
          })
          .then((chunkHandle) => {
            return chunkHandle.write(chunk);
          }),
        infosDir
          .get(chunkHash, {
            create: "file",
          })
          .then((infoHandle) => {
            return infoHandle.write(
              JSON.stringify({
                time: Date.now(),
              })
            );
          })
      );
    },
  });

  // 等待写入所有数据
  await Promise.all(pms);

  return fileHash;
};

// 从缓存中获取文件
export const getChunks = async (
  hashs,
  {
    useLocalUserDirName, // 本地的用户目录
    fromUserId, // 如果本地找不到，则从这个用户请求
  }
) => {
  useLocalUserDirName = useLocalUserDirName || "main";

  // 获取缓存用的文件夹
  const chunksDir = await get(`local/caches/${useLocalUserDirName}/chunks`, {
    create: "dir",
  });

  // 获取已经存在的块数据
  const existsChunks = [];

  // 获取不存在的块数据
  const unexsteChunks = (
    await Promise.all(
      hashs.map(async (hash, index) => {
        const chunkHandle = await chunksDir.get(hash);
        if (chunkHandle) {
          existsChunks[index] = await chunkHandle.buffer();
          return null;
        }

        return hash;
      })
    )
  ).filter((e) => !!e);

  // 如果存在不存在的块数据，则向目标用户请求
  if (unexsteChunks.length && fromUserId) {
    const connection = await connect({
      userId: fromUserId,
      useLocalUserDirName,
    });

    await connection.watchUntil(() => connection.state === "ready");

    return new Promise(async (resolve, reject) => {
      //  超时监听
      let timer;

      const refreshTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          reject(
            new Error(
              `缓存同步超时：共${hashs.length}块，已接收${existsChunks.length}块，剩余${unexsteChunks.length}块`
            )
          );
          unObs();
        }, 1000 * 15);
      };

      let receivedChunks = 0; // 已接收的块数量
      let sentChunks = 0; // 已发送的块数量
      const needToSent = [...unexsteChunks];

      // 发送块数据
      // 每次发送是个块的数据
      const sendChunkData = (count = 10) => {
        count = Math.min(count, needToSent.length);

        sentChunks += count;

        if (count <= 0) {
          return;
        }

        // 向目标发送请求
        connection.send({
          kind: "get-chunks",
          // 对未存在的块数组进行去重
          hashs: needToSent.splice(0, count),
        });
      };

      // 监听块是否有收到
      const unObs = await chunksDir.observe(async (opts) => {
        const { path, type } = opts;
        if (type !== "write") {
          return;
        }

        // 获取块hash
        const fileName = path.split("/").pop();

        // 判断是否想要的块
        if (!unexsteChunks.includes(fileName)) {
          // 别的地方存储的块，不处理
          return;
        }

        const data = await (await get(path)).buffer();

        // 重新计算块的哈希是否正确
        const fileHash = await getHash(data);

        if (fileHash !== fileName) {
          // 哈希不正确，删除块
          chunksDir.get(fileName).then((handle) => {
            console.warn(
              `可能被恶意写入，删除 ${useLocalUserDirName} 用户目录的块 ${fileName}`
            );
            handle && handle.remove();
          });
          return;
        }

        // 哈希正确，添加到存在的块中
        // 获取所有匹配的索引位置
        const indexes = [...hashs].reduce((acc, hash, i) => {
          if (hash === fileName) {
            acc.push(i);
          }
          return acc;
        }, []);

        // 将数据写入到所有匹配的位置
        for (const index of indexes) {
          existsChunks[index] = data;
          console.log(
            `已接收块数据 [${index + 1}/${hashs.length}], 块哈希: ${fileHash}`
          );
        }

        receivedChunks++;

        if (receivedChunks >= sentChunks) {
          // 已经收到的块数量大于等于已经发送的块数量，则继续发送
          sendChunkData();
        }

        refreshTimer(); // 刷新超时时间

        // 判断是否所有块都已经收到
        if (existsChunks.filter((e) => !!e).length === hashs.length) {
          unObs();
          clearTimeout(timer);
          resolve(existsChunks);
        }
      });

      sendChunkData();
    });
  }

  return existsChunks;
};
