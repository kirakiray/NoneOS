/**
 * 将任意可 JSON 序列化的对象 + 一个 Uint8Array 打包成一个新的 Uint8Array
 * @param {any} obj        可 JSON 序列化的对象
 * @param {Uint8Array} data 二进制数据
 * @returns {Uint8Array}   合并后的结果
 */
export function pack(obj, data) {
  const meta = new TextEncoder().encode(JSON.stringify(obj));
  const header = new Uint8Array(4);
  new DataView(header.buffer).setUint32(0, meta.length, true); // 小端 4 字节长度

  const result = new Uint8Array(4 + meta.length + data.length);
  result.set(header, 0);
  result.set(meta, 4);
  result.set(data, 4 + meta.length);
  return result;
}

/**
 * 将 pack 生成的 Uint8Array 还原成 { obj, data }
 * @param {Uint8Array} buffer 由 pack 产生的数据
 * @returns {{obj: any, data: Uint8Array}}
 */
export function unpack(buffer) {
  if (buffer.length < 4) throw new Error("Invalid buffer");
  const metaLen = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(
    0,
    true
  );
  if (4 + metaLen > buffer.length) throw new Error("Invalid meta length");

  const metaBytes = buffer.slice(4, 4 + metaLen);
  const data = buffer.slice(4 + metaLen);

  const obj = JSON.parse(new TextDecoder().decode(metaBytes));
  return { obj, data };
}

// /* ========== 使用示例 ========== */
// const originalObj = { name: "Alice", age: 23 };
// const originalData = new Uint8Array([0xff, 0x00, 0xab, 0xcd]);

// const packed = pack(originalObj, originalData);
// console.log("packed:", packed);

// const { obj, data } = unpack(packed);
// console.log("unpacked obj:", obj);
// console.log("unpacked data:", data);
