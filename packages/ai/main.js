export { ask } from "./ask.js";
export { solicit } from "./solicit.js";

import { getAISetting } from "./custom-data.js";
import { getModels } from "./lmstudio.js";

let availablePms = null;

let usefulConfig = {};

export const getUsefulConfig = () => {
  return usefulConfig;
};

export const isAIAvailable = async () => {
  if (availablePms) {
    return availablePms;
  }

  return (availablePms = new Promise(async (resolve, reject) => {
    const setting = await getAISetting();

    // 封装获取模型并检查是否可用的逻辑
    const checkModelsAvailable = async (url) => {
      try {
        const models = await getModels(url);
        return models.length > 0;
      } catch {
        return false;
      }
    };

    // 检查本地 LM Studio 是否可用
    if (
      await checkModelsAvailable(`http://localhost:${setting.lmstudio.port}`)
    ) {
      usefulConfig = {
        url: `http://localhost:${setting.lmstudio.port}`,
        model: setting.lmstudio.model,
      };
      resolve(true);
      return;
    }

    // 查看其他的 LM Studio 是否可用
    if (setting.otherAI) {
      for (const item of setting.otherAI) {
        if (
          item.name === "LM Studio" &&
          (await checkModelsAvailable(item.url))
        ) {
          usefulConfig = {
            url: item.url,
            model: item.model,
          };
          resolve(true);
          return;
        }
      }
    }

    resolve(false);

    setTimeout(() => {
      availablePms = null;
    }, 1000);
  }));
};
