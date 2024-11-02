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

    client.send(composedData);

    // if (composedData.byteLength < originData.byteLength) {
    //   // 压缩后数据更小的话，，传输压缩后的数据
    //   client.send(composedData);
    // } else {
    //   client.send(originData);
    // }
  }
});

// 获取到了数据流
userMiddleware.set("response-block", async (chunk, client) => {
  let data = chunk;
  //   if (chunk.byteLength < CHUNK_REMOTE_SIZE) {
  try {
    // 是压缩文件，先进行解压缩
    data = await decompressArrayBuffer(chunk);
  } catch (err) {
    // TODO: 数据损坏解压缩失败
    debugger;
  }
  //   }

  // 保存块数据
  await saveBlock([data]);
});

// 对文件进行压缩  // gzip or deflate
async function compressArrayBuffer(buffer, type = "deflate") {
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
}

// 解压缩文件
async function decompressArrayBuffer(compressedBuffer, type = "deflate") {
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
}
