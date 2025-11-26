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
}) => {
  // TODO: 实现发送任务初始化
  console.log("正在初始化发送任务:", { localUser, taskHash, files });

  let sessionId = null;

  // 监听文件接受的情况
  const cancel2 = localUser.bind("receive-data", (e) => {
    const { data, fromUserId, fromUserSessionId } = e.detail;

    if (fromUserSessionId === sessionId && data.kind === "ack") {
      const { fileHash, chunkHash } = data;

      console.log("得到返回结果:", data);
    }
  });

  // 开始尽心进行发送文件
  const run = async () => {
    for (let item of files) {
      const { _file: file, hashes, hash: fileHash } = item;

      // 进行分块操作
      let id = 0;
      for (let chunkHash of hashes) {
        const chunk = await file.slice(
          id * setting.chunkSize,
          (id + 1) * setting.chunkSize
        );

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

        id++;
      }
    }
  };

  // 这里可以添加实际的发送任务初始化逻辑，主要用来获取目标的sessionId
  const cancel1 = localUser.register(
    `start-send-task-${taskHash}-${remoteUser.userId}`,
    (e) => {
      console.log("发送任务开始:", localUser, taskHash, files);
      sessionId = e.fromUserSessionId;
      run();
      cancel1();
    }
  );
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
    const mainDataFile = await taskDir.get("main.json", {
      create: "file",
    });

    await mainDataFile.write(
      JSON.stringify(
        {
          ...taskData,
          received: undefined,
        },
        null,
        2
      ) // 格式化JSON
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
 * @param {string} params.userId - 用户ID
 * @param {string} params.taskHash - 任务哈希值
 * @returns {Object} 包含取消函数的对象
 */
export const startReceiveTask = async ({ localUser, userId, taskHash }) => {
  try {
    const remoteUser = await localUser.connectUser(userId);

    const tempDir = await get("local/temp/received", { create: "dir" });

    const taskDir = await tempDir.get(taskHash, {
      create: "dir",
    });

    const unsubscribe = localUser.bind("receive-data", (e) => {
      const { data, fromUserSessionId, fromUerId } = e.detail;

      if (data.kind === "file-chunk") {
        // 返回收到信息了
        remoteUser.post(
          {
            kind: "ack",
            taskHash,
            fileHash: data.fileHash,
            chunkHash: data.chunkHash,
          },
          fromUserSessionId
        );

        console.log("接收数据", data);
      }
    });

    // 通知对方可以开始了
    remoteUser.trigger(`start-send-task-${taskHash}-${localUser.userId}`);

    let mainDataFile = await taskDir.get("main.json");
    const mainData = await mainDataFile.json();

    return {
      unsubscribe: () => {
        unsubscribe();
        // TODO: 通知对方取消发送任务
        debugger;
      },
    };
  } catch (error) {
    console.error("初始化接收任务时出错:", error);
    throw error;
  }
};
