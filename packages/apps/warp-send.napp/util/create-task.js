import { get } from "/packages/fs/main.js";
import { setting } from "/packages/fs/fs-remote/file.js";
import { getFileChunkHashesAsync, getHash } from "/packages/util/hash/main.js";

export const readySendTask = async (files, callback) => {
  // 所有的待发送文件
  const _files = files.map((file) => ({
    name: file.name,
    size: file.size,
    _file: file._file,
  }));

  let calculateHashCount = 0; // 已经计算哈希值的文件数量

  // 计算所有文件的hash
  for (const file of _files) {
    // this.calculatingHashFileName = file.name;
    // 调用回调函数更新进度
    callback({
      calculatingHashFileName: file.name,
    });

    file.hashes = await getFileChunkHashesAsync(file._file, {
      chunkSize: setting.chunkSize,
    });

    // 根据hashes计算文件的hash
    file.hash = await getHash(file.hashes.join(""));

    calculateHashCount++;

    // 调用回调函数更新进度
    callback({
      calculatingHashFileName: file.name,
      calculateHashCount,
    });
  }

  // 排序size并计算任务的ID
  const filesSortedBySize = _files.sort((a, b) => b.size - a.size);

  // 根据 hash 计算总任务的hash
  const taskHash = await getHash(
    filesSortedBySize.map((file) => file.hash).join("")
  );

  return {
    taskHash,
    files: _files,
  };
};

// 初始化发送文件的任务
export const initSendTask = async ({ localUser, taskHash, files }) => {
  debugger;
};

// 保存一个准备接受的任务
export const saveTask = async (data) => {
  const { taskHash } = data;

  // 写入临时项目目录
  const defaultDir = await get("local/temp/received", { create: "dir" });

  // 创建对应的目录
  const taskDir = await defaultDir.get(taskHash, {
    create: "dir",
  });

  // 写入主文件数据
  const mainFile = await taskDir.get("main.json", {
    create: "file",
  });

  await mainFile.write(
    JSON.stringify({
      ...data,
      received: undefined,
    })
  );
};

// 初始化接受文件的任务
export const initReceiveTask = async ({ localUser, userId, taskHash }) => {
  const remoteUser = await localUser.connectUser(userId);

  const cancel = remoteUser.bind("receive-data", (data) => {
    console.log("receive-data", data);
    debugger;
  });

  const defaultDir = await get("local/temp/received", { create: "dir" });

  const taskDir = await defaultDir.get(taskHash, {
    create: "dir",
  });

  let mainData = await taskDir.get("main.json");
  mainData = await mainData.json();

  debugger;

  return {
    cancel,
  };
};
