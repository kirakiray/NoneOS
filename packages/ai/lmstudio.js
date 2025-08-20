export async function chat({ onChunk, model, messages }) {
  if (!model) {
    throw new Error("Model is required");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and cannot be empty");
  }

  // 根据是否存在 onChunk 来决定是否使用流式传输
  const useStream = Boolean(onChunk && typeof onChunk === "function");

  try {
    const res = await fetch("http://localhost:1234/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 256,
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
        if (trimmedLine === "" || !trimmedLine.startsWith("data: ")) {
          continue;
        }

        const jsonStr = trimmedLine.slice(6);
        if (jsonStr === "[DONE]") {
          return fullResponse; // 流结束标志
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;

          if (delta) {
            fullResponse += delta;
            if (onChunk && typeof onChunk === "function") {
              onChunk({ delta, fullResponse });
            }
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
