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

  set name(newName) {
    debugger;
    return true;
  }

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

    const handle = this._handle;

    if (defaults.type) {
      debugger;
    } else {
      try {
      } catch (err) {}
      debugger;
    }
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

    debugger;
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

export const read = async (path = "", { handle, create } = {}) => {
  const root = new NDirHandle(handle || (await rootHandlePms));
  if (!path) {
    return root;
  }

  const paths = path.split("/");

  let targetHandle;
  for (let name of paths) {
    targetHandle = await root.read(name);
    debugger;
  }

  debugger;
};
