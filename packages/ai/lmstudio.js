export async function chat({ onChunk, model, messages }) {
  if (!model) {
    throw new Error("Model is required");
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages array is required and cannot be empty");
  }

  try {
    const res = await fetch("http://localhost:1234/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 256,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

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
