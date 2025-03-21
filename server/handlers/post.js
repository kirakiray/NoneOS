import * as postHandlers from "../post-handlers/index.js";

// 用于给管理员用的模拟post接口
export const post = async (
  { taskId, data },
  client,
  { serverOptions, ...otherOptions }
) => {
  const { type } = data;

  const realType = toCamelCase(type);

  if (postHandlers[realType]) {
    const { handler, admin } = postHandlers[realType];

    if (admin) {
      if (!serverOptions?.admin) {
        return {
          type: "post-response",
          taskId,
          success: 0,
          data: {
            msg: "未配置管理员",
          },
        };
      }

      // 不是管理员无法使用
      if (!serverOptions.admin.includes(client._userId)) {
        return {
          type: "post-response",
          taskId,
          success: 0,
          data: {
            msg: "您不是管理员",
          },
        };
      }
    }

    const { data: respData, success } = await handler(data, client, {
      serverOptions,
      ...otherOptions,
    });

    return {
      type: "post-response",
      taskId,
      success,
      data: respData,
    };
  }

  return {
    type: "post-response",
    taskId,
    success: 0,
    data: {
      msg: "未知的post请求类型",
    },
  };
};

function toCamelCase(str) {
  return str.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
}
