/**
 * @file util.js
 * @author yao
 * 传入一个数据，计算哈希值
 * @param {ArrayBuffer|Blob|String} data 数据
 * @return {Promise<string>} 哈希值
 */
export const getHash = async (data) => {
  if (typeof data === "string") {
    data = new TextEncoder().encode(data);
  } else if (data instanceof Blob) {
    data = await data.arrayBuffer();
  }

  const hash = await crypto.subtle.digest("SHA-256", data);

  // 将哈希值转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
};
/**
 * 计算文件的分块哈希值
 * @param {File} file - 要计算哈希的文件对象
 * @returns {Promise<string[]>} 返回包含所有分块哈希值的数组
 * @description 将文件分割成128KB大小的块，并计算每个块的SHA-256哈希值
 */
export const calculateFileChunkHashes = async (file) => {
  const CHUNK_SIZE = 128 * 1024; // 128kb
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async (e) => {
      const buffer = e.target.result;
      // 创建所有块的哈希计算Promise数组
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
};

// 获取文件哈希值
// 将文件切割成128kb的块，计算每个块的哈希值，然后将所有块的哈希值拼接起来，计算最终的哈希值
export const getFileHash = async (file) => {
  const hashArray = await calculateFileChunkHashes(file);
  return getHash(hashArray.join(""));
};

// 查看是否Safari
export const isSafari = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
})();
