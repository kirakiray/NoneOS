import { chat as lmstudioChat } from "./lmstudio.js";
import { chat as moonshotChat } from "./moonshot.js";
import { chat as deepseekChat } from "./deepseek.js";
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

    setTimeout(() => {
      availableConfigs = null;
    }, 1000 * 60);
  }

  if (!availableConfigs.length) {
    availableConfigs = null;
    throw new Error("No available AI configs");
  }

  const { onChunk } = options;

  const configData = availableConfigs[0];

  const model = configData.model;

  let result;
  let role;
  let modelName;

  if (configData.type === "moonshot") {
    // 使用 Moonshot AI
    result = await moonshotChat({
      apiKey: configData.apiKey,
      model,
      messages: [{ role: "user", content: prompt }],
      onChunk: (e) => {
        onChunk &&
          onChunk({
            role: "moonshot",
            modelName: model,
            responseText: e.fullResponse,
            currentToken: e.delta,
          });
      },
    });
    role = "moonshot";
    modelName = model;
  } else if (configData.type === "deepseek") {
    // 使用 DeepSeek AI
    result = await deepseekChat({
      apiKey: configData.apiKey,
      model,
      messages: [{ role: "user", content: prompt }],
      onChunk: (e) => {
        onChunk &&
          onChunk({
            role: "deepseek",
            modelName: model,
            responseText: e.fullResponse,
            currentToken: e.delta,
          });
      },
    });
    role = "deepseek";
    modelName = model;
  } else {
    // 使用 LM Studio 或其他本地模型
    result = await lmstudioChat({
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
    role = "lmstudio";
    modelName = model;
  }

  return {
    role,
    modelName,
    responseText: result,
  };
};
