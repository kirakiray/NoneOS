const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function pack(obj, data) {
  // 将对象序列化为JSON字符串并编码为字节
  const jsonStr = JSON.stringify(obj);
  const objBytes = textEncoder.encode(jsonStr);

  // 创建结果缓冲区：4字节头 + JSON字节 + 原始数据
  const result = new Uint8Array(4 + objBytes.length + data.length);

  // 手动写入4字节大端序长度（避免DataView开销）
  const len = objBytes.length;
  result[0] = (len >>> 24) & 0xff;
  result[1] = (len >>> 16) & 0xff;
  result[2] = (len >>> 8) & 0xff;
  result[3] = len & 0xff;

  // 高效复制字节数据（直接内存操作）
  result.set(objBytes, 4);
  result.set(data, 4 + objBytes.length);

  return result;
}

function unpack(packed) {
  // 读取4字节大端序头
  const len =
    (packed[0] << 24) | (packed[1] << 16) | (packed[2] << 8) | packed[3];

  // 安全边界检查
  if (4 + len > packed.length) {
    throw new Error("Invalid packed data: declared length exceeds buffer size");
  }

  // 零拷贝创建视图
  const objBytes = packed.subarray(4, 4 + len);
  const data = packed.subarray(4 + len);

  // 解析JSON对象
  const jsonStr = textDecoder.decode(objBytes);
  const obj = JSON.parse(jsonStr);

  return { obj, data };
}

export { pack, unpack };
