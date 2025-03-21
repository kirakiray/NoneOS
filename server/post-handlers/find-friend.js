// 查找用户是否在线
import { activeConnections, authenticatedUsers } from "../client.js";

export default {
  handler: async (requestBody, client, options) => {
    const { friendId } = requestBody;

    // 查找用户是否在线
    const friendData = authenticatedUsers.get(friendId);
    if (friendData) {
      return {
        success: 1,
        data: {
          authedTime: friendData.authedTime,
          authedData: friendData.client.authedData,
        },
      };
    }

    return {
      success: 0,
      data: {
        msg: "用户不在线",
      },
    };
  },
};
