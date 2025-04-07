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
    const { taskId: remoteTaskId, method, path, args } = data;

    try {
      const handle = await get(path);

      const result = await handle[method](...args);

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

const tasks = new Map();

// 发送数据到对方
export const post = async ({ data, connection }) => {
  const taskId = crypto.randomUUID();

  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
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
