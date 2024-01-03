// 替换这个基础库，理论是可以兼容各个环境
export class NBaseHandle {
  #root;
  constructor(handle, paths, root) {
    this.#root = root || this;
    Object.defineProperties(this, {
      relativePaths: {
        value: paths || [],
      },
      _handle: {
        value: handle,
      },
    });
  }

  get kind() {
    return this._handle?.kind || "directory";
  }

  get parent() {
    if (!this.relativePaths.length) {
      return null;
    }

    debugger;
  }

  get path() {
    return this.relativePaths.join("/");
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

    debugger;
  }

  async move() {}
}
