import { verify } from "../../packages/user/util/verify.js";
import { getHash } from "../../packages/util/hash/main.js";
import { pack } from "../../packages/user/util/pack.js";

export const options = {
  // 认证用户信息
  async authentication({ client, clients, users, followIndex, message }) {
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
      client.userId = await getHash(data.publicKey);
      client.publicKey = data.publicKey;
      client.state = "authed";
      client.userSessionId = data.userSessionId;
      // 认证成功后，更新用户信息
      client.userInfo = data.info;

      // 清除认证定时器
      clearTimeout(client._authTimer);

      // 添加到用户映射对象
      const { userPool } = client.userData;

      userPool.add(client);

      // 认证成功后，发送确认消息
      client.send({
        type: "auth_success",
        userInfo: client.userInfo,
        userId: client.userId,
        message: "认证成功",
      });

      // 遍历用户，在关注列表内的，通知对方
      const followers = followIndex.get(client.userId);
      if (followers) {
        for (const followerId of followers) {
          const followerUser = users.get(followerId);
          if (followerUser && followerUser.userPool) {
            followerUser.userPool.forEach((userClient) => {
              userClient.send({
                type: "notify_follow",
                online: [client.userId],
                offline: [],
                message: "你关注的用户上线了",
              });
            });
          }
        }
      }

      // 向用户发送服务器信息
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
  async find_user({ client, clients, users, followIndex, message }) {
    const { userId } = message;
    const targetUserData = users.get(userId);
    const userPool = targetUserData?.userPool
      ? Array.from(targetUserData.userPool)
      : [];

    client.send({
      type: "response_find_user",
      userId,
      publicKey: userPool.length > 0 ? userPool[0].publicKey : null, // 目标用户的publicKey
      tabs: userPool,
      isOnline: userPool && userPool.length > 0,
    });
  },

  // 转发用户数据
  async agent_data({ client, clients, users, followIndex, message, binaryData }) {
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
  async update_delay({ client, clients, users, followIndex, message }) {
    const { delay } = message;
    client.delay = delay;
  },

  // 监听用户关注列表
  async follow_list({ client, clients, users, followIndex, message }) {
    const newFollowUsers = message.follows.split(",");

    // 最多只能关注32个用户
    if (newFollowUsers.length > 32) {
      newFollowUsers.splice(32);
    }

    // 获取当前用户的旧关注列表
    const { userData } = client;
    const oldFollowUsers = userData.followUsers || [];

    // 更新反向索引：移除旧的关注关系
    for (const followedUserId of oldFollowUsers) {
      const followers = followIndex.get(followedUserId);
      if (followers) {
        const index = followers.indexOf(client.userId);
        if (index > -1) {
          followers.splice(index, 1);
          // 如果该用户没有关注者了，删除索引条目
          if (followers.length === 0) {
            followIndex.delete(followedUserId);
          }
        }
      }
    }

    // 更新反向索引：添加新的关注关系
    for (const followedUserId of newFollowUsers) {
      if (!followIndex.has(followedUserId)) {
        followIndex.set(followedUserId, []);
      }
      const followers = followIndex.get(followedUserId);
      if (!followers.includes(client.userId)) {
        followers.push(client.userId);
      }
    }

    // 更新用户的关注列表
    userData.followUsers = newFollowUsers;
  },
};

export default options;
