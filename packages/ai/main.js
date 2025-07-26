import { getSetting } from "../none-os/setting.js";

export {
  getOllamaModels,
  deleteOllamaModel,
  pullOllamaModel,
  askOllamaStream,
} from "./ollama.js";

import { askOllamaStream } from "./ollama.js";

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

    let preprocessedText = "";
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

  return {
    modelName: finalModelName,
    text: responseText,
  };
};
