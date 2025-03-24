import { PublicBaseHandle, notify } from "../public/base.js";
import { getHash } from "../util.js";

export class BaseCacheHandle extends PublicBaseHandle {
  #cache = null;
  #key = null;
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
    return this.#cache === target.#cache && this.path === target.path;
  }

  async remove() {
    debugger;
  }
}
