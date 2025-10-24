import { broadcast } from "../util/broadcast.js";

export default async function trigger({
  fromUserId,
  fromUserSessionId,
  data: receivedData,
  localUser,
  proxySessionId,
}) {
  const { name, data } = receivedData;

  const pool = localUser.registers[name];
  if (pool) {
    pool.forEach((func) =>
      func({
        data: { ...data },
        fromUserId,
        fromUserSessionId,
      })
    );
  }

  // 如果是代理触发，不向其他标签发送数据
  if (!proxySessionId) {
    // 向其他标签发送数据
    broadcast.postMessage({
      type: "agent-trigger",
      detail: {
        proxySessionId: localUser.sessionId,
        fromUserId,
        fromUserSessionId,
        data: receivedData,
        localUserDirName: localUser.dirName,
      },
    });
  }
}
