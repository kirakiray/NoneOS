export const directGetCache = async (cache, path) => {
  // 规范化路径
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
    // 获取 readsteam 数据
    const blob = await streamToBlob(matched.body);

    // 根据类型处理数据
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

// 保存
let worker = null;
let port = null;
let messageId = 0;
const callbacks = new Map();

// 初始化 worker
const initWorker = () => {
  if (worker) return;

  if (!globalThis.SharedWorker) {
    return; // 不支持 SharedWorker, 直接返回
  }

  const workerPath = new URL("./worker.js", import.meta.url).href;

  worker = new SharedWorker(workerPath, {
    name: "cache-worker",
  });

  port = worker.port;
  port.start();

  port.onmessage = (e) => {
    const { id, result, error } = e.data;
    const callback = callbacks.get(id);
    if (callback) {
      if (error) {
        callback.reject(new Error(error));
      } else {
        callback.resolve(result);
      }
      callbacks.delete(id);
    }
  };
};

// 发送消息到 worker
const sendToWorker = (type, payload) => {
  initWorker();

  return new Promise((resolve, reject) => {
    const id = messageId++;
    callbacks.set(id, { resolve, reject });
    port.postMessage({ type, id, payload });
  });
};

// 保存缓存
export const saveCache = async ({ cache, path, data, type }) => {
  return sendToWorker("saveCache", {
    cacheName: cache._name,
    path,
    data,
    type,
  });
};

// 获取缓存
export const getCache = async (cache, path) => {
  if (!globalThis.SharedWorker) {
    return directGetCache(cache, path);
  }

  return sendToWorker("getCache", {
    cacheName: cache._name,
    path,
  });
};

// 确保缓存
export const ensureCache = async ({ cache, path, type }) => {
  return sendToWorker("ensureCache", {
    cacheName: cache._name,
    path,
    type,
  });
};

// 更新目录
export const updateDir = async ({ cache, path, remove, add }) => {
  return sendToWorker("updateDir", {
    cacheName: cache._name,
    path,
    remove,
    add,
  });
};

// 将ReadableStream转为Blob
const streamToBlob = async (stream) => {
  const reader = stream.getReader();
  let finalBlob = new Blob([]);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 为每个数据块创建一个新的 Blob 并与之前的合并
    finalBlob = new Blob([finalBlob, value]);
  }

  return finalBlob;
};
