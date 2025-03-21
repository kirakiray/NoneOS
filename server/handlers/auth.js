import { getHash } from "../../packages/fs/util.js";
import { verifyData } from "../../packages/user/verify.js";
import { authenticatedUsers } from "../client.js";

export const auth = async (
  parsedMessage,
  client,
  { serverOptions, serverVersion }
) => {
  // 验证用户身份
  const { result, data } = await verifyData(parsedMessage.authedData);
  const { publicKey, time: accountCreationTime } =
    parsedMessage.authedData.data;

  // 验证签名
  if (!result) {
    console.log("身份验证失败：签名无效");
    client.closeConnection();
    return;
  }

  // 验证会话标识符
  if (data.markid !== client.sessionId) {
    console.log("身份验证失败：会话标识符不匹配");
    client.closeConnection();
    return;
  }

  client.userInfo = data;

  // 验证成功，清除超时计时器
  clearTimeout(client._authenticationTimer);

  // 生成用户ID并存储用户信息
  const userId = await getHash(publicKey);
  client._userId = userId;

  // 判断用户是否已认证
  if (authenticatedUsers.has(userId)) {
    // 已存在就删除旧的
    const old = authenticatedUsers.get(userId);
    old.client.closeConnection();
  }

  authenticatedUsers.set(userId, {
    client,
    publicKey,
    accountCreationTime,
  });

  // 发送服务器信息
  client.sendMessage({
    type: "update-server-info",
    data: {
      serverName: serverOptions.name,
      serverVersion,
    },
  });

  // 发送认证成功响应
  return {
    type: "authed",
  };
};
