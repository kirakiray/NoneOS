export async function getOllamaModels() {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("已下载的模型:", data.models);
    return data.models;
  } catch (error) {
    console.error("获取模型失败:", error);
    return null;
  }
}

export const deleteOllamaModel = async (model) => {
  const result = await fetch("http://localhost:11434/api/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model }),
  }).then((e) => e.text());

  return result;
};

const processStreamResponse = async (response, callback) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (callback) {
          callback(parsed);
        }

        // 根据响应类型提取内容
        if (parsed.response) {
          result += parsed.response;
        } else if (parsed.status) {
          result += parsed.status;
        }
      } catch (e) {
        console.error("Error parsing JSON:", e);
      }
    }
  }

  return result;
};

export const pullOllamaModel = async (model, callback) => {
  try {
    const response = await fetch("http://localhost:11434/api/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: model,
        stream: true,
      }),
    });

    let result = "";
    await processStreamResponse(response, (parsed) => {
      if (callback && parsed.status) {
        callback(parsed.status);
      }
      if (parsed.status) {
        result += parsed.status;
      }
    });

    return result;
  } catch (error) {
    console.error("Error pulling Ollama model:", error);
    return null;
  }
};

export async function askOllamaStream(prompt, model = "qwen3:4b", callback) {
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: true,
        options: {
          num_ctx: 2048, // 上下文窗口大小
          temperature: 0.7, // 创造性程度
          repeat_penalty: 1.1,
          num_predict: 512, // 最大生成长度
          enable_thinking: "False",
        },
      }),
    });

    let result = "";
    await processStreamResponse(response, (parsed) => {
      if (parsed.response) {
        result += parsed.response;
        if (callback) callback(parsed.response);
      }
    });

    return result;
  } catch (error) {
    console.error("Error communicating with Ollama:", error);
    return null;
  }
}
