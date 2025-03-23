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

    const key = `${this._key}/${name}`;
    const cache = this._cache;

    // 检查是否存在
    const existingResponse = await cache.match(key);
    const type = existingResponse?.headers.get('X-File-Type');
    
    if (!create && !existingResponse) {
      return null;
    }

    if (existingResponse) {
      if (create === "file" && type !== "file") {
        throw new Error(`${name} is not a file`);
      } else if (create === "dir" && type !== "dir") {
        throw new Error(`${name} is not a directory`);
      }
    } else {
      // 创建新的文件或目录
      const newType = options.create === "file" ? "file" : "dir";
      const headers = new Headers();
      headers.set('X-File-Type', newType);
      
      if(newType === "file") {
        await cache.put(key, new Response("", { headers }));
      } else {
        await cache.put(key, new Response("", { headers }));
      }
    }

    const finalType = type || (options.create === "file" ? "file" : "dir");
    if (finalType === "file") {
      return new FileCacheHandle(key, cache, {
        parent: this,
        root: this.root || this,
      });
    } else {
      return new DirCacheHandle(key, cache, {
        parent: this,
        root: this.root || this,
      });
    }
  }

  async length() {
    let count = 0;
    const prefix = `${this._key}/`;
    
    const keys = await this._cache.keys();
    for (const req of keys) {
      if (req.url.startsWith(prefix) && !req.url.includes(":meta")) {
        count++;
      }
    }
    return count;
  }

  async *keys() {
    const prefix = `${this._key}/`;
    const keys = await this._cache.keys();
    
    for (const req of keys) {
      if (req.url.startsWith(prefix) && !req.url.includes(":meta")) {
        yield req.url.slice(prefix.length);
      }
    }
  }
}

extendDirHandle(DirCacheHandle);