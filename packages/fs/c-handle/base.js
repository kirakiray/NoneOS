import { PublicBaseHandle, notify } from "../public/base.js";
import { getHash } from "../util.js";
import { updateDir } from "./public.js";

export class BaseCacheHandle extends PublicBaseHandle {
  #cache = null;
  #name = null;

  constructor(name, cache, options) {
    const { parent, root } = options || {};
    super({ parent, root });

    this.#name = name;
    this.#cache = cache;
  }

  async id() {
    return await getHash(this.path);
  }

  get _cache() {
    return this.#cache;
  }

  get name() {
    return this.#name;
  }

  async isSame(target) {
    return (
      this.#cache[Symbol.toStringTag] === target.#cache[Symbol.toStringTag] &&
      this.path === target.path
    );
  }

  async remove() {
    if (this.kind === "dir") {
      // 先递归删除子目录和文件
      for await (let e of this.values()) {
        await e.remove();
      }
    }

    const parent = this.parent;

    // 从父目录中移除
    await updateDir({
      cache: this._cache,
      path: parent.path,
      remove: [this.name],
    });

    // 删除自身缓存
    await this._cache.delete("/" + this.path);

    notify({
      type: "remove",
      path: this.path,
    });
  }
}
