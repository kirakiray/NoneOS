/**
 * 将带有 Uint8Array 属性的对象转换为 Uint8Array
 * @param {Object} obj - 包含 Uint8Array 属性的对象
 * @returns {Uint8Array} 转换后的 Uint8Array
 */
export function objectToUint8Array(obj) {
  // 定义大体积数据的阈值（字节），超过此大小的数据将被特殊处理
  const LARGE_DATA_THRESHOLD = 50 * 1024; // 50KB

  // 用于存储大体积二进制数据的映射
  const binaryDataMap = new Map();
  let binaryDataIndex = 0;

  // 首先将对象转换为 JSON 字符串
  const jsonString = JSON.stringify(obj, (key, value) => {
    // 处理 Uint8Array 的特殊序列化
    if (value instanceof Uint8Array) {
      // 对于大体积数据，使用引用方式处理
      if (value.length > LARGE_DATA_THRESHOLD) {
        const referenceKey = `__binary_ref_${binaryDataIndex++}`;
        binaryDataMap.set(referenceKey, value);
        return {
          __type: "LargeUint8Array",
          reference: referenceKey,
          length: value.length,
        };
      }
      // 对于小体积数据，保持原有处理方式
      return {
        __type: "Uint8Array",
        data: Array.from(value),
      };
    }
    return value;
  });

  // 将 JSON 字符串编码为 Uint8Array
  const encoder = new TextEncoder();
  const jsonUint8Array = encoder.encode(jsonString);

  // 如果没有大体积二进制数据，直接返回
  if (binaryDataMap.size === 0) {
    return jsonUint8Array;
  }

  // 如果有大体积二进制数据，需要特殊打包
  // 格式：[JSON数据长度(4字节)] + [JSON数据] + [二进制数据1] + [二进制数据2] + ...

  // 计算总长度
  let totalLength = 4 + jsonUint8Array.length; // 4字节用于存储JSON长度 + JSON数据长度
  for (const binaryData of binaryDataMap.values()) {
    totalLength += 4 + binaryData.length; // 4字节用于存储每个二进制数据的长度 + 数据长度
  }

  // 创建结果缓冲区
  const result = new Uint8Array(totalLength);
  let offset = 0;

  // 写入JSON数据长度（4字节）
  const jsonLengthView = new DataView(result.buffer, result.byteOffset, 4);
  jsonLengthView.setUint32(0, jsonUint8Array.length, true); // 小端序
  offset += 4;

  // 写入JSON数据
  result.set(jsonUint8Array, offset);
  offset += jsonUint8Array.length;

  // 写入二进制数据
  for (const [referenceKey, binaryData] of binaryDataMap.entries()) {
    // 写入二进制数据长度（4字节）
    const binaryLengthView = new DataView(
      result.buffer,
      result.byteOffset + offset,
      4
    );
    binaryLengthView.setUint32(0, binaryData.length, true); // 小端序
    offset += 4;

    // 写入二进制数据
    result.set(binaryData, offset);
    offset += binaryData.length;
  }

  return result;
}

/**
 * 将 Uint8Array 转换回原始对象
 * @param {Uint8Array} uint8Array - 要转换的 Uint8Array
 * @returns {Object} 还原后的对象
 */
export function uint8ArrayToObject(uint8Array) {
  if (uint8Array instanceof ArrayBuffer) {
    uint8Array = new Uint8Array(uint8Array);
  }

  // 确保输入是 Uint8Array
  if (!(uint8Array instanceof Uint8Array)) {
    throw new TypeError("Input must be a Uint8Array");
  }

  // 检查是否是特殊打包格式（通过是否有长度前缀判断）
  if (uint8Array.length < 4) {
    // 数据太短，不可能是特殊格式，使用原有逻辑
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(uint8Array);
    return JSON.parse(jsonString, (key, value) => {
      if (value && value.__type === "Uint8Array" && Array.isArray(value.data)) {
        return new Uint8Array(value.data);
      }
      return value;
    });
  }

  // 为Uint8Array创建新的ArrayBuffer以避免DataView构造错误
  const buffer = uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength
  );

  // 读取JSON数据长度
  const lengthView = new DataView(buffer, 0, 4);
  const jsonLength = lengthView.getUint32(0, true); // 小端序

  // 如果长度不合理，使用原有逻辑
  if (jsonLength <= 0 || jsonLength >= buffer.byteLength - 4) {
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(uint8Array);
    return JSON.parse(jsonString, (key, value) => {
      if (value && value.__type === "Uint8Array" && Array.isArray(value.data)) {
        return new Uint8Array(value.data);
      }
      return value;
    });
  }

  // 提取JSON数据
  const jsonUint8Array = new Uint8Array(buffer, 4, jsonLength);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(jsonUint8Array);

  // 提取二进制数据映射
  const binaryDataMap = new Map();
  let offset = 4 + jsonLength;

  while (offset < buffer.byteLength) {
    // 读取二进制数据长度
    const binaryLengthView = new DataView(buffer, offset, 4);
    const binaryLength = binaryLengthView.getUint32(0, true); // 小端序
    offset += 4;

    // 提取二进制数据
    const binaryData = new Uint8Array(buffer, offset, binaryLength);
    // 为二进制数据生成引用键（这里简化处理，实际应用中可能需要更复杂的映射）
    const referenceKey = `__binary_ref_${binaryDataMap.size}`;
    binaryDataMap.set(referenceKey, binaryData);

    offset += binaryLength;
  }

  // 解析 JSON 字符串并恢复对象
  const jsonObject = JSON.parse(jsonString, (key, value) => {
    // 检查是否是标记的小体积 Uint8Array
    if (value && value.__type === "Uint8Array" && Array.isArray(value.data)) {
      return new Uint8Array(value.data);
    }

    // 检查是否是标记的大体积 Uint8Array 引用
    if (
      value &&
      value.__type === "LargeUint8Array" &&
      typeof value.reference === "string"
    ) {
      return binaryDataMap.get(value.reference) || new Uint8Array(0);
    }

    return value;
  });

  return jsonObject;
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
