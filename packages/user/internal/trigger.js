import { publicBroadcastChannel } from "../util/public-channel.js";

export default async function trigger({
  fromUserId,
  fromUserSessionId,
  data: receivedData,
  localUser,
  proxySessionId,
}) {
  const bool = await localUser.isMyDevice(fromUserId);

  if (!bool && !localUser._ignoreCert) {
    console.warn("非本机设备尝试触发：", fromUserId);
    return;
  }

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
    publicBroadcastChannel.postMessage({
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
