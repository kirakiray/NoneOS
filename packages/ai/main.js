export { ask } from "./ask.js";
export { solicit } from "./solicit.js";

import { getAISetting } from "./custom-data.js";
import { getModels } from "./lmstudio.js";
import { getModels as getMoonshotModels } from "./moonshot.js";

let availablePms = null;

export const isAIAvailable = async () => {
  if (availablePms) {
    return availablePms;
  }

  return (availablePms = new Promise(async (resolve, reject) => {
    await getAvailableAIConfigs({
      callback: () => {
        // 只要有一个成功代表可用
        resolve(true);
        resolve = null;
      },
    });

    resolve && resolve(false);
    setTimeout(() => {
      availablePms = null;
    }, 10000);
  }));
};

/**
 * 获取所有可用的 AI 配置并以数组形式返回
 * @returns {Promise<Array>} 返回可用 AI 配置的数组，每个配置包含 name, url, model 信息
 */
export const getAvailableAIConfigs = async ({ callback } = {}) => {
  const setting = await getAISetting();
  const availableConfigs = [];

  // 封装获取模型并检查是否可用的逻辑
  const checkModelsAvailable = async (url) => {
    try {
      const models = await getModels(url);
      return models.length > 0;
    } catch {
      return false;
    }
  };

  // 检查 Moonshot AI 可用性
  const checkMoonshotModelsAvailable = async (apiKey) => {
    try {
      const models = await getMoonshotModels({ apiKey });
      return models.length > 0;
    } catch {
      return false;
    }
  };

  if (setting.lmstudio) {
    // 检查本地 LM Studio
    const localUrl = `http://localhost:${setting.lmstudio.port}`;
    if (await checkModelsAvailable(localUrl)) {
      availableConfigs.push({
        url: localUrl,
        model: setting.lmstudio.model,
        type: "local",
      });
      callback?.({
        url: localUrl,
        model: setting.lmstudio.model,
        type: "local",
      });
    }
  }

  // 检查其他 AI 配置
  if (setting.otherAI && Array.isArray(setting.otherAI)) {
    for (const item of setting.otherAI) {
      if (item.name === "LM Studio" && item.url) {
        if (await checkModelsAvailable(item.url)) {
          availableConfigs.push({
            url: item.url,
            model: item.model,
            type: "local-fetch",
          });
          callback?.({
            url: item.url,
            model: item.model,
            type: "local-fetch",
          });
        }
      } else if (item.name === "Moonshot" && item.apiKey) {
        if (await checkMoonshotModelsAvailable(item.apiKey)) {
          availableConfigs.push({
            url: "https://api.moonshot.cn/v1",
            model: item.model || "moonshot-v1-8k",
            type: "moonshot",
            apiKey: item.apiKey,
          });
          callback?.({
            url: "https://api.moonshot.cn/v1",
            model: item.model || "moonshot-v1-8k",
            type: "moonshot",
            apiKey: item.apiKey,
          });
        }
      }
    }
  }

  return availableConfigs;
};
