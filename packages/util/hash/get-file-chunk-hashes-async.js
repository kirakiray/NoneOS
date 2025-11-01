const workerPath = import.meta.resolve("./get-file-chunk-hashes.worker.js");

export const getFileChunkHashesAsync = async (
  file,
  { chunkSize } = {}
) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      type: "module",
    });

    // 发送数据到 Worker
    worker.postMessage({
      file,
      options: { chunkSize },
    });

    // 接收来自 Worker 的消息
    worker.onmessage = (e) => {
      const { type, data, error } = e.data;

      if (type === "result") {
        resolve(data);
        worker.terminate(); // 完成后终止 Worker
      } else if (type === "error") {
        reject(new Error(error));
        worker.terminate(); // 出错后终止 Worker
      }
    };

    // 处理 Worker 错误
    worker.onerror = (error) => {
      reject(error);
      worker.terminate(); // 出错后终止 Worker
    };
  });
};
