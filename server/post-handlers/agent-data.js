import { authenticatedUsers } from "../client.js";

// 存储代理数据的Map
export const agentPool = new Map();

export default {
  handler: async (requestBody, client) => {
    const { friendId: targetUserId, data } = requestBody;

    // 生成唯一的代理任务ID
    const agentTaskId = Math.random().toString(36).slice(2);

    // 检查目标用户是否存在且在线
    const targetUser = authenticatedUsers.get(targetUserId);
    if (!targetUser) {
      throw new Error("目标用户不在线");
    }

    // 转发数据到目标用户
    targetUser.client.sendMessage({
      type: "agent-data",
      fromUserId: client._userId,
      agentTaskId,
      data: data,
    });

    // 等待目标用户的响应
    const cacheObj = {};

    let timer = setTimeout(() => {
      cacheObj.reject(new Error("转发数据给目标超时"));
    }, 5000);

    const pms = new Promise((resolve, reject) => {
      cacheObj.resolve = resolve;
      cacheObj.reject = reject;
    });

    // 存储代理任务的信息
    agentPool.set(agentTaskId, cacheObj);

    await pms;

    clearTimeout(timer);

    // 从代理池中移除任务
    agentPool.delete(agentTaskId);

    return {
      msg: "数据已成功转发",
    };
  },
};
