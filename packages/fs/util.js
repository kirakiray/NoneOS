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

// 查看是否Safari
export const isSafari = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
})();
