import { chat } from "./lmstudio.js";
import { getAvailableAIConfigs } from "./main.js";

let availableConfigs = null;

/**
 * 向 AI 模型发送请求并处理响应
 * @param {string} prompt - 用户输入的提示
 * @param {Object} options - 配置选项
 * @param {Function} options.onChunk - 处理每个响应块的回调函数
 * @returns {Promise<Object>} - 包含模型名称和完整响应的对象
 */
export const ask = async (prompt, options) => {
  if (!availableConfigs) {
    availableConfigs = await getAvailableAIConfigs();
  }

  if (!availableConfigs.length) {
    availableConfigs = null;
    throw new Error("No available AI configs");
  }

  const { onChunk } = options;

  const configData = availableConfigs[0];

  const model = configData.model;

  const result = await chat({
    serverUrl: configData.url,
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
