import { getSetting } from "../none-os/setting.js";

export {
  getOllamaModels,
  deleteOllamaModel,
  pullOllamaModel,
  askOllamaStream,
} from "./ollama.js";

export const ask = async (userPrompt, { model: modelName, callback }) => {
  let responseText = "";

  let finalModelName = modelName || "qwen3:4b";

  await askOllamaStream(userPrompt, finalModelName, (chunk) => {
    responseText += chunk;

    if (callback) {
      callback({
        modelName: finalModelName,
        responseText,
        currentToken: chunk,
      });
    }
  });

  return {
    modelName: finalModelName,
    text: responseText,
  };
};
