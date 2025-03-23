import { BaseCacheHandle } from "./base.js";
import { notify } from "../public/base.js";
import { extendFileHandle } from "../public/file.js";

export class FileCacheHandle extends BaseCacheHandle {
  constructor(...args) {
    super(...args);
  }

  async read(options = {}) {
    const response = await this._cache.match(this._key);
    if (!response) return null;

    const blob = await response.blob();
    if (options.start || options.end) {
      return blob.slice(options.start, options.end);
    }

    switch (options.type) {
      case "file":
        return blob;
      case "text":
        return blob.text();
      case "buffer":
        return blob.arrayBuffer();
      default:
        return blob.text();
    }
  }

  async write(data, options = {}) {
    const response = new Response(data);
    await this._cache.put(this._key, response);

    notify({
      path: this.path,
      type: "write",
      data,
      remark: options.remark,
    });
  }
}

extendFileHandle(FileCacheHandle);