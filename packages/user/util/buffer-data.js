/**
 * 将数据和对象信息组装成一个buffer对象
 * 格式：[prefixLength][prefixBuffer][originBuffer]
 * @param {Uint8Array} originBuffer - 原始二进制数据
 * @param {Object} info - 要附加的对象信息
 * @returns {Uint8Array} 组装后的buffer对象
 * @throws {Error} 当参数类型不正确时抛出错误
 */
export const toBuffer = (originBuffer, info) => {
  // 参数类型检查
  if (!(originBuffer instanceof Uint8Array)) {
    throw new Error("originBuffer must be a Uint8Array");
  }

  // 将对象信息转换为JSON字符串并编码为Uint8Array
  const infoJson = JSON.stringify(info);
  const infoBuffer = new TextEncoder().encode(infoJson);

  // 检查长度是否超出限制（255字节）
  if (infoBuffer.length > 255) {
    throw new Error(
      "Info data is too large, must be less than 255 bytes: \n" + infoJson
    );
  }

  // 第一个字节存储infoBuffer的长度
  const prefixLength = infoBuffer.length;

  // 创建组合buffer：prefixLength + infoBuffer + originBuffer
  const combinedBuffer = new Uint8Array(1 + prefixLength + originBuffer.length);

  // 设置各部分数据
  combinedBuffer[0] = prefixLength;
  combinedBuffer.set(infoBuffer, 1);
  combinedBuffer.set(originBuffer, 1 + prefixLength);

  return combinedBuffer;
};

/**
 * 从buffer对象中解析出原始数据和附加信息
 * @param {Uint8Array} buffer - 包含数据和信息的buffer对象
 * @returns {Object} 包含data和info属性的对象
 * @throws {Error} 当buffer格式不正确或数据损坏时抛出错误
 */
export const toData = (buffer) => {
  // 参数检查
  if (!(buffer instanceof Uint8Array)) {
    throw new Error("buffer must be a Uint8Array");
  }

  if (buffer.length < 1) {
    throw new Error("buffer is too short");
  }

  // 读取infoBuffer的长度
  const prefixLength = buffer[0];

  // 边界检查
  if (1 + prefixLength > buffer.length) {
    throw new Error("buffer is corrupted or format is incorrect");
  }

  // 提取infoBuffer和originBuffer
  const infoBuffer = buffer.slice(1, 1 + prefixLength);
  const originBuffer = buffer.slice(1 + prefixLength);

  // 解码infoBuffer为对象
  try {
    const infoJson = new TextDecoder().decode(infoBuffer);
    const info = JSON.parse(infoJson);

    return {
      data: originBuffer,
      info: info,
    };
  } catch (error) {
    throw new Error("Failed to parse info data: " + error.message);
  }
};
