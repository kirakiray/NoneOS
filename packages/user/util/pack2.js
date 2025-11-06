// 高性能的 pack 和 unpack 函数

/**
 * 将对象和二进制数据打包成一个 Uint8Array
 * @param {Object} obj - 要打包的对象
 * @param {Uint8Array} data - 要打包的二进制数据
 * @returns {Uint8Array} 打包后的数据
 */
export function pack(obj, data) {
  // 将对象序列化为 JSON 字符串
  const objString = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const objData = encoder.encode(objString);

  // 计算总长度：对象数据长度(4字节) + 对象数据 + 二进制数据
  const totalLength = 4 + objData.length + data.length;
  const packed = new Uint8Array(totalLength);

  // 使用 DataView 写入对象数据长度（32位无符号整数）
  const dataView = new DataView(packed.buffer);
  dataView.setUint32(0, objData.length, true); // true 表示小端字节序

  // 复制对象数据
  packed.set(objData, 4);

  // 复制二进制数据
  packed.set(data, 4 + objData.length);

  return packed;
}

/**
 * 从打包的数据中解包出对象和二进制数据
 * @param {Uint8Array} packed - 打包后的数据
 * @returns {Object} 包含 obj 和 data 的对象
 */
export function unpack(packed) {
  // 读取对象数据长度
  const dataView = new DataView(packed.buffer);
  const objDataLength = dataView.getUint32(0, true);

  // 提取对象数据
  const objData = packed.subarray(4, 4 + objDataLength);

  // 提取二进制数据
  const data = packed.subarray(4 + objDataLength);

  // 将对象数据反序列化
  const decoder = new TextDecoder();
  const objString = decoder.decode(objData);
  const obj = JSON.parse(objString);

  return { obj, data };
}

// // 使用示例
// const originalObj = { name: "Alice", age: 23 };
// const originalData = new Uint8Array([0xff, 0x00, 0xab, 0xcd]);

// const packed = pack(originalObj, originalData);
// console.log("packed:", packed);

// const { obj, data } = unpack(packed);
// console.log("unpacked obj:", obj);
// console.log("unpacked data:", data);
