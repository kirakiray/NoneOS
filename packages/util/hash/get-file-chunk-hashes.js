import { getHash } from "./get-hash.js";

/**
 * 计算文件的分块哈希值
 * @param {File|ArrayBuffer|String} file - 要计算哈希的文件对象、ArrayBuffer或字符串
 * @returns {Promise<string[]>} 返回包含所有分块哈希值的数组
 * @description 将文件分割成128KB大小的块，并计算每个块的SHA-256哈希值
 */
export const getFileChunkHashes = async (
  file,
  { callback, chunkSize } = {}
) => {
  const CHUNK_SIZE = chunkSize || 128 * 1024; // 128kb
  // 获取文件的 ArrayBuffer
  const getBuffer = async (file) => {
    if (file instanceof Blob) {
      return file.arrayBuffer();
    }

    if (file instanceof ArrayBuffer) {
      return file;
    }

    if (typeof file === "string") {
      // 如果是字符串，转换为ArrayBuffer
      return new TextEncoder().encode(file).buffer;
    }

    // 添加对Nodejs Buffer的支持
    if (typeof Buffer !== "undefined" && file instanceof Buffer) {
      return file.buffer;
    }

    console.error("不支持的文件类型: ", typeof file, file);
    throw new Error("不支持的文件类型: ");
  };

  // 处理文件分块并计算哈希
  const buffer = await getBuffer(file);
  const hashPromises = [];

  // TODO: 这里应该分批发送代码块
  for (let i = 0; i < buffer.byteLength; i += CHUNK_SIZE) {
    const chunk = buffer.slice(i, i + CHUNK_SIZE);
    const hash = await getHash(chunk);
    if (callback) {
      callback({
        chunk,
        chunkHash: hash,
        chunkIndex: i,
      });
    }
    hashPromises.push(hash);
  }

  return Promise.all(hashPromises);
};
