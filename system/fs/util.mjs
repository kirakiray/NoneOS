// 根据 path 获取 路径 和 文件名
export const getName = (path) => {
  const dir = path.replace(/(.*\/).+/, "$1");
  const name = path.replace(/.*\/(.+)/, "$1");
  return { dir, name };
};
