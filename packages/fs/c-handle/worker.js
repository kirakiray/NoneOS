// 存储所有缓存操作的队列
const queue = new Map();

// 获取路径的所有父路径
const getParentPaths = (path) => {
  const parts = path.split("/").filter(Boolean);
  const paths = [];
  let current = "";

  for (const part of parts.slice(0, -1)) {
    current += "/" + part;
    paths.push(current);
  }

  return paths;
};

// 队列执行器
const executeInQueue = async (key, operation) => {
  const parentPaths = getParentPaths(key);
  const parentPromises = parentPaths.map(
    (path) => queue.get(path) || Promise.resolve()
  );
  await Promise.all(parentPromises);

  const current = queue.get(key) || Promise.resolve();
  const next = current.then(async () => {
    try {
      return await operation();
    } finally {
      if (queue.get(key) === next) {
        queue.delete(key);
      }
    }
  });
  queue.set(key, next);
  return next;
};

// 直接保存到缓存
const directSaveToCache = async ({ cache, path, data, type }) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  console.log("saveCache start", normalizedPath, "data:", data);
  
  try {
    const content = type === "dir" ? JSON.stringify(data) : data;
    const resp = new Response(content, {
      headers: {
        "x-type": type,
        "cache-control": "no-cache",
      },
    });
    await cache.put(normalizedPath, resp);
  } finally {
    console.log("saveCache end", normalizedPath, "data:", data);
  }
};

// 将ReadableStream转为Blob
const streamToBlob = async (stream) => {
  const reader = stream.getReader();
  let finalBlob = new Blob([]);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    finalBlob = new Blob([finalBlob, value]);
  }

  return finalBlob;
};

// 直接获取缓存
const directGetCache = async (cache, path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const matched = await cache.match(normalizedPath);

  if (!matched) {
    return {
      type: null,
      data: null,
    };
  }

  const type = matched.headers.get("x-type");

  try {
    if (!matched.body) {
      return {
        type,
        data: matched.body,
      };
    }
    const blob = await streamToBlob(matched.body);
    const data = type === "dir" ? JSON.parse(await blob.text()) : blob;

    return {
      type,
      data,
    };
  } catch (error) {
    console.error("Error processing cache data:", error);
    return {
      type: null,
      data: null,
      error: error.message,
    };
  }
};

// 处理来自主线程的消息
self.onconnect = (e) => {
  const port = e.ports[0];

  port.onmessage = async (e) => {
    const { type, id, payload } = e.data;

    try {
      let result;
      const cache = await caches.open(payload.cacheName);

      switch (type) {
        case "saveCache":
          result = await executeInQueue(payload.path, async () => {
            await directSaveToCache({
              ...payload,
              cache,
            });
            return true;
          });
          break;

        case "getCache":
          result = await executeInQueue(payload.path, async () => {
            return await directGetCache(cache, payload.path);
          });
          break;

        case "ensureCache":
          result = await executeInQueue(payload.path, async () => {
            const { type, data } = await directGetCache(cache, payload.path);
            if (type) return;

            let finalData = null;
            if (payload.type === "dir") {
              finalData = [];
            } else if (payload.type === "file") {
              finalData = "";
            }

            await directSaveToCache({
              type: payload.type,
              cache,
              data: finalData,
              path: payload.path,
            });
          });
          break;

        case "updateDir":
          result = await executeInQueue(payload.path, async () => {
            const { data: currentData } = await directGetCache(cache, payload.path);

            if (!currentData) {
              throw new Error(`目录不存在: ${payload.path}`);
            }

            let updatedData = Array.isArray(currentData) ? [...currentData] : [];

            if (payload.remove && payload.remove.length > 0) {
              updatedData = updatedData.filter(
                (item) => !payload.remove.includes(item)
              );
            }

            if (payload.add && payload.add.length > 0) {
              const newItems = payload.add.filter(
                (item) => !updatedData.includes(item)
              );
              updatedData = [...updatedData, ...newItems];
            }

            await directSaveToCache({
              cache,
              path: payload.path,
              type: "dir",
              data: updatedData,
            });

            return updatedData;
          });
          break;
      }

      port.postMessage({ id, result });
    } catch (error) {
      port.postMessage({
        id,
        error: error.message,
      });
    }
  };
};