import { PublicBaseHandle, notify } from "../public/base.js";

export class BaseHandle extends PublicBaseHandle {
  // 对OPFS进行封装
  #originHandle = null;
  constructor(dirHandle, options = {}) {
    super(options);
    this.#originHandle = dirHandle;
  }

  get handle() {
    return this.#originHandle;
  }

  get name() {
    return this.#originHandle.name;
  }

  async isSame(target) {
    return this.#originHandle.isSameEntry(target.handle);
  }

  async remove() {
    const parent = this.parent;

    // 最后删除当前目录或文件
    await parent.#originHandle.removeEntry(this.#originHandle.name, {
      recursive: true,
    });

    notify({
      path: this.path,
      type: "remove",
    });
  }
}
