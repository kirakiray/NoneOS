import { get } from "../../../packages/fs/main.js";

export default async function fsAgent({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const remoteUser = await localUser.connectUser(fromUserId);

  const { name, path, args, taskId } = data;

  try {
    const targetHandle = await get(path);
    const result = await targetHandle[name](...args);

    // 发送成功结果回去
    remoteUser.post({
      type: "response-fs-agent",
      taskId,
      result,
    });
  } catch (error) {
    // 发送错误信息回去
    remoteUser.post({
      type: "response-fs-agent",
      taskId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  }
}
