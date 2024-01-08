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

  async parent() {
    if (!this.#relates.length) {
      return null;
    }

    return this.root.get(this.relativePaths.slice(0, -1).join("/"));
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

  async remove(options) {
    const defaults = {
      recursive: false,
    };

    Object.assign(defaults, options);

    if (this._handle.remove) {
      await this._handle.remove(defaults);
    } else {
      const parent = await this.parent();
      await parent.removeEntry(this.name, defaults);
    }

    return true;
  }

  async removeEntry(name) {
    await this._handle.removeEntry(name);

    return true;
  }

  async move(...args) {
    const { _handle } = this;
    if (_handle.move) {
      switch (args.length) {
        case 2:
          await _handle.move(args[0]._handle, args[1]);
          return true;
        case 1:
          if (typeof args[0] === "string") {
            await _handle.move(args[0]);
          } else {
            await _handle.move(args[0]._handle);
          }
          return true;
      }
    } else {
      let name, targetHandle;
      switch (args.length) {
        case 2:
          targetHandle = args[0];
          name = args[1];
        case 1:
          if (typeof args[0] === "string") {
            name = args[0];
          } else {
            targetHandle = args[0];
          }
      }

      debugger;
    }
  }
}
