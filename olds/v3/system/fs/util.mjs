// 根据 path 获取 路径 和 文件名
export const getName = (path) => {
  const dir = path.replace(/(.*\/).+/, "$1");
  const name = path.replace(/.*\/(.+)/, "$1");
  return { dir, name };
};

// 获取随机id
export const createFid = (() => {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID.bind(crypto);
  }
  return () =>
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((e) => e.toString(16))
      .join("");
})();
