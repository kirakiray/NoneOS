/**
 * 与Ollama AI模型进行对话
 * @param {Object} options - 配置选项
 * @param {string} [options.serverUrl='http://localhost:11434'] - Ollama服务器地址
 * @param {string} options.model - 模型名称
 * @param {Array} options.messages - 消息数组
 * @param {Function} [options.onChunk] - 流式响应回调函数
 * @returns {Promise<string>} 返回AI响应内容
 */
export async function chat({
  serverUrl = "http://localhost:11434",
  onChunk,
  model,
  messages,
}) {
  if (!model) {
    throw new Error("Model is required");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and cannot be empty");
  }

  // 根据是否存在 onChunk 来决定是否使用流式传输
  const useStream = Boolean(onChunk && typeof onChunk === "function");

  try {
    const res = await fetch(`${serverUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: useStream,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // 如果不是流式传输，直接返回完整响应
    if (!useStream) {
      const data = await res.json();
      const fullResponse = data.message?.content || "";
      return fullResponse;
    }

    // 流式传输处理
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // 最后一行可能不完整，留给下一轮

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === "") {
          continue;
        }

        try {
          const parsed = JSON.parse(trimmedLine);
          const delta = parsed.message?.content;

          if (delta) {
            fullResponse += delta;
            if (onChunk && typeof onChunk === "function") {
              onChunk({ delta, fullResponse });
            }
          }

          // 检查是否是最后一个chunk
          if (parsed.done) {
            return fullResponse;
          }
        } catch (e) {
          console.warn("Failed to parse JSON chunk:", e);
          // 忽略解析错误，继续处理下一个chunk
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error in chat function:", error);
    throw error;
  }
}

/**
 * 生成文本补全（使用Ollama的generate API）
 * @param {Object} options - 配置选项
 * @param {string} [options.serverUrl='http://localhost:11434'] - Ollama服务器地址
 * @param {string} options.prompt - 输入提示
 * @param {string} options.model - 模型名称
 * @param {Function} [options.onChunk] - 流式响应回调函数
 * @returns {Promise<string>} 返回AI生成的文本
 */
export async function generate({
  serverUrl = "http://localhost:11434",
  onChunk,
  model,
  prompt,
}) {
  if (!model) {
    throw new Error("Model is required");
  }

  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const useStream = Boolean(onChunk && typeof onChunk === "function");

  try {
    const res = await fetch(`${serverUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: useStream,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    if (!useStream) {
      const data = await res.json();
      return data.response || "";
    }

    // 流式传输处理
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === "") {
          continue;
        }

        try {
          const parsed = JSON.parse(trimmedLine);
          const delta = parsed.response;

          if (delta) {
            fullResponse += delta;
            if (onChunk && typeof onChunk === "function") {
              onChunk({ delta, fullResponse });
            }
          }

          if (parsed.done) {
            return fullResponse;
          }
        } catch (e) {
          console.warn("Failed to parse JSON chunk:", e);
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error in generate function:", error);
    throw error;
  }
}

/**
 * 获取Ollama服务器上的可用模型列表
 * @param {string} [serverUrl='http://localhost:11434'] - Ollama服务器地址
 * @returns {Promise<Array>} 返回模型列表数组
 */
export async function getModels(serverUrl = "http://localhost:11434") {
  try {
    const res = await fetch(`${serverUrl}/api/tags`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.models || [];
  } catch (error) {
    console.error("Error getting models:", error);
    throw error;
  }
}

/**
 * 获取模型详细信息
 * @param {string} model - 模型名称
 * @param {string} [serverUrl='http://localhost:11434'] - Ollama服务器地址
 * @returns {Promise<Object>} 返回模型详细信息
 */
export async function getModelInfo(
  model,
  serverUrl = "http://localhost:11434"
) {
  if (!model) {
    throw new Error("Model is required");
  }

  try {
    const res = await fetch(`${serverUrl}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: model,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error getting model info:", error);
    throw error;
  }
}

/**
 * 拉取模型（如果本地不存在）
 * @param {string} model - 模型名称
 * @param {Function} [options.onProgress] - 进度回调函数
 * @param {string} [options.serverUrl='http://localhost:11434'] - Ollama服务器地址
 * @returns {Promise<void>}
 */
export async function pullModel(
  model,
  { onProgress, serverUrl = "http://localhost:11434" } = {}
) {
  if (!model) {
    throw new Error("Model is required");
  }

  try {
    const res = await fetch(`${serverUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: model,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    if (!onProgress) {
      return;
    }

    // 处理流式进度更新
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === "") {
          continue;
        }

        try {
          const parsed = JSON.parse(trimmedLine);
          if (onProgress && typeof onProgress === "function") {
            onProgress(parsed);
          }
        } catch (e) {
          console.warn("Failed to parse JSON chunk:", e);
        }
      }
    }
  } catch (error) {
    console.error("Error pulling model:", error);
    throw error;
  }
}
