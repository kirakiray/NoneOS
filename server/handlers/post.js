import { activeConnections, authenticatedUsers } from "../client.js";

// 用于给管理员用的模拟post接口
export const post = async ({ taskId, data }, client) => {
  const { type } = data;

  if (type === "get-all") {
  }

  debugger;
  return {
    type: "post-response",
    taskId,
    success: 1,
    data: {
      activesLen: activeConnections.size,
      authedLen: authenticatedUsers.size,
    },
  };
};
