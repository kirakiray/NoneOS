import { activeConnections, authenticatedUsers } from "../client.js";

// 用于给管理员用的模拟post接口
export const post = async ({ taskId, data }, client) => {
  const { type } = data;

  let finnalData = {};

  if (type === "get-all") {
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

    finnalData = {
      unauthenticateds,
      authenticateds,
    };
  }

  return {
    type: "post-response",
    taskId,
    success: 1,
    data: finnalData,
  };
};
