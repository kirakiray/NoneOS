// import { paste } from "../../packages/crypto/crypto-verify.js";
import { verify } from "../../packages/new-user/util/verify.js";
import { getHash } from "../../packages/fs/util.js";
import { toBuffer } from "../../packages/new-user/buffer-data.js";

export const options = {
  // 认证用户信息
  async authentication({ client, clients, users, data }) {
    try {
      if (data.cid !== client.cid) {
        throw new Error("cid 不匹配");
      }

      // 验证签名并获取数据
      const result = await verify(data);
      if (!result) {
        throw new Error("签名被篡改");
      }

      // 匹配成功后，填入信息
      client.userInfo = data.info;
      client.userId = await getHash(data.publicKey);
      client.publicKey = data.publicKey;
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
    let userPool = users.get(userId);
    userPool = userPool ? Array.from(userPool) : [];

    client.send({
      type: "response_find_user",
      userId,
      publicKey: userPool.length > 0 ? userPool[0].publicKey : null, // 目标用户的publicKey
      tabs: userPool,
      isOnline: userPool && userPool.length > 0,
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
            fromUserSessionId: client.userSessionId,
          })
        : {
            type: "agent_data",
            data,
            fromUserId: client.userId,
            fromUserSessionId: client.userSessionId,
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
