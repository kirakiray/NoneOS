import { agentPool } from "./agent-data.js";

export default {
  handler: async (requestBody, client) => {
    const { agentTaskId } = requestBody;

    const cacheObj = agentPool.get(agentTaskId);

    if (!cacheObj) {
      throw new Error("未找到对应的转发任务");
    }

    cacheObj.resolve();
  },
};
