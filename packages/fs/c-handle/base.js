import { PublicBaseHandle, notify } from "../public/base.js";
import { getHash } from "../util.js";

export class BaseCacheHandle extends PublicBaseHandle {
  #cache = null;
  #name = null;
  __preparer = null; // 准备器

  constructor(name, cache, options) {
    const { parent, root } = options || {};
    super({ parent, root });

    this.#name = name;
    this.#cache = cache;
  }

  // 确保缓存已准备好
  async _ready() {
    if (this.parent) {
      await this.parent._ready();
    }
    if (this.__preparer) {
      await this.__preparer;
    }
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
    return this.#cache === target.#cache && this.path === target.path;
  }

  async remove() {
    debugger;
  }
}
