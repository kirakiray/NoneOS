import { default as dbGet } from "./handle/get.js";
import { get as originGet } from "./origin.js";
export { showPicker } from "./origin.js";
export { getRemotes } from "./remote.js";
import { RemoteDirHandle } from "./r-handle/dir.js";

export const origin = {
  get: originGet,
};

// 根据首个地址，选取特定的
export const get = async (path, options) => {
  if (/^\$remote:/.test(path)) {
    debugger;
    return new RemoteDirHandle();
  }

  return dbGet(path, options);
};
