import { getFileChunkHashesAsync, getHash } from "/packages/util/hash/main.js";
import { get } from "/packages/fs/main.js";
import { setting } from "/packages/fs/fs-remote/file.js";

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
          handleName: taskData.handleName,
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
