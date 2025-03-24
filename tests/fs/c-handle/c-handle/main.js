import { DirCacheHandle } from "./dir.js";

export const get = async (path, options) => {
  const pathParts = path.split("/").filter(Boolean);

  if (pathParts.length === 0) {
    throw new Error("路径不能为空");
  }

  const rootName = pathParts[0];

  debugger;

  try {
    debugger;
  } catch (error) {
    if (error.message === "NotFoundError") {
      throw new Error(
        `根目录 "${rootName}" 不存在，请先使用 init("${rootName}") 初始化`
      );
    }
    throw error;
  }
};

export const init = async (name) => {
  const cache = await caches.open(name);
  return new DirCacheHandle(name, cache);
};

export default get;
