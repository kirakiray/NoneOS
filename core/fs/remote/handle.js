export class RemoteBaseHandle {
  #root;
  #relates;
  #name;
  #kind;
  constructor(paths, name, root, kind) {
    this.#kind = kind;
    this.#name = name;
    this.#root = root || this;
    this.#relates = paths || [];
  }

  get kind() {
    return this.#kind;
  }

  get name() {
    return this.#name;
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
    return this.#root;
  }

  async remove(options) {
    return this.parent.removeEntry(this.name, options);
  }

  async move(...args) {
    debugger;
  }
}

export class RemoteDirHandle extends RemoteBaseHandle {
  constructor(...args) {
    super(...args.slice(0, 3), "directory");
  }

  async get(name, options) {
    debugger;
  }

  async *entries() {
    debugger;
  }

  async *keys() {
    for await (let [name, handle] of this._handle.entries()) {
      yield name;
    }
  }

  async *values() {
    for await (let [name, handle] of this._handle.entries()) {
      yield handle;
    }
  }

  async removeEntry(name, options) {
    debugger;
  }
}

export class RemoteFileHandle extends RemoteBaseHandle {
  constructor(...args) {
    super(...args.slice(0, 3), "file");
  }

  async write(content) {
    debugger;
  }

  async read(options) {
    const defaults = {
      type: "file", // text buffer
    };

    Object.assign(defaults, options);

    const file = await this._handle.getFile();

    debugger;
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
