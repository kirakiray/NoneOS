// 对OPFS进行封装
export class BaseHandle {
  #originHandle = null;
  #parent;
  #root;
  constructor(dirHandle, options = {}) {
    this.#originHandle = dirHandle;
    this.#root = options.root;
    this.#parent = options.parent;
  }

  get handle() {
    return this.#originHandle;
  }

  get path() {
    if (this.#parent) {
      return `${this.#parent.path}/${this.#originHandle.name}`;
    }

    return this.#originHandle.name;
  }

  async size() {
    if (this.kind === "file") {
      const file = await this.file();
      return file.size;
    }

    return null;
  }

  async isSame(target) {
    return this.#originHandle.isSameEntry(target.handle);
  }

  async parent() {
    return this.#parent;
  }

  async root() {
    return this.#root || this;
  }

  async remove() {
    const parent = await this.parent();

    await parent.#originHandle.removeEntry(this.#originHandle.name);
  }

  async moveTo() {}

  async copyTo() {}
}
