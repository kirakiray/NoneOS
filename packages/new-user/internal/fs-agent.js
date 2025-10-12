import { get } from "../../../packages/fs/main.js";
import { calculateFileChunkHashes } from "../../../packages/fs/util.js";

export default async function fsAgent({
  fromUserId,
  fromUserSessionId,
  data,
  server,
  localUser,
}) {
  const result = await localUser.isMyDevice(fromUserId);

  if (!result) {
    // 如果不是我的设备，返回错误
    remoteUser.post({
      type: "response-fs-agent",
      taskId,
      error: {
        message: "Not my device",
      },
    });
    return;
  }

  const remoteUser = await localUser.connectUser(fromUserId);

  const { name, path, args, taskId } = data;

  try {
    const targetHandle = await get(path);

    if (name === "get-file-hash") {
      const file = await targetHandle.file();
      const hashes = await calculateFileChunkHashes(file);

      // 发送成功结果回去
      remoteUser.post({
        type: "response-fs-agent",
        taskId,
        result: { hashes },
      });

      return;
    }

    const result = await targetHandle[name](...(args || []));

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
