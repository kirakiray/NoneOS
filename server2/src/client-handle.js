import { paste } from "../../packages/crypto/crypto-verify.js";
import { getHash } from "../../packages/fs/util.js";
import { toBuffer } from "../../packages/new-user/buffer-data.js";

export const options = {
  // 认证用户信息
  async authentication({ client, clients, users, message }) {
    try {
      // 验证签名并获取数据
      const data = await paste(message.signedData);

      if (data.cid !== client.cid) {
        throw new Error("cid 不匹配");
      }

      // 匹配成功后，填入信息
      client.userInfo = data.info;
      client.userId = await getHash(data.publicKey);
      client.state = "authed";

      // 清除认证定时器
      clearTimeout(client._authTimer);

      users.set(client.userId, client);

      // 认证成功后，发送确认消息
      client.send({
        type: "auth_success",
        userInfo: client.userInfo,
        userId: client.userId,
        message: "认证成功",
      });
    } catch (err) {
      console.error(err);
      // 发送认证失败消息
      client.send({
        type: "error",
        kind: "authentication",
        message: err.message,
      });

      setTimeout(() => {
        client.close();
      }, 100);
      return;
    }
  },
  // 检查用户是否在线
  async is_user_online({ client, clients, users, message }) {
    const { userId } = message;
    const isOnline = users.has(userId);
    client.send({
      type: "response_user_online",
      userId,
      isOnline,
    });
  },

  // 转发用户数据
  async agent_data({ client, clients, users, message, binaryData }) {
    const { data, options } = message;
    if (binaryData) {
      if (options.userId) {
        const reBuffer = toBuffer(binaryData, {
          type: "agent_data",
          fromUserId: client.userId,
        });
        const targetClient = users.get(options.userId);
        if (targetClient) {
          targetClient.send(reBuffer);
        }
        return;
      }
    }
    if (options.userId) {
      const targetClient = users.get(options.userId);
      if (targetClient) {
        targetClient.send({
          type: "agent_data",
          data,
          fromUserId: client.userId,
        });
      }
    }
  },
};

export default options;
