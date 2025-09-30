/**
 * 与DeepSeek AI模型进行对话
 * @param {Object} options - 配置选项
 * @param {string} options.apiKey - DeepSeek API密钥
 * @param {string} options.model - 模型名称
 * @param {Array} options.messages - 消息数组
 * @param {Function} [options.onChunk] - 流式响应回调函数
 * @param {string} [options.proxyPrefix] - 代理前缀
 * @returns {Promise<string>} 返回AI响应内容
 */
export async function chat({ apiKey, onChunk, model, messages, proxyPrefix }) {
  if (!apiKey) {
    throw new Error("API Key is required");
  }

  if (!model) {
    throw new Error("Model is required");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and cannot be empty");
  }

  // 根据是否存在 onChunk 来决定是否使用流式传输
  const useStream = Boolean(onChunk && typeof onChunk === "function");

  let fetchUrl = "https://api.deepseek.com/v1/chat/completions";

  if (proxyPrefix) {
    fetchUrl = `${proxyPrefix}${encodeURIComponent(fetchUrl)}`;
  }

  try {
    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 8192,
        stream: useStream,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // 如果不是流式传输，直接返回完整响应
    if (!useStream) {
      const data = await res.json();
      const fullResponse = data.choices?.[0]?.message?.content || "";
      return fullResponse;
    }

    // 流式传输处理
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              fullResponse += delta;

              onChunk &&
                onChunk({
                  delta,
                  fullResponse,
                });
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error in DeepSeek chat:", error);
    throw error;
  }
}

let getModelsCache = null;

/**
 * 获取DeepSeek AI的模型列表
 * @param {Object} options - 配置选项
 * @param {string} options.apiKey - DeepSeek API密钥
 * @param {string} [options.proxyPrefix] - 代理前缀
 * @returns {Promise<Array>} 返回模型列表数组
 */
export async function getModels({ apiKey, proxyPrefix }) {
  if (!apiKey) {
    throw new Error("API Key is required");
  }

  // 使用缓存避免重复请求
  if (getModelsCache) {
    return getModelsCache;
  }

  let fetchUrl = "https://api.deepseek.com/v1/models";

  if (proxyPrefix) {
    fetchUrl = `${proxyPrefix}${encodeURIComponent(fetchUrl)}`;
  }

  try {
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    // 解析模型列表
    const models = data.data || [];
    const modelList = models.map((model) => ({
      id: model.id,
      name: model.id,
      object: model.object,
      created: model.created,
      owned_by: model.owned_by,
    }));

    // 缓存结果
    getModelsCache = modelList;

    return modelList;
  } catch (error) {
    console.error("Error fetching DeepSeek models:", error);

    // 如果在线请求失败，返回默认的模型列表作为降级方案
    return [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
    ];
  }
}
