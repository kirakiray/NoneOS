import { chat } from "./lmstudio.js";
import { getUsefulConfig, isAIAvailable } from "./main.js";

export const ask = async (prompt, options) => {
  await isAIAvailable(); // 确保 AI 可用

  const usefulConfig = getUsefulConfig();

  const { onChunk } = options;

  const model = usefulConfig.model;

  const result = await chat({
    serverUrl: usefulConfig.url,
    model,
    messages: [{ role: "user", content: prompt }],
    onChunk: (e) => {
      onChunk &&
        onChunk({
          role: "lmstudio",
          modelName: model,
          responseText: e.fullResponse,
          currentToken: e.delta,
        });
    },
  });

  return {
    role: "lmstudio",
    modelName: model,
    responseText: result,
  };
};
