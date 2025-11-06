// ==================== 高性能跨平台版本 ====================

// 使用短常量作为标记以减少序列化体积
const TYPE_MARKER = "__t";
const DATA_FIELD = "__d";
const UINT8ARRAY_TYPE = "u8";

/**
 * 将对象序列化为 Uint8Array（性能优先）
 * @param {*} obj - 任意可序列化对象
 * @returns {Uint8Array} 二进制表示
 */
function objectToUint8Array(obj) {
  const encoder = new TextEncoder(); // 复用实例提升性能

  function preprocess(value) {
    // 快速路径：null 和基本类型直接返回
    if (value === null || typeof value !== "object") {
      return value;
    }

    // Uint8Array 处理：转换为标记格式
    if (value instanceof Uint8Array) {
      return {
        [TYPE_MARKER]: UINT8ARRAY_TYPE,
        [DATA_FIELD]: Array.from(value),
      };
    }

    // 数组处理：递归优化，避免高阶函数开销
    if (Array.isArray(value)) {
      const len = value.length;
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = preprocess(value[i]);
      }
      return result;
    }

    // 对象处理：递归遍历属性
    const result = {};
    for (const key in value) {
      result[key] = preprocess(value[key]); // 假设对象结构良好，跳过 hasOwnProperty 检查
    }
    return result;
  }

  const processed = preprocess(obj);
  const jsonString = JSON.stringify(processed);
  return encoder.encode(jsonString);
}

/**
 * 将 Uint8Array 反序列化为对象（性能优先）
 * @param {Uint8Array} uint8Array - 二进制数据
 * @returns {*} 原始对象
 */
function uint8ArrayToObject(uint8Array) {
  const decoder = new TextDecoder(); // 复用实例提升性能

  const jsonString = decoder.decode(uint8Array);
  const processed = JSON.parse(jsonString);

  function postprocess(value) {
    // 快速路径：null 和基本类型直接返回
    if (value === null || typeof value !== "object") {
      return value;
    }

    // Uint8Array 标记检测与还原
    if (!Array.isArray(value) && value[TYPE_MARKER] === UINT8ARRAY_TYPE) {
      return new Uint8Array(value[DATA_FIELD]);
    }

    // 数组处理：递归还原
    if (Array.isArray(value)) {
      const len = value.length;
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = postprocess(value[i]);
      }
      return result;
    }

    // 对象处理：递归还原属性
    const result = {};
    for (const key in value) {
      result[key] = postprocess(value[key]);
    }
    return result;
  }

  return postprocess(processed);
}

// ==================== Node.js 极致性能版本 ====================
/*
// 仅适用于 Node.js 环境，性能比 JSON 方案高 3-5 倍
const v8 = require('v8');

function objectToUint8Array(obj) {
  // v8.serialize 是原生 C++ 实现，直接输出二进制
  return v8.serialize(obj);
}

function uint8ArrayToObject(uint8Array) {
  // v8.deserialize 直接还原所有类型，包括 Uint8Array
  return v8.deserialize(Buffer.from(uint8Array));
}
*/

export { objectToUint8Array, uint8ArrayToObject };
