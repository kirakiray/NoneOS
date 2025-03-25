import { BaseCacheHandle } from "./base.js";
import { FileCacheHandle } from "./file.js";
import { extendDirHandle } from "../public/dir.js";
import { ensureCache, updateDir } from "./public.js";

export class DirCacheHandle extends BaseCacheHandle {
  constructor(...args) {
    super(...args);

    ensureCache({
      cache: this._cache,
      path: this.path,
      type: "dir",
    });
  }

  async get(name, options) {
    const { create } = options || {};

    if (name.includes("/")) {
      return await this._getByMultiPath(name, options);
    }

    // 先判断是否存在
    const targetPath = `/${this.path}/${name}`;

    const targetRespose = await this._cache.match(targetPath);

    // 最终创建handle的类型，默认为传入的create，或者已存在的类型
    let finnalType = create;

    if (targetRespose) {
      // 不存在且不创建，返回 null
      if (!targetRespose?.body && !create) {
        return null;
      }

      // 已存在的类型
      const cachedType = targetRespose.headers.get("x-type");

      if (cachedType && create && cachedType !== create) {
        // 如果存在且类型不匹配，则报错
        throw new Error(
          `Type mismatch: ${targetPath} is ${cachedType}, not ${create}`
        );
      }

      finnalType = cachedType;
    }

    let finalHandle = null;

    // 更新目录信息
    updateDir({
      path: this.path,
      add: [name],
    });

    // 写入到目录中
    if (finnalType === "file") {
      finalHandle = new FileCacheHandle(name, this._cache, {
        parent: this,
        root: this.root,
      });
    } else if (finnalType === "dir") {
      finalHandle = new DirCacheHandle(name, this._cache, {
        parent: this,
        root: this.root,
      });
    }

    return finalHandle;
  }

  async length() {
    debugger;
  }

  async *keys() {
    debugger;
  }
}

extendDirHandle(DirCacheHandle);
