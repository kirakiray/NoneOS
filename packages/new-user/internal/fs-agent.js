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

  const targetHandle = await get(path);

  const result = await targetHandle[name](...args);

  // 发送回去
  remoteUser.post({
    type: "response-fs-agent",
    taskId,
    path,
    args,
    result,
  });
}
