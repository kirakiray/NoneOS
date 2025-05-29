import { authenticatedUsers } from "../client.js";

export default {
  handler: async (requestBody, client) => {
    const { friendId } = requestBody;
    const friendData = authenticatedUsers.get(friendId);

    if (!friendData) {
      throw new Error("用户不在线");
    }

    return {
      authedTime: friendData.authedTime,
      // 返回数据让用户验证
      authedData: friendData.client.authedData,
    };
  },
};
