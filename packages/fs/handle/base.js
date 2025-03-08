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

    try {
      // 如果是目录类型，需要先删除所有子文件和子目录
      if (this.kind === "dir") {
        // 获取所有文件和目录的扁平列表
        const entries = await this.flat();

        // 先删除所有文件
        for (const entry of entries) {
          if (entry.kind === "file") {
            await entry.remove();
          }
        }

        // 再删除所有目录（从深到浅）
        const dirs = entries.filter((entry) => entry.kind === "dir");
        for (let i = dirs.length - 1; i >= 0; i--) {
          await dirs[i].remove();
        }
      }

      // 最后删除当前目录或文件
      await parent.#originHandle.removeEntry(this.#originHandle.name);
    } catch (err) {
      console.error("删除失败: ", this.#originHandle.name, err);
    }
  }

  async moveTo() {}

  async copyTo() {}
}
