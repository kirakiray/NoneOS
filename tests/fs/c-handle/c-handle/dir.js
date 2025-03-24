import { BaseCacheHandle } from "./base.js";
import { FileCacheHandle } from "./file.js";
import { extendDirHandle } from "../public/dir.js";

export class DirCacheHandle extends BaseCacheHandle {
  constructor(...args) {
    super(...args);
  }

  async get(name, options) {
    const { create } = options || {};

    if (name.includes("/")) {
      return await this._getByMultiPath(name, options);
    }

    // 先判断是否存在
    const targetPath = this.path + "/" + name;
    this._cache

    debugger;
  }

  async length() {
    debugger;
  }

  async *keys() {
    debugger;
  }
}

extendDirHandle(DirCacheHandle);
