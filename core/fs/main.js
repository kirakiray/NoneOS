import { NBaseHandle } from "./base.js";

export class NDirHandle extends NBaseHandle {
  constructor(handle, paths, root) {
    super(handle, paths, root);
  }

  async get(name, options) {
    const defaults = {
      //   type: "file",
      create: false,
    };

    Object.assign(defaults, options);

    const paths = name.split("/");
    const lastId = paths.length - 1;

    let targetHandle = this._handle;
    let count = 0;

    for (let name of paths) {
      if (count === lastId) {
        if (defaults.type) {
          try {
            switch (defaults.type) {
              case "file":
                targetHandle = await targetHandle.getFileHandle(name, {
                  create: defaults.create,
                });
                break;
              case "directory":
                targetHandle = await targetHandle.getDirectoryHandle(name, {
                  create: defaults.create,
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
              lastHandle = await targetHandle.getFileHandle(name, {
                create: defaults.create,
              });
            } catch (err2) {
              throw err2;
            }
          }

          targetHandle = lastHandle;
        }
        break;
      }

      targetHandle = await targetHandle.getDirectoryHandle(name, {
        create: defaults.create,
      });

      count++;
    }

    if (targetHandle.kind === "file") {
      return new NFileHandle(
        targetHandle,
        [...this.relativePaths, ...paths],
        this.root
      );
    } else if (targetHandle.kind === "directory") {
      return new NDirHandle(
        targetHandle,
        [...this.relativePaths, ...paths],
        this.root
      );
    }

    return null;
  }

  async *entries() {
    for await (let [name, handle] of this._handle.entries()) {
      if (handle.kind === "file") {
        yield [
          name,
          new NFileHandle(handle, [...this.relativePaths], this.root),
        ];
      } else {
        yield [
          name,
          new NDirHandle(handle, [...this.relativePaths], this.root),
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
        yield new NFileHandle(handle, [...this.relativePaths, name], this.root);
      } else {
        yield new NDirHandle(handle, [...this.relativePaths, name], this.root);
      }
    }
  }
}

export class NFileHandle extends NBaseHandle {
  constructor(handle, paths, root) {
    super(handle, paths, root);
  }

  async write(content) {
    const writable = await this.getWriter();
    await writable.write(content);
    await writable.close();
  }

  getWriter() {
    return this._handle.createWritable();
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

    const result = {};

    ["lastModified", "lastModifiedDate", "name", "size", "type"].forEach(
      (k) => (result[k] = file[k])
    );

    return result;
  }
}

const rootHandlePms = navigator.storage.getDirectory();

// 获取本地的 file system 数据
export const get = async (path = "", { handle, create, type } = {}) => {
  const root = new NDirHandle(handle || (await rootHandlePms));
  if (!path) {
    return root;
  }

  return await root.get(path, {
    create,
    type,
  });
};

// 通过打开浏览器选择目录
export const open = async () => {};
