import { on } from "../../user/event.js";
import { get } from "../main.js";

on("receive-user-data", async (e) => {
  const {
    userDirName, // 目标本地用户目录名称
    data,
    // fromUserId, // 消息来源用户ID
    // fromTabId, // 消息来源TabID
    tabConnection, // 消息来源TabConnection
  } = e;

  const { kind } = data;

  if (kind === "take") {
    const { taskId: remoteTaskId, method, path, args, gen } = data;

    try {
      const handle = await get(path);

      let result;
      if (gen) {
        result = [];
        for await (let item of handle[method](...args)) {
          result.push(item);
        }
      } else {
        result = await handle[method](...args);
      }

      tabConnection.send({
        kind: "result",
        taskId: remoteTaskId,
        result,
      });
    } catch (error) {
      tabConnection.send({
        kind: "result",
        taskId: remoteTaskId,
        error: error.stack || error.toString(),
      });
    }
  } else if (kind === "result") {
    const { taskId, result, error } = data;

    const tasks = getTasks(userDirName);

    const targetTask = tasks.get(taskId);
    if (targetTask) {
      if (error) {
        targetTask.reject(error);
        tasks.delete(taskId);
        return;
      }

      targetTask.resolve(result);
      tasks.delete(taskId);
    } else {
      console.error("未找到对应的任务");
    }
  }
});

const pools = {};

const getTasks = (userDirName) => {
  const tasks = pools[userDirName];
  if (!tasks) {
    pools[userDirName] = new Map();
    return pools[userDirName];
  }

  return tasks;
};

// 发送数据到对方
export const post = async ({ data, connection, userDirName }) => {
  const taskId = crypto.randomUUID();

  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  const tasks = getTasks(userDirName);

  tasks.set(taskId, {
    resolve,
    reject,
  });

  connection.send({
    kind: "take",
    ...data,
    taskId,
  });

  return promise;
};
