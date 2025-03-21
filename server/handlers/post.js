import * as postHandlers from "../post-handlers/index.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const post = async (
  { taskId, data },
  client,
  { serverOptions, ...otherOptions }
) => {
  const { type } = data;
  const realType = toCamelCase(type);

  const handler = postHandlers[realType];
  if (!handler) {
    return errorResponse(taskId, "未知的post请求类型");
  }

  const { handler: handlerFn, admin } = handler;

  if (admin && !(await checkAdminPermission(client, serverOptions))) {
    return errorResponse(
      taskId,
      serverOptions?.admin ? "您不是管理员" : "未配置管理员"
    );
  }

  try {
    const respData = await handlerFn(data, client, {
      serverOptions,
      ...otherOptions,
    });
    return successResponse(taskId, respData);
  } catch (error) {
    console.error(`Handler ${realType} error:`, error);
    return errorResponse(taskId, error.message || "处理请求时发生错误");
  }
};

const checkAdminPermission = async (client, serverOptions) => {
  if (!serverOptions?.admin) return false;
  return serverOptions.admin.includes(client._userId);
};

function toCamelCase(str) {
  return str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
}
