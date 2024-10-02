import { EverCache } from "../../ever-cache/main.js";

const storage = new EverCache("remote-file-cache");

// 重新获取块
export const getCache = async (key) => {
  const result = await storage.getItem(key);

  if (result) {
    // 重置时间
    storage.setItem(`${key}-time`, Date.now());
  }

  return result;
};

// 缓存块
export const saveCache = (key, chunk) => {
  storage.setItem(key, chunk);
  storage.setItem(`${key}-time`, Date.now());
};

// 清除超时缓存
const clearCache = async () => {
  const now = Date.now();
  for await (let [key, value] of storage.entries()) {
    if (/-time$/.test(key)) {
      if (now - value > 5 * 60 * 1000) {
        // 清除超过5分钟的内容
        const realKey = key.replace("-time", "");
        storage.removeItem(realKey);
      }
    }
  }

  // 定时清除缓存
  setTimeout(clearCache, 2 * 60 * 1000);
};

clearCache();
