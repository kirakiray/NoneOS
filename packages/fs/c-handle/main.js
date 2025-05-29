import { DirCacheHandle } from "./dir.js";

export const get = async (path, options) => {
  const pathParts = path.split("/").filter(Boolean);

  if (pathParts.length === 0) {
    throw new Error("路径不能为空");
  }

  const rootName = pathParts[0];

  try {
    // 尝试获取根目录缓存
    const cache = await caches.open(rootName);
    const dirHandle = new DirCacheHandle(rootName, cache);

    // 如果只有根目录，直接返回
    if (pathParts.length === 1) {
      return dirHandle;
    }

    // 通过根目录，使用get方法获取剩余路径
    const remainingPath = pathParts.slice(1).join("/");
    return await dirHandle.get(remainingPath, options);
  } catch (error) {
    if (error.name === "NotFoundError") {
      throw new Error(
        `根目录 "${rootName}" 不存在，请先使用 init("${rootName}") 初始化`,
        {
          cause: error,
        }
      );
    }
    throw error;
  }
};

export const init = async (name) => {
  const cache = await caches.open(name);
  cache._name = name;
  return new DirCacheHandle(name, cache);
};

export default get;
