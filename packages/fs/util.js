/**
 * @file util.js
 * @author yao
 * 传入一个数据，计算哈希值
 * @param {ArrayBuffer|Blob|String} data 数据
 * @return {Promise<string>} 哈希值
 */
export const getHash = async (data) => {
  if (!globalThis.crypto) {
    // Node.js 环境
    const crypto = await import("crypto");
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from(data));
    return hash.digest("hex");
  } else {
    // 浏览器环境
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }
};
/**
 * 计算文件的分块哈希值
 * @param {File|ArrayBuffer} file - 要计算哈希的文件对象或ArrayBuffer
 * @returns {Promise<string[]>} 返回包含所有分块哈希值的数组
 * @description 将文件分割成128KB大小的块，并计算每个块的SHA-256哈希值
 */
export const calculateFileChunkHashes = async (
  file,
  { callback, chunkSize } = {}
) => {
  const CHUNK_SIZE = chunkSize || 128 * 1024; // 128kb
  // 获取文件的 ArrayBuffer
  const getBuffer = async (file) => {
    if (
      typeof window !== "undefined" &&
      window.FileReader &&
      file instanceof Blob
    ) {
      return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => resolve(e.target.result);
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
      });
    }

    if (file instanceof ArrayBuffer) return file;
    if (file instanceof Buffer) return file;
    return Buffer.from(file);
  };

  // 处理文件分块并计算哈希
  const buffer = await getBuffer(file);
  const hashPromises = [];

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

/**
 * 获取文件的总体哈希值
 * @param {File} file - 要计算哈希的文件对象
 * @returns {Promise<string>} 返回文件的总体哈希值
 * @description 将文件分割成128kb大小的块，计算每个块的SHA-256哈希值，
 *             然后将所有块的哈希值拼接成字符串，最后计算这个字符串的哈希值作为文件的总体哈希值
 */
export const getFileHash = async (file) => {
  const hashArray = await calculateFileChunkHashes(file);
  return getHash(hashArray.join(""));
};

// 查看是否Safari
export const isSafari = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
})();
