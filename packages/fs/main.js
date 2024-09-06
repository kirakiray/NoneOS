import { get as dbGet, createRoot } from "./handle/index.js";
import { get as originGet, showPicker } from "./o-handle/index.js";
import { RemoteDirHandle } from "./r-handle/dir.js";

export const origin = {
  get: originGet,
  showPicker,
};

// 根据首个地址，选取特定的
export const get = async (path, options) => {
  if (/^\$remote:/.test(path)) {
    return new RemoteDirHandle(async () => {});
  }

  return dbGet(path, options);
};
