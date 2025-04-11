import { get } from "/packages/fs/main.js";
import { calculateFileChunkHashes, getHash } from "../../fs/util.js";
import { on } from "../../user/event.js";
import { connect } from "../connection/main.js";

on("receive-user-data", async (e) => {
  const {
    userDirName, // 目标本地用户目录名称
    data,
    fromUserId, // 消息来源用户ID
    // fromTabId, // 消息来源TabID
    tabConnection, // 消息来源TabConnection
  } = e;

  if (data instanceof ArrayBuffer) {
    // 二进制类型的数据，直接写入到cache中
    cacheFile(data, {
      userDirName,
    });
    return;
  }

  const { kind } = data;

  switch (kind) {
    case "get-chunks": {
      const { hashs } = data;
      const chunks = await getChunks(hashs, {
        userDirName,
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
    userDirName, // 本地的用户目录
    chunkSize = 128 * 1024, // 块的大小
  }
) => {
  userDirName = userDirName || "main";

  // 获取缓存用的文件夹
  const chunksDir = await get(`local/caches/${userDirName}/chunks`, {
    create: "dir",
  });

  const infosDir = await get(`local/caches/${userDirName}/infos`, {
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
    userDirName, // 本地的用户目录
    fromUserId, // 如果本地找不到，则从这个用户请求
  }
) => {
  userDirName = userDirName || "main";

  // 获取缓存用的文件夹
  const chunksDir = await get(`local/caches/${userDirName}/chunks`, {
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
    const connection = await connect({ userId: fromUserId, userDirName });

    await connection.watchUntil(() => connection.state === "ready");

    return new Promise((resolve, reject) => {
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

      // 监听块是否有收到
      const unObs = chunksDir.observe(async (opts) => {
        const { path, type, data } = opts;
        if (type !== "write") {
          return;
        }

        // 获取块hash
        const fileName = path.split("/").pop();

        // 判断是否想要的块
        if (!unexsteChunks.includes(fileName)) {
          return;
        }

        // 重新计算块的哈希是否正确
        const fileHash = await getHash(data);

        if (fileHash !== fileName) {
          // 哈希不正确，删除块
          chunksDir.get(fileName).then((handle) => {
            console.warn(
              `可能被恶意写入，删除 ${userDirName} 用户目录的块 ${fileName}`
            );
            handle && handle.remove();
          });
          return;
        }

        // 哈希正确，添加到存在的块中
        // 获取所有匹配的索引位置
        const indexes = hashs.reduce((acc, hash, i) => {
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

        refreshTimer(); // 刷新超时时间

        // 判断是否所有块都已经收到
        if (existsChunks.length === hashs.length) {
          unObs();
          resolve(existsChunks);
          clearTimeout(timer);
        }
      });

      // 向目标发送请求
      connection.send({
        kind: "get-chunks",
        // 对未存在的块数组进行去重
        hashs: [...new Set(unexsteChunks)],
      });
    });
  }

  return existsChunks;
};
