// 用来执行复制/移动/删除的进度模式

// 进行中的任务
const tasks = [];

//
export const copy = async () => {};

// 获取目标文件或文件夹的任务树状信息
export const flatHandle = async (handle) => {
  const arr = [];

  for await (let subHandle of handle.values()) {
    if (subHandle.kind === "dir") {
      const subs = await flatHandle(subHandle);
      arr.push(...subs);
    } else {
      const data = {
        size: await subHandle.size(),
        path: subHandle.path,
      };

      Object.defineProperty(data, "handle", {
        get() {
          return subHandle;
        },
      });

      arr.push(data);
    }
  }

  return arr;
};
