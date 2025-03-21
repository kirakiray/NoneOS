import { authenticatedUsers } from "../client.js";

export default {
  handler: async (requestBody, client) => {
    const { friendId: targetUserId, data } = requestBody;

    // 检查目标用户是否存在且在线
    const targetUser = authenticatedUsers.get(targetUserId);
    if (!targetUser) {
      throw new Error("目标用户不在线");
    }

    // 转发数据到目标用户
    targetUser.client.sendMessage({
      type: "agent-data",
      fromUserId: client._userId,
      data: data,
    });

    return {
      success: true,
      message: "数据已成功转发",
    };
  },
};
