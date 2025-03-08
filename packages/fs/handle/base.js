// 对OPFS进行封装
export class BaseHandle {
  #originHandle = null;
  #parentPath;
  constructor(dirHandle, options = {}) {
    this.#originHandle = dirHandle;
    this.#parentPath = options.parentPath;
  }

  get handle() {
    return this.#originHandle;
  }

  get path() {
    if (this.#parentPath) {
      return `${this.#parentPath}/${this.#originHandle.name}`;
    }

    return this.#originHandle.name;
  }
}
