import { authenticatedUsers } from "../client.js";

// 存储代理数据的Map
export const agentPool = new Map();

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 5000;

export default {
  handler: async (requestBody, client) => {
    const { friendId: targetUserId, data, timeout = DEFAULT_TIMEOUT } = requestBody;

    if (!targetUserId || !data) {
      throw new Error("缺少必要参数");
    }

    // 生成唯一的代理任务ID
    const agentTaskId = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 检查目标用户是否存在且在线
    const targetUser = authenticatedUsers.get(targetUserId);
    if (!targetUser) {
      throw new Error(`目标用户(${targetUserId})不在线`);
    }

    try {
      // 转发数据到目标用户
      targetUser.client.sendMessage({
        type: "agent-data",
        fromUserId: client._userId,
        agentTaskId,
        data,
      });

      // 创建Promise和定时器
      const result = await Promise.race([
        new Promise((resolve, reject) => {
          const cacheObj = { resolve, reject };
          agentPool.set(agentTaskId, cacheObj);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("转发数据超时")), timeout)
        )
      ]);

      return {
        success: true,
        msg: "数据已成功转发",
        result
      };
    } catch (error) {
      throw error;
    } finally {
      // 清理代理池
      agentPool.delete(agentTaskId);
    }
  },
};
