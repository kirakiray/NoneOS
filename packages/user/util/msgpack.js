/**
 * 将带有 Uint8Array 属性的对象转换为 Uint8Array
 * @param {Object} obj - 包含 Uint8Array 属性的对象
 * @returns {Uint8Array} 转换后的 Uint8Array
 */
export function objectToUint8Array(obj) {
  // 首先将对象转换为 JSON 字符串
  const jsonString = JSON.stringify(obj, (key, value) => {
    // 处理 Uint8Array 的特殊序列化
    if (value instanceof Uint8Array) {
      return {
        __type: "Uint8Array",
        data: Array.from(value),
      };
    }
    return value;
  });

  // 将 JSON 字符串编码为 Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}

/**
 * 将 Uint8Array 转换回原始对象
 * @param {Uint8Array} uint8Array - 要转换的 Uint8Array
 * @returns {Object} 还原后的对象
 */
export function uint8ArrayToObject(uint8Array) {
  // 将 Uint8Array 解码为 JSON 字符串
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(uint8Array);

  // 解析 JSON 字符串并恢复 Uint8Array
  return JSON.parse(jsonString, (key, value) => {
    // 检查是否是标记的 Uint8Array
    if (value && value.__type === "Uint8Array" && Array.isArray(value.data)) {
      return new Uint8Array(value.data);
    }
    return value;
  });
}

// // 使用示例
// const testObject = {
//   name: "测试对象",
//   number: 42,
//   buffer: new Uint8Array([1, 2, 3, 4, 5]),
//   nested: {
//     data: new Uint8Array([10, 20, 30]),
//     text: "嵌套文本",
//   },
// };

// console.log("原始对象:", testObject);

// // 转换为 Uint8Array
// const uint8Array = objectToUint8Array(testObject);
// console.log("转换后的 Uint8Array:", uint8Array);

// // 还原为对象
// const restoredObject = uint8ArrayToObject(uint8Array);
// console.log("还原后的对象:", restoredObject);

// // 验证 Uint8Array 是否被正确还原
// console.log("buffer 类型验证:", restoredObject.buffer instanceof Uint8Array);
// console.log("buffer 内容验证:", Array.from(restoredObject.buffer));
// console.log(
//   "nested.data 类型验证:",
//   restoredObject.nested.data instanceof Uint8Array
// );
// console.log("nested.data 内容验证:", Array.from(restoredObject.nested.data));
