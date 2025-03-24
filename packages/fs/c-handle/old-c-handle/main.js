import { DirCacheHandle } from "./dir.js";

export const get = async (path, options) => {
  const pathParts = path.split("/").filter(Boolean);

  if (pathParts.length === 0) {
    throw new Error("路径不能为空");
  }

  const rootName = pathParts[0];
  const cache = await caches.open(rootName);

  try {
    const rootMeta = await cache.match(":meta");
    if (!rootMeta) {
      throw new Error("NotFoundError");
    }

    const dirHandle = new DirCacheHandle(rootName, cache);

    if (pathParts.length === 1) {
      return dirHandle;
    }

    const remainingPath = pathParts.slice(1).join("/");
    return await dirHandle.get(remainingPath, options);
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
  const headers = new Headers();
  headers.set('X-File-Type', 'dir');
  await cache.put(name, new Response("", { headers }));
  return new DirCacheHandle(name, cache);
};

export default get;