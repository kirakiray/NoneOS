import { agentPool } from "./agent-data.js";

export default {
  handler: async (requestBody, client) => {
    const { agentTaskId } = requestBody;

    if (!agentTaskId) {
      throw new Error("缺少agentTaskId参数");
    }

    const cacheObj = agentPool.get(agentTaskId);
    if (!cacheObj) {
      throw new Error(`未找到对应的转发任务: ${agentTaskId}`);
    }

    try {
      cacheObj.resolve({
        confirmedBy: client._userId,
        confirmedAt: Date.now()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`确认转发失败: ${error.message}`);
    }
  },
};
