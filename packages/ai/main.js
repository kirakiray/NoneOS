import { getSetting } from "../none-os/setting.js";

(async () => {
  const settingData = await getSetting();

  // ai配置
  if (!settingData.ai) {
    settingData.ai = {
      model: "qwen3:4b",
    };
  }
})();

export {
  getOllamaModels,
  deleteOllamaModel,
  pullOllamaModel,
  askOllamaStream,
} from "./ollama.js";

import { askOllamaStream, getOllamaModels } from "./ollama.js";

export const modelExtend = {
  "qwen3:4b": {
    prepare(prompt) {
      return `/no_think${prompt}`;
    },
    preprocess(responseText) {
      if (!/<think>[\d\D]*?<\/think>\n/.test(responseText)) {
        return "";
      }

      return responseText.replace(/^\<think>[\d\D]*?<\/think>\s+/, "");
    },
  },
};

let availablePms = null;

export const isAIAvailable = async () => {
  if (availablePms) {
    return availablePms;
  }

  return (availablePms = new Promise(async (resolve, reject) => {
    try {
      const models = await getOllamaModels();

      if (models) {
        resolve(!!models.length);
      }
    } catch (err) {
      reject(err);
    }

    setTimeout(() => {
      availablePms = null;
    }, 1000);
  }));
};

export const ask = async (prompt, { model: modelName, onChunk }) => {
  const settingData = await getSetting();

  let responseText = "";

  let finalModelName = modelName || settingData.ai.model || "qwen3:4b";

  const targetExtend = modelExtend[finalModelName];

  if (targetExtend) {
    prompt = targetExtend.prepare(prompt);
  }

  await askOllamaStream(prompt, finalModelName, (chunk) => {
    responseText += chunk;

    let preprocessedText = responseText;
    if (targetExtend && targetExtend.preprocess) {
      preprocessedText = targetExtend.preprocess(responseText);
    }

    if (onChunk) {
      onChunk({
        modelName: finalModelName,
        originText: responseText,
        responseText: preprocessedText,
        currentToken: chunk,
      });
    }
  });

  let preprocessedText = responseText;
  if (targetExtend && targetExtend.preprocess) {
    preprocessedText = targetExtend.preprocess(responseText);
  }

  return {
    modelName: finalModelName,
    originText: responseText,
    responseText: preprocessedText,
  };
};
