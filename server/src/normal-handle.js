import { verify } from "../../packages/user/util/verify.js";
import { getHash } from "../../packages/util/hash/main.js";
import { pack } from "../../packages/user/util/pack.js";

export const options = {
  // 认证用户信息
  async authentication({ client, clients, users, message }) {
    try {
      const data = message.signedData;

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
      const userInfo = users.get(client.userId);
      let userPool;

      if (!userInfo) {
        userPool = new Set();
        users.set(client.userId, { userPool });
      }

      userPool.add(client);

      // 认证成功后，发送确认消息
      client.send({
        type: "auth_success",
        userInfo: client.userInfo,
        userId: client.userId,
        message: "认证成功",
      });

      client.sendServerInfo();
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
    const userInfo = users.get(userId);
    const userPool = userInfo?.userPool ? Array.from(userInfo.userPool) : [];

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
    const { userId, userSessionId } = options;

    if (userId) {
      const targetUserClients = users.get(userId)?.userPool;
      if (!targetUserClients) return;

      let sendData;
      try {
        sendData = pack(
          {
            type: "agent_data",
            fromUserId: client.userId,
            fromUserSessionId: client.userSessionId,
          },
          binaryData
        );
      } catch (err) {
        console.error(err);
        return;
      }

      let targetDeviceClient = null;

      if (userSessionId) {
        targetDeviceClient = Array.from(targetUserClients).find(
          (client) => client.userSessionId === userSessionId
        );
      }

      if (!targetDeviceClient) {
        targetDeviceClient = targetUserClients.values().next().value;
      }

      // 发送给目标客户
      if (targetDeviceClient) {
        targetDeviceClient.send(sendData);
      }
    }
  },
  // 更新延迟时间
  async update_delay({ client, clients, users, message }) {
    const { delay } = message;
    client.delay = delay;
  },

  // 监听用户关注列表
  async follow_list({ client, clients, users, message }) {
    const followUsers = message.follows.split(",");

    // 最多只能关注32个用户
    if (followUsers.length > 32) {
      followUsers.splice(32);
    }

    const targetUserInfo = users.get(client.userId);
    targetUserInfo.followUsers = followUsers;

    console.log("关注列表更新:", client, followUsers);
  },
};

export default options;
