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
      client.userSessionId = data.userSessionId;

      // 清除认证定时器
      clearTimeout(client._authTimer);

      // 添加到用户映射对象
      let userPool = users.get(client.userId);
      if (!userPool) {
        userPool = new Set();
        users.set(client.userId, userPool);
      }

      userPool.add(client);

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
  async find_user({ client, clients, users, message }) {
    const { userId } = message;
    const userPool = users.get(userId);

    client.send({
      type: "response_find_user",
      userId,
      pool: userPool
        ? Array.from(userPool).map((c) => {
            return {
              cid: c.cid,
              connectTime: c.connectTime,
              userSessionId: c.userSessionId,
            };
          })
        : [],
      isOnline: userPool && userPool.size > 0,
    });
  },

  // 转发用户数据
  async agent_data({ client, clients, users, message, binaryData }) {
    const { options, data } = message;
    const { userId } = options;

    if (userId) {
      const targetClient = users.get(userId);
      if (!targetClient) return;

      const sendData = binaryData
        ? toBuffer(binaryData, {
            type: "agent_data",
            fromUserId: client.userId,
          })
        : {
            type: "agent_data",
            data,
            fromUserId: client.userId,
          };

      // 发送给第一个客户
      const firstClient = targetClient.values().next().value;
      if (firstClient) {
        firstClient.send(sendData);
      }
    }
  },
  // 更新延迟时间
  async update_delay({ client, clients, users, message }) {
    const { delay } = message;
    client.delay = delay;
  },
};

export default options;
