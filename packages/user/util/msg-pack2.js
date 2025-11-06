// 性能优化的对象转 Uint8Array 函数
function objectToUint8Array(obj) {
  // 使用结构化克隆算法，这是最高效的方式
  if (typeof structuredClone === "function") {
    return new Uint8Array(structuredClone(obj));
  }

  // 回退方案：使用 MessageChannel（同样基于结构化克隆）
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port2.onmessage = (e) => resolve(new Uint8Array(e.data));
    port1.postMessage(obj);
  });
}

// 性能优化的 Uint8Array 转对象函数
function uint8ArrayToObject(uint8Array) {
  // 使用结构化克隆算法反序列化
  if (typeof structuredClone === "function") {
    return structuredClone(uint8Array);
  }

  // 回退方案：使用 MessageChannel
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port2.onmessage = (e) => resolve(e.data);
    port1.postMessage(uint8Array);
  });
}

// 同步版本（如果需要同步操作）
function objectToUint8ArraySync(obj) {
  try {
    // 尝试使用 JSON + 特殊处理 Uint8Array
    const jsonString = JSON.stringify(obj, (key, value) => {
      if (value instanceof Uint8Array) {
        return {
          __type: "Uint8Array",
          data: Array.from(value),
        };
      }
      return value;
    });

    const encoder = new TextEncoder();
    return encoder.encode(jsonString);
  } catch (error) {
    throw new Error("对象包含不可序列化的属性，请使用异步版本");
  }
}

function uint8ArrayToObjectSync(uint8Array) {
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(uint8Array);

  return JSON.parse(jsonString, (key, value) => {
    if (value && value.__type === "Uint8Array") {
      return new Uint8Array(value.data);
    }
    return value;
  });
}

export { objectToUint8Array, uint8ArrayToObject, objectToUint8ArraySync, uint8ArrayToObjectSync };
