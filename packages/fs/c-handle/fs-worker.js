// 文件系统缓存处理的 Shared Worker

import {
  initCache,
  saveCache,
  getCache,
  ensureCache,
  updateDir,
} from "./fs-util.js";

// 处理来自主线程的消息
self.onconnect = (event) => {
  const port = event.ports[0];

  port.onmessage = async (e) => {
    const { id, action, params } = e.data;

    try {
      let result;
      // 确保缓存已初始化
      const cache = await initCache(params?.cacheName);

      switch (action) {
        case "saveCache":
          result = await saveCache({ ...params, cache });
          break;
        case "getCache":
          result = await getCache(cache, params.path);
          break;
        case "ensureCache":
          result = await ensureCache({ ...params, cache });
          break;
        case "updateDir":
          result = await updateDir({ ...params, cache });
          break;
        default:
          throw new Error(`未知操作: ${action}`);
      }

      port.postMessage({ id, result, success: true });
    } catch (error) {
      console.error(`Worker 错误 (${action}):`, error);
      port.postMessage({
        id,
        error: {
          message: error.message,
          stack: error.stack,
        },
        success: false,
      });
    }
  };

  // 通知主线程 worker 已准备好
  port.postMessage({ type: "ready" });
};
