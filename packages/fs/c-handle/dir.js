import { BaseCacheHandle } from "./base.js";
import { FileCacheHandle } from "./file.js";
import { extendDirHandle } from "../public/dir.js";
import { ensureCache, updateDir, getCache } from "./public.js";

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
    const targetPath = `${this.path}/${name}`;

    // 获取目标路径的缓存数据
    const { type: cachedType } = await getCache(this._cache, targetPath);

    // 最终创建handle的类型，默认为传入的create，或者已存在的类型
    let finnalType = create || cachedType;

    if (cachedType) {
      if (!create) {
        finnalType = cachedType;
      } else if (cachedType !== create) {
        // 如果存在且类型不匹配，则报错
        throw new Error(
          `Type mismatch: ${targetPath} is ${cachedType}, not ${create}`
        );
      }
    } else if (!create) {
      return null;
    }

    let finalHandle = null;

    // 更新目录信息
    await updateDir({
      cache: this._cache,
      path: this.path,
      add: [name],
    });

    // 创建对应类型的 handle
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
    const { data } = await getCache(this._cache, this.path);
    return Array.isArray(data) ? data.length : 0;
  }

  async *keys() {
    const { data } = await getCache(this._cache, this.path);
    if (Array.isArray(data)) {
      for (const key of data) {
        yield key;
      }
    }
  }
}

extendDirHandle(DirCacheHandle);
