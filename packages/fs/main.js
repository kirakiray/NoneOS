import { DirHandle } from "./handle/dir.js";
export const get = async (path, options) => {
  debugger;
};

// 初始化空间
export const init = async (name, options) => {
  const opfsRoot = await navigator.storage.getDirectory();

  const dir = await opfsRoot.getDirectoryHandle(name, { create: true });

  return new DirHandle(dir);
};

export default get;
