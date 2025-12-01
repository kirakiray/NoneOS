import { get } from "/packages/fs/main.js";
import { asyncPool } from "/packages/util/async-pool.js";

/**
 * 初始化接收任务
 * @param {Object} params - 参数对象
 * @param {Object} params.localUser - 本地用户对象
 * @param {Object} params.remoteUser - 远程用户对象
 * @param {string} params.taskHash - 任务哈希值
 * @param {Object} params.handle - 实际保存文件的目标目录句柄
 * @param {Function} params.callback - 回调函数
 * @returns {Object} 包含取消函数的对象
 */
export const startReceiveTask = async ({
  localUser,
  remoteUser,
  taskHash,
  handle: targetDirHandle,
  callback,
}) => {
  try {
    const tempDir = await get("local/temp/received", { create: "dir" });
    const taskDir = await tempDir.get(`${taskHash}`);

    // Session ID promise
    let sessionIDResolve;
    const sessionId = new Promise((res) => {
      sessionIDResolve = res;
    });

    // Chunk getter map
    const chunkGetter = new Map();

    const unsubscribeDataListener = localUser.bind(
      "receive-data",
      async (e) => {
        const { data, fromUserSessionId } = e.detail;

        if (
          data.kind === "confirm-both-session" &&
          data.taskHash === taskHash
        ) {
          // 确认对方的sessionId
          sessionIDResolve(fromUserSessionId);
          return;
        }

        // 保存块数据到本地
        const fileTempDir = await taskDir.get(`__warp_temp_${data.fileHash}`, {
          create: "dir",
        });

        const chunkHandle = await fileTempDir.get(data.chunkHash, {
          create: "file",
        });

        const blob = new Blob([data.chunk]);
        await chunkHandle.write(blob);

        if (data.kind === "file-chunk") {
          const { chunkHash } = data;
          const chunkHandle = chunkGetter.get(chunkHash);

          if (chunkHandle) {
            chunkHandle.resolve(blob);
          } else {
            console.error(
              `未在缓存中找到块哈希 ${chunkHash} 对应的 resolve，可能已返回、超时或未注册`
            );
          }
        }
      }
    );

    // 获取块操作
    const getChunk = async (fileHash, chunkHash) => {
      const fileTempDir = await taskDir.get(`__warp_temp_${fileHash}`, {
        create: "dir",
      });

      const chunkHandle = await fileTempDir.get(chunkHash);

      if (chunkHandle) {
        // TODO: 有缓存的情况下，验证chunk真实性
        debugger;
        // TODO: 返回chunk
        return chunkHandle.file();
      }

      let resolve;
      const pms = new Promise((res) => {
        resolve = res;
      });

      const requestData = {
        kind: "request-chunk",
        taskHash,
        fileHash,
        chunkHash,
      };

      const timer = setInterval(async () => {
        // 5秒后重新发送请求
        remoteUser && remoteUser.post(requestData, await sessionId);
      }, 5000);

      pms.then(() => clearInterval(timer)); // 成功获取到chunk，清除定时器

      // 没有chunk，从远端获取，先设置Promise，等chunk返回再resolve
      chunkGetter.set(chunkHash, {
        fileHash,
        resolve,
      });

      // 发送请求
      remoteUser && remoteUser.post(requestData, await sessionId);

      return pms;
    };

    // 获取主数据文件
    const mainDataFile = await tempDir.get(`${taskHash}.json`);
    const mainData = await mainDataFile.json();

    callback({
      type: "init",
      data: mainData,
    });

    // 通知对方我准备好了
    remoteUser &&
      remoteUser.trigger(
        `warp-confirm-both-session-${taskHash}-${localUser.userId}`
      );

    // 处理文件接收
    (async () => {
      for (const item of mainData.files) {
        const { hash: fileHash, hashes } = item;

        // 检查文件是否已存在且完整
        const fileHandle = await taskDir.get(item.name);
        if (fileHandle) {
          const size = await fileHandle.size();
          if (size === item.size) {
            // 文件已经缓存完毕
            callback({
              type: "skip-file",
              fileHash,
              name: item.name,
            });
            continue;
          }
        }

        // 下载文件块（使用 asyncPool 控制并发）
        const chunks = await asyncPool(
          hashes,
          async (chunkHash, index) => {
            const chunk = await getChunk(fileHash, chunkHash);

            callback({
              type: "load-chunk",
              fileHash,
              name: item.name,
              loaded: index + 1,
              total: hashes.length,
            });

            return chunk;
          },
          Number(localStorage.getItem("chunkConcurrency")) || 4
        );

        // 合并文件并保存
        const file = new File(chunks, item.name);
        const saveHandle = targetDirHandle
          ? await targetDirHandle.get(item.name, { create: "file" })
          : await taskDir.get(item.name, { create: "file" });

        await saveHandle.write(file);

        callback({
          type: "save-file",
          fileHash,
          name: item.name,
        });

        // 延迟删除临时文件
        setTimeout(async () => {
          const fileTempDir = await taskDir.get(`__warp_temp_${fileHash}`);
          await fileTempDir.remove();
        }, 500);
      }
    })();

    return {
      unsubscribe: () => {
        unsubscribeDataListener();
      },
    };
  } catch (error) {
    console.error("初始化接收任务时出错:", error);
    throw error;
  }
};
