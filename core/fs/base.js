// 替换这个基础库，理论是可以兼容各个环境
export class NBaseHandle {
  #root;
  #relates;
  constructor(handle, paths, root) {
    this.#root = root || null;
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
    if (this.#relates.length === 0) {
      return null;
    }
    if (this.#relates.length === 1) {
      return this.root;
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
    return this.#root || this;
  }

  get name() {
    return this._handle.name;
  }

  async remove(options) {
    const defaults = {
      recursive: false,
    };

    Object.assign(defaults, options);

    // if (this._handle.remove) {
    //   await this._handle.remove(defaults);
    // } else {
    const parent = await this.parent();
    debugger
    await parent.removeEntry(this.name, defaults);
    // }

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
      let name, parHandle;
      switch (args.length) {
        case 2:
          parHandle = args[0];
          name = args[1];
        case 1:
          if (typeof args[0] === "string") {
            name = args[0];
          } else {
            parHandle = args[0];
          }
      }

      if (!parHandle) {
        // 文件夹重命名
        parHandle = await this.parent();
      }

      // 一维化所有文件
      const files = await flatFiles(this, [name]);

      for (let item of files) {
        if (item.kind === "file") {
          const realPar = await parHandle.get(item.parNames.join("/"), {
            create: "directory",
          });
          await item.handle.move(realPar, item.name);
        } else {
          await parHandle.get(item.parNames.join("/"), {
            create: "directory",
          });
        }
      }

      await this.remove({ recursive: true });
    }
  }
}

export async function flatFiles(parHandle, parNames = []) {
  const files = [];
  let isEmpty = true;

  for await (let [name, handle] of parHandle.entries()) {
    isEmpty = false;
    if (handle.kind === "file") {
      files.push({
        kind: "file",
        name,
        handle,
        parNames,
      });
    } else {
      const subFiles = await flatFiles(handle, [...parNames, name]);
      files.push(...subFiles);
    }
  }

  if (isEmpty) {
    files.push({
      kind: "dir",
      parNames,
    });
  }

  return files;
}
