import { get as dbGet } from "./handle/index.js";
import { get as originGet, showPicker } from "./o-handle/index.js";
import { get as remoteGet } from "./r-handle/index.js";

export const origin = {
  get: originGet,
  showPicker,
};

// 根据首个地址，选取特定的
export const get = async (path, options) => {
  if (/^\$remote:/.test(path)) {
    return remoteGet(path);
  }

  return dbGet(path, options);
};
