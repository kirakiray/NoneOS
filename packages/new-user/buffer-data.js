// 将数据和对象组装起来，变成buffer对象
export const toBuffer = (originBuffer, info) => {
  let prefixBuffer = new Uint8Array(JSON.stringify(info).length);
  prefixBuffer.set(new TextEncoder().encode(JSON.stringify(info)));

  // 创建一个新的 Uint8Array，第一个值是 prefixBuffer 的长度，紧接着跟着prefixBuffer，再接着跟着originBuffer
  const combinedBuffer = new Uint8Array(
    prefixBuffer.length + originBuffer.length + 1
  );
  combinedBuffer.set([prefixBuffer.length], 0);
  combinedBuffer.set(prefixBuffer, 1);
  combinedBuffer.set(originBuffer, prefixBuffer.length + 1);

  return combinedBuffer;
};

// 拆解 buffer 对象，返回数据和对象
export const toData = (buffer) => {
  const prefixLength = buffer[0];
  const prefixBuffer = buffer.slice(1, prefixLength + 1);
  const originBuffer = buffer.slice(prefixLength + 1);

  const info = JSON.parse(new TextDecoder().decode(prefixBuffer));

  return {
    data: originBuffer,
    info: info,
  };
};
