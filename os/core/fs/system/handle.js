import { flatFiles } from "../../util.js";

// 替换这个基础库，理论是可以兼容各个环境
export class NBaseHandle {
  #root = null;
  #relates;
  constructor(handle, relates, root) {
    this._handle = handle;
    this.#root = root || null;
    this.#relates = relates;
  }

  get kind() {
    return this._handle.kind || "directory";
  }

  get path() {
    return this.#relates.join("/");
  }

  get paths() {
    return this.#relates.slice();
  }

  get root() {
    return this.#root;
  }

  get name() {
    return this._handle.name;
  }

  async parent() {
    if (this.#relates.length === 1) {
      return null;
    }

    return this.root.get(this.#relates.slice(0, -1).join("/"));
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
          const realPar = await parHandle.get(item.parentsName.join("/"), {
            create: "directory",
          });
          await item.handle.move(realPar, item.name);
        } else {
          await parHandle.get(item.parentsName.join("/"), {
            create: "directory",
          });
        }
      }

      await this.remove({ recursive: true });
    }
  }
}

export class NDirHandle extends NBaseHandle {
  constructor(handle, relates, root) {
    super(handle, relates, root);
  }

  async get(name, options) {
    const defaults = {
      create: null, // "directory" or "file"
    };

    Object.assign(defaults, options);

    // 去掉最头部的 "/"
    name = name.replace(/^\//, "");

    const paths = name.split("/");
    const lastId = paths.length - 1;

    let targetHandle = this._handle;
    let count = 0;

    for (let name of paths) {
      if (name === "node_modules") {
        continue;
      }

      if (count === lastId) {
        if (defaults.create) {
          try {
            switch (defaults.create) {
              case "file":
                targetHandle = await targetHandle.getFileHandle(name, {
                  create: true,
                });
                break;
              case "directory":
                targetHandle = await targetHandle.getDirectoryHandle(name, {
                  create: true,
                });
                break;
            }
          } catch (err) {
            throw err;
          }
        } else {
          let lastHandle;
          try {
            lastHandle = await targetHandle.getDirectoryHandle(name);
          } catch (err) {
            try {
              lastHandle = await targetHandle.getFileHandle(name);
            } catch (err2) {
              throw err2;
            }
          }

          targetHandle = lastHandle;
        }
        break;
      }

      targetHandle = await targetHandle.getDirectoryHandle(name, {
        create: !!defaults.create,
      });

      count++;
    }

    if (targetHandle.kind === "file") {
      return new NFileHandle(
        targetHandle,
        [...this.paths, ...paths],
        this.root || this
      );
    } else if (targetHandle.kind === "directory") {
      return new NDirHandle(
        targetHandle,
        [...this.paths, ...paths],
        this.root || this
      );
    }

    return null;
  }

  async *entries() {
    for await (let [name, handle] of this._handle.entries()) {
      if (handle.kind === "file") {
        yield [
          name,
          new NFileHandle(handle, [...this.paths, name], this.root || this),
        ];
      } else {
        yield [
          name,
          new NDirHandle(handle, [...this.paths, name], this.root || this),
        ];
      }
    }
  }

  async *keys() {
    for await (let key of this._handle.keys()) {
      yield key;
    }
  }

  async *values() {
    for await (let [name, handle] of this._handle.entries()) {
      if (handle.kind === "file") {
        yield new NFileHandle(handle, [...this.paths, name], this.root || this);
      } else {
        yield new NDirHandle(handle, [...this.paths, name], this.root || this);
      }
    }
  }

  async removeEntry(name, options) {
    await this._handle.removeEntry(name, options);

    return true;
  }
}

export class NFileHandle extends NBaseHandle {
  constructor(handle, relates, root) {
    super(handle, relates, root);
  }

  async write(content) {
    const writable = await this._handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async read(options) {
    const defaults = {
      type: "file", // text buffer
    };

    Object.assign(defaults, options);

    const file = await this._handle.getFile();

    if (defaults.type === "file") {
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);

      switch (defaults.type) {
        case "text":
          reader.readAsText(file);
          break;
        case "buffer":
          reader.readAsArrayBuffer(file);
          break;
        case "dataurl":
          reader.readAsDataURL(file);
          break;
        default:
          reject(new Error(`"${defaults.type}" type is not supported`));
      }
    });
  }

  file() {
    return this.read({ type: "file" });
  }

  text() {
    return this.read({ type: "text" });
  }

  buffer() {
    return this.read({ type: "buffer" });
  }

  async stat() {
    const file = await this.read({ type: "file" });

    return [{}, "createTime", "type", "lastModified"].reduce((obj, name) => {
      file[name] && (obj[name] = file[name]);
      return obj;
    });
  }
}
