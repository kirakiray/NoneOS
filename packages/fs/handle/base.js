// 对OPFS进行封装
export class BaseHandle {
  #originHandle = null;
  constructor(dirHandle) {
    this.#originHandle = dirHandle;
  }

  get handle() {
    return this.#originHandle;
  }

  async kind() {
    return this.#originHandle.kind;
  }
}
