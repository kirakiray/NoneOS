import { PublicBaseHandle, notify } from "../public/base.js";
import { getHash } from "../util.js";

export class BaseCacheHandle extends PublicBaseHandle {
  #cache = null;
  #key = null;

  constructor(key, cache, options = {}) {
    super(options);
    this.#key = key;
    this.#cache = cache;
  }

  async id() {
    return await getHash(this.path);
  }

  get _key() {
    return this.#key;
  }

  get _cache() {
    return this.#cache;
  }

  get name() {
    return this.#key.split("/").pop();
  }

  async isSame(target) {
    return this.#key === target._key;
  }

  async remove() {
    const parent = this.parent;
    await this.#cache.delete(this.#key);

    notify({
      type: "remove", 
      path: this.path,
    });
  }
}