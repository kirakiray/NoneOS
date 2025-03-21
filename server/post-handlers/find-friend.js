import { authenticatedUsers } from "../client.js";

export default {
  handler: async (requestBody) => {
    const { friendId } = requestBody;
    const friendData = authenticatedUsers.get(friendId);

    if (!friendData) {
      return {
        success: 0,
        data: { msg: "用户不在线" }
      };
    }

    return {
      success: 1,
      data: {
        authedTime: friendData.authedTime,
        authedData: friendData.client.authedData,
      }
    };
  }
};
