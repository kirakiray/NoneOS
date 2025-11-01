import { getFileChunkHashes } from "./get-file-chunk-hashes.js";

// 监听主线程发送的消息
onmessage = async (e) => {
  const { file, options } = e.data;

  try {
    // 调用分块哈希计算函数
    const result = await getFileChunkHashes(file, options);

    // 将结果发送回主线程
    postMessage({ type: "result", data: result });
  } catch (error) {
    // 将错误发送回主线程
    postMessage({ type: "error", error: error.message });
  }
};
