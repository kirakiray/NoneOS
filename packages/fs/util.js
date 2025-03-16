/**
 * @file util.js
 * @author yao
 * 传入一个数据，计算哈希值
 * @param {ArrayBuffer|Blob|String} data 数据
 * @return {Promise<string>} 哈希值
 */
export const getHash = async (data) => {
  if (typeof window === "undefined") {
    // Node.js 环境
    const crypto = await import('crypto');
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      data = await data.arrayBuffer();
    }
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(data));
    return hash.digest('hex');
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
 * @param {File} file - 要计算哈希的文件对象
 * @returns {Promise<string[]>} 返回包含所有分块哈希值的数组
 * @description 将文件分割成128KB大小的块，并计算每个块的SHA-256哈希值
 */
export const calculateFileChunkHashes = async (file) => {
  const CHUNK_SIZE = 128 * 1024; // 128kb

  // 判断运行环境，使用不同的方式读取文件
  if (typeof window !== "undefined" && window.FileReader) {
    // 浏览器环境使用 FileReader
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onload = async (e) => {
        const buffer = e.target.result;
        const hashPromises = [];
        for (let i = 0; i < buffer.byteLength; i += CHUNK_SIZE) {
          const chunk = buffer.slice(i, i + CHUNK_SIZE);
          hashPromises.push(getHash(chunk));
        }
        resolve(await Promise.all(hashPromises));
      };
      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(file);
    });
  } else {
    // Node.js 环境直接处理 Buffer
    const buffer = file instanceof Buffer ? file : Buffer.from(file);
    const hashPromises = [];
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      hashPromises.push(getHash(chunk));
    }
    return Promise.all(hashPromises);
  }
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
