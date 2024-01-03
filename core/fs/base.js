export class NBaseHandle {
  constructor(handle, paths, root) {
    Object.defineProperties(this, {
      relativePaths: {
        value: paths || [],
      },
      _handle: {
        value: handle,
      },
      _root: {
        value: root || this,
      },
    });
  }

  get kind() {
    return this._handle?.kind || "directory";
  }

  get parent() {}

  get path() {
    return this.relativePaths.join("/");
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
  }

  async move() {}
}

export class NDirHandle extends NBaseHandle {
  constructor(handle, paths, root) {
    super(handle, paths, root);
  }

  async read(name, options) {
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
            console.error(err);
            return err;
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
              console.error(err2);
              return err2;
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
      return new NFileHandle(targetHandle, paths, this._root);
    } else if (targetHandle.kind === "directory") {
      return new NDirHandle(targetHandle, paths, this._root);
    }

    debugger;

    return null;
  }

  async *entries() {
    for await (let [name, handle] of this._handle.entries()) {
      if (handle.kind === "file") {
        yield new NFileHandle(
          handle,
          [...this.relativePaths, name],
          this._root
        );
      } else {
        yield new NDirHandle(handle, [...this.relativePaths, name], this._root);
      }
    }
  }
}

export class NFileHandle extends NBaseHandle {
  constructor(handle, paths, root) {
    super(handle, paths, root);
  }

  async write(content, options) {
    if (this.kind === "directory") {
      throw new Error(`Directory cannot use write method`);
    }
  }

  async _get(options) {
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
        default:
          reject(new Error(`"${defaults.type}" type is not supported`));
      }
    });
  }

  file() {
    return this._get({ type: "file" });
  }

  text() {
    return this._get({ type: "text" });
  }

  buffer() {
    return this._get({ type: "buffer" });
  }
}

const rootHandlePms = navigator.storage.getDirectory();

export const read = async (path = "", { handle, create, type } = {}) => {
  const root = new NDirHandle(handle || (await rootHandlePms));
  if (!path) {
    return root;
  }

  return await root.read(path, {
    create,
    type,
  });
};
