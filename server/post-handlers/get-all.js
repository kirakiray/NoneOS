import { activeConnections, authenticatedUsers } from "../client.js";

export default {
  admin: true,
  handler: async () => {
    // 已经被认证成功的用户
    const authenticateds = Array.from(authenticatedUsers).map(([userid, e]) => {
      const { client } = e;
      return {
        sessionId: client.sessionId,
        userInfo: client.userInfo,
        userid: client._userId,
      };
    });

    // 计算没有被认证成功的用户
    const unauthenticateds = Array.from(activeConnections)
      .filter((e) => !e._userId)
      .map((client) => {
        return {
          sessionId: client.sessionId,
        };
      });

    return {
      success: 1,
      data: {
        unauthenticateds,
        authenticateds,
      },
    };
  },
};
