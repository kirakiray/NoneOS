// 替换这个基础库，理论是可以兼容各个环境
export class NBaseHandle {
  #root;
  #relates;
  constructor(handle, paths, root) {
    this.#root = root || this;
    this.#relates = paths || [];
    Object.defineProperties(this, {
      _handle: {
        value: handle,
      },
    });
  }

  get kind() {
    return this._handle?.kind || "directory";
  }

  get parent() {
    if (!this.#relates.length) {
      return null;
    }

    debugger;
  }

  get path() {
    return this.#relates.join("/");
  }

  get relativePaths() {
    return this.#relates.slice();
  }

  get root() {
    return this.#root;
  }

  get name() {
    return this._handle.name;
  }

  //   set name(newName) {
  //     debugger;
  //     return true;
  //   }

  async remove(options) {
    const defaults = {
      recursive: false,
    };

    Object.assign(defaults, options);

    await this._handle.remove();
  }

  async move() {}
}
