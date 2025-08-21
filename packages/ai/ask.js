import { chat } from "./lmstudio.js";
import { getAISetting } from "./custom-data.js";

export const ask = async (prompt, options) => {
  const aiSetting = await getAISetting();

  const { onChunk } = options;

  const model = aiSetting.lmstudio.model;

  const result = await chat({
    serverUrl: aiSetting.lmstudio.serverUrl,
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
