// 共享的编码器实例，避免重复创建
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * 将对象和 Uint8Array 数据打包成单个 Uint8Array
 * 二进制格式: [objLength(4字节)][dataLength(4字节)][objBytes][dataBytes]
 * @param {Object} obj - 要打包的对象（必须是 JSON 可序列化的）
 * @param {Uint8Array} data - 要打包的二进制数据
 * @returns {Uint8Array} 打包后的数据
 */
export function pack(obj, data) {
  // 序列化对象并转换为二进制
  const objBytes = encoder.encode(JSON.stringify(obj));
  const dataLength = data.length;

  // 一次性分配所有内存
  const totalLength = 8 + objBytes.length + dataLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // 写入元数据（小端序，现代 CPU 处理更快）
  view.setUint32(0, objBytes.length, true);
  view.setUint32(4, dataLength, true);

  // 填充数据段（批量拷贝，性能最优）
  const result = new Uint8Array(buffer);
  result.set(objBytes, 8);
  result.set(data, 8 + objBytes.length);

  return result;
}

/**
 * 从打包的 Uint8Array 中解包出对象和 Uint8Array 数据
 * @param {Uint8Array} packed - 打包后的数据
 * @returns {{obj: Object, data: Uint8Array}} 解包后的对象和数据
 */
export function unpack(packed) {
  // 从 DataView 读取元数据（无需拷贝）
  const view = new DataView(
    packed.buffer,
    packed.byteOffset,
    packed.byteLength
  );
  const objLength = view.getUint32(0, true);
  const dataLength = view.getUint32(4, true);

  // 提取对象数据（subarray 创建视图，零拷贝）
  const objOffset = 8;
  const objBytes = packed.subarray(objOffset, objOffset + objLength);
  const obj = JSON.parse(decoder.decode(objBytes));

  // 提取原始数据（subarray 创建视图，零拷贝）
  const dataOffset = objOffset + objLength;
  const data = packed.subarray(dataOffset, dataOffset + dataLength);

  return { obj, data };
}
