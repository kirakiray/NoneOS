import { get } from "/packages/fs/main.js";
import { setting } from "/packages/fs/fs-remote/file.js";
import { getFileChunkHashesAsync, getHash } from "/packages/util/hash/main.js";

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

    let sessionIDResolve;
    let sessionId = new Promise((res) => {
      sessionIDResolve = res;
    });

    const unsubscribeDataListener = localUser.bind(
      "receive-data",
      async (e) => {
        const { data, fromUserSessionId, fromUserId } = e.detail;

        if (
          data.kind === "confirm-both-session" &&
          data.taskHash === taskHash
        ) {
          // 确认对方的sessionId
          sessionIDResolve(fromUserSessionId);
          return;
        }

        // 将块数据保存到本地
        const fileTempDir = await taskDir.get(`__warp_temp_${data.fileHash}`, {
          create: "dir",
        });

        // 保存块数据
        const chunkHandle = await fileTempDir.get(data.chunkHash, {
          create: "file",
        });

        const blob = new Blob([data.chunk]);

        await chunkHandle.write(blob);

        if (data.kind === "file-chunk") {
          const { chunkHash } = data;

          // 返回数据
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

    const chunkGetter = new Map();

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

      let timer = setInterval(async () => {
        // 5秒后重新发送请求
        remoteUser.post(
          {
            kind: "request-chunk",
            taskHash,
            fileHash,
            chunkHash,
          },
          await sessionId
        );
      }, 5000);

      pms.then(() => {
        // 成功获取到chunk，清除定时器
        clearInterval(timer);
      });

      // 没有chunk，从远端获取，先设置Promise，等chunk返回再resolve
      chunkGetter.set(chunkHash, {
        fileHash,
        resolve,
      });

      // 发送请求
      remoteUser.post(
        {
          kind: "request-chunk",
          taskHash,
          fileHash,
          chunkHash,
        },
        await sessionId
      );

      return pms;
    };

    let mainDataFile = await tempDir.get(`${taskHash}.json`);

    // 整体的项目数据
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

    (async () => {
      // 从本地文件获取参考信息，并向对方获取缺失的块信息
      for (let item of mainData.files) {
        const { hash: fileHash, hashes } = item;

        // 判断是否已经保存到本地
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

        const chunks = [];

        let loaded = 0;

        for (let index = 0; index < hashes.length; index++) {
          const chunkHash = hashes[index];
          const chunk = await getChunk(fileHash, chunkHash);
          chunks[index] = chunk;

          loaded++;

          callback({
            type: "load-chunk",
            fileHash,
            name: item.name,
            loaded,
            total: hashes.length,
          });
        }

        // 合并成一个文件
        const file = new File(chunks, item.name);

        if (targetDirHandle) {
          // 写入文件
          const fileHandle = await targetDirHandle.get(item.name, {
            create: "file",
          });
          await fileHandle.write(file);
        } else {
          // 写入文件
          const fileHandle = await taskDir.get(item.name, {
            create: "file",
          });
          await fileHandle.write(file);
        }

        callback({
          type: "save-file",
          fileHash,
          name: item.name,
        });

        setTimeout(async () => {
          const fileTempDir = await taskDir.get(`__warp_temp_${fileHash}`);

          // 删除缓存
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
