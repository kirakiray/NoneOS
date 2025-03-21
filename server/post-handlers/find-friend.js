import { authenticatedUsers } from "../client.js";

export default {
  handler: async (requestBody) => {
    const { friendId } = requestBody;
    const friendData = authenticatedUsers.get(friendId);

    if (!friendData) {
      throw new Error("用户不在线");
    }

    return {
      authedTime: friendData.authedTime,
      authedData: friendData.client.authedData,
    };
  }
};
