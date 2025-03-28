// 文件系统缓存处理的客户端接口

// 创建一个 Shared Worker 实例
let worker = null;
let workerPort = null;
let isWorkerReady = false;
let messageQueue = [];
let messageId = 0;
let callbacks = new Map();

// 初始化 Worker
const initWorker = () => {
  if (worker) return Promise.resolve();

  return new Promise((resolve, reject) => {
    try {
      worker = new SharedWorker(new URL("./fs-worker.js", import.meta.url), {
        name: "fs-worker",
        type: "module",
      });
      workerPort = worker.port;

      workerPort.onmessage = (event) => {
        const { id, result, error, success, type } = event.data;

        if (type === "ready") {
          isWorkerReady = true;
          processQueue();
          resolve();
          return;
        }

        const callback = callbacks.get(id);
        if (callback) {
          if (success) {
            callback.resolve(result);
          } else {
            const err = new Error(error.message);
            err.stack = error.stack;
            callback.reject(err);
          }
          callbacks.delete(id);
        }
      };

      workerPort.onerror = (error) => {
        console.error("Worker 错误:", error);
        reject(error);
      };

      workerPort.start();
    } catch (error) {
      console.error("初始化 Worker 失败:", error);
      reject(error);
    }
  });
};

// 处理消息队列
const processQueue = () => {
  if (!isWorkerReady) return;

  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    workerPort.postMessage(message);
  }
};

// 发送消息到 Worker
const sendToWorker = (action, params) => {
  return new Promise(async (resolve, reject) => {
    await initWorker();

    const id = messageId++;
    callbacks.set(id, { resolve, reject });

    const message = { id, action, params };

    if (isWorkerReady) {
      workerPort.postMessage(message);
    } else {
      messageQueue.push(message);
    }
  });
};

// 保存
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
  return sendToWorker("getCache", { cacheName: cache._name, path });
};

// 确保缓存
export const ensureCache = async ({ cache, path, type }) => {
  return sendToWorker("ensureCache", { cacheName: cache._name, path, type });
};

// 目录添加子目录或子文件信息
export const updateDir = async ({ cache, path, remove, add }) => {
  return sendToWorker("updateDir", {
    cacheName: cache._name,
    path,
    remove,
    add,
  });
};
