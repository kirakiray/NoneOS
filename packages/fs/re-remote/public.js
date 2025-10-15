// 监听池
export const observePool = new Map();

export const agentData = async (remoteUser, options) => {
  const taskId = Math.random().toString(36).slice(2);

  return new Promise((resolve, reject) => {
    remoteUser.post({
      ...options,
      type: "fs-agent",
      taskId,
      __internal_mark: 1,
    });

    remoteUser.self.bind("receive-data", (e) => {
      const { data, options } = e.detail;

      let finalData = data;

      if (data instanceof Uint8Array && options._type) {
        finalData = {
          ...options,
          result: data,
        };
      }

      if (
        finalData._type === "response-fs-agent" &&
        finalData.taskId === taskId
      ) {
        // 检查是否有错误信息
        if (finalData.error) {
          // 创建一个新的错误对象并抛出
          const error = new Error(finalData.error.message);
          error.name = finalData.error.name;
          error.stack = finalData.error.stack;
          reject(error);
        } else {
          resolve(finalData.result);
        }
      }
    });
  });
};
