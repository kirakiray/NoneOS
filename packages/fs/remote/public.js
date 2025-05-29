import { on } from "../../user/event.js";
import { get } from "../main.js";
import { cacheFile, getChunks } from "../../user/cache/main.js";
import { getDeviceStore } from "../../user/device/main.js";
import "./obs.js";

on("receive-user-data", async (e) => {
  const {
    useLocalUserDirName, // 目标本地用户目录名称
    fromUserId, // 消息来源用户ID
    // fromTabId, // 消息来源TabID
    tabConnection, // 消息来源TabConnection
  } = e;

  let { data } = e;

  // 查看是否是自己匹配过的设备
  const deviceStore = await getDeviceStore(useLocalUserDirName);

  const isMyDevice = deviceStore.find((e) =>
    e.toOppoCertificate ? e.toOppoCertificate.data.authTo === fromUserId : false
  );

  if (!isMyDevice) {
    // 不是自己匹配过的设备，直接返回
    console.error("检测到未授权设备请求文件数据，用户ID:", fromUserId);
    return;
  }

  if (data.kind === "bridge-chunks") {
    // 大体积的数据，需要提前组装
    const { hashs, path } = data;

    const fileChunks = await getChunks(hashs, {
      useLocalUserDirName,
      fromUserId,
    });

    const tempFile = new File(fileChunks, "temp.txt");
    const fileContent = await tempFile.text();

    try {
      // 解析并更新数据
      data = JSON.parse(fileContent);
    } catch (error) {
      throw new Error("数据格式错误", {
        cause: error,
      });
    }
  }
  const { kind } = data;

  if (kind === "take") {
    const { taskId: remoteTaskId, method, path, args, gen } = data;

    try {
      const handle = await get(path);

      const reArgs = await fixBlockData(args, { useLocalUserDirName, fromUserId });

      let result;
      if (gen) {
        result = [];
        for await (let item of handle[method](...reArgs)) {
          result.push(item);
        }
      } else {
        result = await handle[method](...reArgs);
      }

      // 重新发送转化文件数据
      const reResult = await fileToCacheBlocks(result, { useLocalUserDirName });

      tabConnection.send({
        kind: "user-result",
        taskId: remoteTaskId,
        result: reResult,
      });
    } catch (error) {
      tabConnection.send({
        kind: "user-result",
        taskId: remoteTaskId,
        error: error.stack || error.toString(),
      });
    }
  } else if (kind === "user-result") {
    const { taskId, result, error } = data;

    const tasks = getTasks(useLocalUserDirName);

    const targetTask = tasks.get(taskId);
    if (targetTask) {
      if (error) {
        targetTask.reject(error);
        tasks.delete(taskId);
        return;
      }

      // 重新还原块内容
      const reResult = await fixBlockData(result, { useLocalUserDirName, fromUserId });

      targetTask.resolve(reResult);
      tasks.delete(taskId);
    } else {
      console.error("未找到对应的任务");
    }
  }
});

const pools = {};

const getTasks = (useLocalUserDirName) => {
  const tasks = pools[useLocalUserDirName];
  if (!tasks) {
    pools[useLocalUserDirName] = new Map();
    return pools[useLocalUserDirName];
  }

  return tasks;
};

// 发送数据到对方
export const post = async ({ data, connection, useLocalUserDirName }) => {
  const taskId = crypto.randomUUID();

  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  const tasks = getTasks(useLocalUserDirName);

  tasks.set(taskId, {
    resolve,
    reject,
  });

  // 查看data内是否包含file或arraybuffer，如果有，将其转为块信息，让对方进行获取
  const reData = await fileToCacheBlocks(data, { useLocalUserDirName });

  // 判断总数据输否超出 rtc发送的限制，如果超出限制，分块后进行发送
  connection.send({
    kind: "take",
    ...reData,
    taskId,
  });

  return promise;
};

const fixBlockData = async (data, { useLocalUserDirName, fromUserId }) => {
  let reData = data;

  if (Array.isArray(data)) {
    return await Promise.all(
      data.map((e) => fixBlockData(e, { useLocalUserDirName, fromUserId }))
    );
  }

  if (data && data.__type__) {
    // 属于中转的数据，从远端进行获取
    const chunks = await getChunks(data.hashs, {
      useLocalUserDirName,
      fromUserId,
    });

    if (data.__type__ === "file") {
      // 重新合并为文件
      reData = new File(chunks, data.name, {
        type: data.type,
        lastModified: data.lastModified,
      });
    } else {
      reData = new Blob(chunks, {
        type: data.type,
        lastModified: data.lastModified,
      });

      if (data.__type__ === "arraybuffer") {
        reData = await reData.arrayBuffer();
      }
    }
  }

  return reData;
};

// 将文件类型的数据转为块信息
const fileToCacheBlocks = async (data, { useLocalUserDirName }) => {
  let reData = data;
  if (Array.isArray(data)) {
    reData = await Promise.all(
      data.map((e) => fileToCacheBlocks(e, { useLocalUserDirName }))
    );
  } else if (data instanceof Blob || data instanceof ArrayBuffer) {
    const chunkHashs = await cacheFile(data, { useLocalUserDirName });

    if (data instanceof File) {
      return {
        __type__: "file",
        hashs: chunkHashs,
        type: data.type,
        name: data.name,
        lastModified: data.lastModified,
      };
    } else if (data instanceof Blob) {
      return {
        __type__: "blob",
        hashs: chunkHashs,
        type: data.type,
        lastModified: data.lastModified,
      };
    }

    return {
      __type__: "arraybuffer",
      hashs: chunkHashs,
    };
  } else if (data instanceof Object) {
    if (data.kind && data.path) {
      return data;
    }

    reData = {};
    await Promise.all(
      Object.keys(data).map(async (key) => {
        reData[key] = await fileToCacheBlocks(data[key], { useLocalUserDirName });
      })
    );
  }

  return reData;
};
