import { BaseCacheHandle } from "./base.js";
import { notify } from "../public/base.js";
import { extendFileHandle } from "../public/file.js";
// 修改这行，改用 saveCache
import { getCache, saveCache, ensureCache } from "./public.js";

export class FileCacheHandle extends BaseCacheHandle {
  constructor(...args) {
    super(...args);

    ensureCache({
      cache: this._cache,
      path: this.path,
      type: "file",
    });
  }

  async read(options = {}) {
    const { data } = await getCache(this._cache, this.path);

    if (!data) {
      return options.type === "buffer" ? new ArrayBuffer(0) : "";
    }

    // 处理 Blob 类型数据
    const blobData = data instanceof Blob ? data : new Blob([data]);

    switch (options.type) {
      case "buffer":
        return await blobData.arrayBuffer();
      case "text":
      default:
        return await blobData.text();
    }
  }

  async write(data, options = {}) {
    // 修改这里，使用 saveCache 替代 setCache
    await saveCache({
      cache: this._cache,
      path: this.path,
      type: "file",
      data,
    });

    notify({
      path: this.path,
      type: "write",
      data,
      remark: options.remark,
    });
  }
}

extendFileHandle(FileCacheHandle);
