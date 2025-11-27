import { get } from "/packages/fs/main.js";
import { setting } from "/packages/fs/fs-remote/file.js";
import { getFileChunkHashesAsync, getHash } from "/packages/util/hash/main.js";

/**
 * 通过计算文件哈希值准备发送任务
 * @param {Array} files - 要发送的文件数组
 * @param {Function} callback - 进度回调函数
 * @returns {Object} 包含taskHash和files的对象
 */
export const prepareSendTask = async (files, callback) => {
  // 将文件映射为内部格式
  const processedFiles = files.map((file) => ({
    name: file.name,
    size: file.size,
    _file: file._file,
  }));

  let calculatedHashCount = 0;

  // 为每个文件计算哈希值
  for (const file of processedFiles) {
    // 通知进度
    callback({
      calculatingHashFileName: file.name,
    });

    try {
      file.hashes = await getFileChunkHashesAsync(file._file, {
        chunkSize: setting.chunkSize,
      });

      // 根据块哈希值计算文件哈希值
      file.hash = await getHash(file.hashes.join(""));

      calculatedHashCount++;

      // 更新进度
      callback({
        calculatingHashFileName: file.name,
        calculateHashCount: calculatedHashCount,
      });
    } catch (error) {
      console.error(`计算文件 ${file.name} 的哈希值时出错:`, error);
      throw error;
    }
  }

  // 按大小降序排列文件以确定任务ID
  const filesSortedBySize = [...processedFiles].sort((a, b) => b.size - a.size);

  // 根据文件哈希值计算任务哈希值
  const taskHash = await getHash(
    filesSortedBySize.map((file) => file.hash).join("")
  );

  return {
    taskHash,
    files: processedFiles,
  };
};

/**
 * 初始化发送任务
 * @param {Object} params - 参数对象
 * @param {Object} params.localUser - 本地用户对象
 * @param {Object} params.remoteUser - 远程用户对象
 * @param {string} params.taskHash - 任务哈希值
 * @param {Array} params.files - 文件数组
 */
export const startSendTask = async ({
  localUser,
  remoteUser,
  taskHash,
  files,
  callback,
}) => {
  // TODO: 实现发送任务初始化
  console.log("正在初始化发送任务:", { localUser, taskHash, files });

  const fileMap = new Map(files.map((file) => [file.hash, file]));

  let sessionId = null;

  // 监听文件接受的情况
  const unsubscribeAckListener = localUser.bind("receive-data", async (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    if (fromUserSessionId === sessionId && fromUserId === remoteUser.userId) {
      const { fileHash, chunkHash, kind } = data;

      if (kind === "request-chunk") {
        // 查找到目标文件，并切取块进行发送
        const targetItem = fileMap.get(fileHash);

        if (!targetItem) {
          console.error(`未找到文件哈希值为 ${fileHash} 的文件`);
          return;
        }

        const chunkIndex = targetItem.hashes.indexOf(chunkHash);

        if (chunkIndex === -1) {
          console.error(`未找到块哈希值为 ${chunkHash} 的文件块`);
          return;
        }

        // 调用回调函数通知开始发送块
        if (callback) {
          callback({
            type: "send-chunk",
            fileHash,
            name: targetItem.name,
            sent: chunkIndex, // 当前发送的块索引
            total: targetItem.hashes.length, // 总块数
          });
        }

        const chunk = await targetItem._file.slice(
          chunkIndex * setting.chunkSize,
          (chunkIndex + 1) * setting.chunkSize
        );

        // debug: 添加延迟方便调试
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 发送给对方
        remoteUser.post(
          {
            kind: "file-chunk",
            fileHash,
            chunkHash,
            taskHash,
            chunk: new Uint8Array(await chunk.arrayBuffer()),
          },
          sessionId
        );

        // 检查是否是最后一个块，如果是则调用文件发送完成的回调
        if (chunkIndex === targetItem.hashes.length - 1 && callback) {
          callback({
            type: "file-sent",
            fileHash,
            name: targetItem.name,
            sent: targetItem.hashes.length,
            total: targetItem.hashes.length,
          });
        }
      }
    }
  });

  // 锁定双方的sessionId
  const cancel = localUser.register(
    `warp-confirm-both-session-${taskHash}-${remoteUser.userId}`,
    (e) => {
      sessionId = e.fromUserSessionId;

      // 想对方发送确认信息
      remoteUser.post(
        {
          kind: "confirm-both-session",
          taskHash,
        },
        sessionId
      );

      cancel();
    }
  );

  return {
    unsubscribe: unsubscribeAckListener,
  };
};

/**
 * 保存已准备的接收任务
 * @param {Object} data - 要保存的任务数据
 */
export const saveReceivedTask = async (taskData) => {
  const { taskHash } = taskData;

  try {
    // 写入临时目录
    const tempRootDir = await get("local/temp/received", { create: "dir" });

    // 创建任务目录
    const taskDir = await tempRootDir.get(taskHash, {
      create: "dir",
    });

    // 写入主数据文件
    const mainDataFile = await tempRootDir.get(`${taskHash}.json`, {
      create: "file",
    });

    await mainDataFile.write(
      JSON.stringify(
        {
          taskHash: taskData.taskHash,
          files: taskData.files,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("保存任务时出错:", error);
    throw error;
  }
};

/**
 * 初始化接收任务
 * @param {Object} params - 参数对象
 * @param {Object} params.localUser - 本地用户对象
 * @param {Object} params.remoteUser - 远程用户对象
 * @param {string} params.taskHash - 任务哈希值
 * @returns {Object} 包含取消函数的对象
 */
export const startReceiveTask = async ({
  localUser,
  remoteUser,
  taskHash,
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
        const { data, fromUserSessionId, fromUerId } = e.detail;

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
            console.error(`未找到块哈希值为 ${chunkHash} 的文件块`);
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
    remoteUser.trigger(
      `warp-confirm-both-session-${taskHash}-${localUser.userId}`
    );

    (async () => {
      // 从本地文件获取参考信息，并向对方获取缺失的块信息
      for (let item of mainData.files) {
        const { hash: fileHash, hashes } = item;

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

        // 写入文件
        const fileHandle = await taskDir.get(item.name, {
          create: "file",
        });
        await fileHandle.write(file);

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

        // TODO: 通知对方取消发送任务
        debugger;
      },
    };
  } catch (error) {
    console.error("初始化接收任务时出错:", error);
    throw error;
  }
};
