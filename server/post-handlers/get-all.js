// 获取所有用户信息，管理员专用
import { activeConnections, authenticatedUsers } from "../client.js";

const mapAuthenticatedUser = ([userid, e]) => ({
  sessionId: e.client.sessionId,
  userInfo: e.client.userInfo,
  userid: e.client._userId,
  __inviteCode: e.client.__inviteCode,
});

const mapUnauthenticatedUser = (client) => ({
  sessionId: client.sessionId,
});

export default {
  admin: true,
  handler: async () => {
    const authenticateds =
      Array.from(authenticatedUsers).map(mapAuthenticatedUser);
    const unauthenticateds = Array.from(activeConnections)
      .filter((e) => !e._userId)
      .map(mapUnauthenticatedUser);

    return {
      unauthenticateds,
      authenticateds,
    };
  },
};
