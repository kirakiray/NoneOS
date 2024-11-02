import { get } from "../../fs/handle/index.js";
import { CHUNK_REMOTE_SIZE } from "../../fs/util.js";
import { userMiddleware } from "../main.js";
import { saveBlock } from "./main.js";

// 得到了获取块的请求
userMiddleware.set("get-block", async (options, client) => {
  const blocksCacheDir = await get("local/caches/blocks", {
    create: "dir",
  });

  const { hashs } = options;

  for (let hash of hashs) {
    const cacheFile = await blocksCacheDir.get(hash);

    if (!cacheFile) {
      // TODO: 过早的清除了缓存，尝试从临时数据上，查看这个缓存是在哪个文件上的，并从中获取
      debugger;
    }

    const originData = await cacheFile.buffer();
    const composedData = await compressArrayBuffer(originData);

    let finnalData;

    if (composedData.byteLength < originData.byteLength) {
      // 压缩后数据更小的话，传输压缩后的数据
      // 最后一个字节标识为100，表示为压缩格式
      finnalData = createFinalData(composedData, 100);
    } else {
      // 最后一个字节标识为 101，标识为原格式
      finnalData = createFinalData(originData, 101);
    }

    client.send(finnalData);
  }
});

// 获取到了数据流
userMiddleware.set("response-block", async (chunk, client) => {
  let data;

  const { buffer, lastByte } = await extractLastByte(chunk);

  if (lastByte === 100) {
    // 压缩的数据
    try {
      // 是压缩文件，先进行解压缩
      data = await decompressArrayBuffer(buffer);
    } catch (err) {
      // TODO: 数据损坏解压缩失败
      debugger;
    }
  } else if (lastByte === 101) {
    data = buffer;
  } else {
    // TODO: 不明类型数据
    debugger;
  }

  // 保存块数据
  await saveBlock([data]);
});

// 对文件进行压缩  // gzip or deflate
const compressArrayBuffer = (() => {
  if (typeof CompressionStream === "undefined") {
    return async (buffer, type = "deflate") => {
      const { default: pako } = await import(
        "/packages/libs/pako/pako.esm.mjs"
      );

      // 将 ArrayBuffer 转换为 Uint8Array
      const uint8Array = new Uint8Array(buffer);
      // 使用 pako 压缩
      return type === "deflate"
        ? pako.deflate(uint8Array)
        : pako.gzip(uint8Array);
    };
  }

  return async (buffer, type = "deflate") => {
    // 创建一个压缩流
    const compressionStream = new CompressionStream(type);

    // 将 ArrayBuffer 转换成一个可读的 Blob 对象，然后管道压缩
    const readableStream = new Blob([buffer])
      .stream()
      .pipeThrough(compressionStream);

    // 通过一个新的 Response 对象来获取压缩后的数据
    const compressedArrayBuffer = await new Response(
      readableStream
    ).arrayBuffer();

    return compressedArrayBuffer;
  };
})();

// 解压缩文件
const decompressArrayBuffer = (() => {
  if (typeof DecompressionStream === "undefined") {
    return async (compressedBuffer) => {
      const { default: pako } = await import(
        "/packages/libs/pako/pako.esm.mjs"
      );

      // 使用 pako 解压
      const decompressed = pako.ungzip(compressedBuffer);

      // 返回解压后的 Uint8Array，转换为 ArrayBuffer
      return decompressed.buffer;
    };
  }

  return async (compressedBuffer, type = "deflate") => {
    // 创建一个解压缩流
    const decompressionStream = new DecompressionStream(type);

    // 将压缩的 ArrayBuffer 转换成一个可读的 Blob 对象，然后管道解压
    const readableStream = new Blob([compressedBuffer])
      .stream()
      .pipeThrough(decompressionStream);

    // 通过一个新的 Response 对象来获取解压缩后的数据
    const decompressedArrayBuffer = await new Response(
      readableStream
    ).arrayBuffer();

    return decompressedArrayBuffer;
  };
})();

// 创建一个新的 ArrayBuffer，额外的一个字节用于标识数据格式
const createFinalData = (data, formatFlag) => {
  const newBuffer = new ArrayBuffer(data.byteLength + 1); // 新建 ArrayBuffer，大小为数据长度 + 1
  const view = new Uint8Array(newBuffer); // 使用 Uint8Array 视图来操作新的 ArrayBuffer

  // 将原数据复制到新 ArrayBuffer 中
  view.set(new Uint8Array(data), 0); // 从源数据的起始位置开始复制

  // 在最后一个字节位置标记数据格式
  view[data.byteLength] = formatFlag; // 设置格式标识字节
  return newBuffer; // 返回新的 ArrayBuffer
};

/**
 * 从给定的 ArrayBuffer 中获取最后一个字节，并返回去掉最后一个字节的新 ArrayBuffer。
 * @param {ArrayBuffer} buffer - 原始 ArrayBuffer。
 * @returns {{ newBuffer: ArrayBuffer, lastByte: number }} - 包含新 ArrayBuffer 和最后一个字节的对象。
 */
function extractLastByte(buffer) {
  const length = buffer.byteLength; // 获取原始 ArrayBuffer 的长度

  if (length === 0) {
    throw new Error("Buffer is empty"); // 处理空缓冲区的情况
  }

  const lastByte = new Uint8Array(buffer)[length - 1]; // 获取最后一个字节

  // 创建一个新的 ArrayBuffer，大小为原始数据长度减去 1
  const newBuffer = new ArrayBuffer(length - 1);
  const newView = new Uint8Array(newBuffer); // 创建新的 Uint8Array 视图以操作新 ArrayBuffer

  // 将原始数据复制到新 ArrayBuffer 中（去掉最后一个字节）
  newView.set(new Uint8Array(buffer).subarray(0, length - 1));

  return { buffer: newBuffer, lastByte }; // 返回新的 ArrayBuffer 和最后一个字节
}
